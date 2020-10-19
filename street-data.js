import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';

//Not sure if this will want to be changed, or when
const rad = 0.002;

export const getAndProcessStreetData = async (currlat, currlon) => {

	var osmapi = "https://www.openstreetmap.org/api/0.6/"
	var osm =		osmapi + "map?bbox="+(currlon-rad)+","+(currlat-rad)+","+(currlon+rad)+","+(currlat+rad)

	//TODO Deal with errors and such
	var resp = await fetch(osm);
 	var str = await resp.text();

	var result = new window.DOMParser().parseFromString(str, "text/xml");

	var streetrelationids = getElementsValueByXPath('//relation/tag[@k="type" and @v="street"]/../@id', result);


  var relationmemberids = {}
  streetrelationids.forEach((item, i) => {
     var waymembers = getElementsValueByXPath('//relation[@id="'+item+'"]/member/@ref', result);
     relationmemberids[item] = waymembers;
  });

  var ways_by_refNodeId = {}
  var nodes_by_wayId = {}
  var ways_by_Name = {}
  var wayNames_by_Id = {}
  var intersections_by_wayId = {}
  var allNodesInRelation = {}

  let removeDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) === index);

  var usekey = null;
  //TODO These two different keys are a real mess, deal with them some day
  for (const [key, value] of Object.entries(relationmemberids)) {
    var allnodes = []
    var nodegroups = {}
    value.forEach((item, i) => {
      var maybename = getElementsValueByXPath('//way[@id="'+item+'"]/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/@v', result);
      var refnodes = getElementsValueByXPath('//way[@id="'+item+'"]/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/../nd/@ref', result);
      if (maybename.length > 0){
        if (!wayNames_by_Id[key]){
          wayNames_by_Id[key] = maybename[0];
        } else if (wayNames_by_Id[key] != maybename[0]){
         //  if (debug){
         //   console.log("Found two different names: " + wayNames_by_Id[key] + " and " + maybename[0])
         // }
        }
        if (!ways_by_Name[maybename[0]]){
          ways_by_Name[maybename[0]] = [key];
        } else if (!ways_by_Name[maybename[0]].includes(key)){
         //  if (debug){
         //   console.log("Found two different keys for " + maybename[0]);
         // }
          ways_by_Name[maybename[0]].push(key);
          usekey = ways_by_Name[maybename[0]][0];
        }
      }
      allnodes = allnodes.concat(refnodes);
      allnodes = removeDuplicates(allnodes);
    });
    //EXPERIMENT
    if (allNodesInRelation[usekey]){
      console.log(usekey + " already exists");
      allNodesInRelation[usekey] = allNodesInRelation[usekey].concat(allnodes);
      usekey = null;
    } else {
      allNodesInRelation[key] = allnodes;
    }
    // allNodesInRelation[key] = allnodes;
  }

  for (const [key, value] of Object.entries(allNodesInRelation)) {
    value.forEach((child, i) => {
        if (!ways_by_refNodeId[child]){
          ways_by_refNodeId[child] = [key];
        } else {
          ways_by_refNodeId[child].push(key);
        }
    });
  }


  //intersections_by_nodeId's keys are all the nodes that are intersections, and the values are an array of which streets meet it
  var intersections_by_nodeId = Object.fromEntries(Object.entries(ways_by_refNodeId).filter(([k,v]) => v.length>1));

  //We need this to preserve order from nodes_by_wayId
  for (const [key, value] of Object.entries(allNodesInRelation)) {
    var wayixs = value.filter(node => node in intersections_by_nodeId);
    intersections_by_wayId[key] = wayixs;
  }

  var allNodes = Object.values(allNodesInRelation).flat();

  return { ways_by_refNodeId: ways_by_refNodeId, nodes_by_wayId: nodes_by_wayId, ways_by_Name: ways_by_Name,
    wayNames_by_Id:wayNames_by_Id, intersections_by_wayId: intersections_by_wayId, allNodesInRelation: allNodesInRelation,
  allNodes: allNodes, result: result, intersections_by_nodeId: intersections_by_nodeId, streetrelationids: streetrelationids}

}
