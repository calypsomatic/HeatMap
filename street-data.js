import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
// import { create, all } from 'mathjs';
import Logger from './Logger.js';

// const logger = new Logger(false, 'street-data.js');
const debug = false;
var logger = debug ? console.log.bind(console) : function () {};
var group = debug ? console.group.bind(console) : function () {};
var groupEnd = debug ? console.groupEnd.bind(console) : function () {};
//Not sure if this will want to be changed, or when
const rad = 0.004;
const osmapi = "https://www.openstreetmap.org/api/0.6/"

export const getAndProcessStreetData = async (currlat, currlon) => {
	group("getAndProcessStreetData");
	var osm =	osmapi + "map?bbox="+(currlon-rad)+","+(currlat-rad)+","+(currlon+rad)+","+(currlat+rad)

	//TODO Deal with errors and such
	var resp = await fetch(osm);
 	var str = await resp.text();

	var result = new window.DOMParser().parseFromString(str, "text/xml");

	var ways_by_refNodeId = {}
	var nodes_by_wayId = {}
	var ways_by_Name = {}
	var wayNames_by_Id = {}
	var intersections_by_wayId = {}
	var allNodesInRelation = {}

	let removeDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) === index);

	////////////////////TEST - NO RELATIONS//////////////////////////
	let wayids = getElementsValueByXPath('//way/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/../@id', result);

	var usekey = null;
  //TODO These two different keys are a real mess, deal with them some day
  wayids.forEach((item, i) => {
    var nodegroups = {}
    var maybename = getElementsValueByXPath('//way[@id="'+item+'"]/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/@v', result);
    var refnodes = getElementsValueByXPath('//way[@id="'+item+'"]/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/../nd/@ref', result);
    if (maybename.length > 0){
      if (!wayNames_by_Id[item]){
        wayNames_by_Id[item] = maybename[0];
      } else if (wayNames_by_Id[item] != maybename[0]){
         logger("Found two different names: " + wayNames_by_Id[item] + " and " + maybename[0])
      }
      if (!ways_by_Name[maybename[0]]){
        ways_by_Name[maybename[0]] = [item];
      } else if (!ways_by_Name[maybename[0]].includes(item)){
        ways_by_Name[maybename[0]].push(item);
        usekey = ways_by_Name[maybename[0]][0];
      }
    }

  //EXPERIMENT
  if (allNodesInRelation[usekey]){
		allNodesInRelation[usekey] = merge(allNodesInRelation[usekey],refnodes);
    usekey = null;
  } else {
    allNodesInRelation[item] = refnodes;
  }
});

///////////////////////////////////
function oldway(){
		// var streetrelationids = getElementsValueByXPath('//relation/tag[@k="type" and @v="street"]/../@id', result);
	//
	//
  // var relationmemberids = {}
  // streetrelationids.forEach((item, i) => {
  //    var waymembers = getElementsValueByXPath('//relation[@id="'+item+'"]/member/@ref', result);
  //    relationmemberids[item] = waymembers;
  // });
	//
  // var usekey = null;
  // //TODO These two different keys are a real mess, deal with them some day
  // for (const [key, value] of Object.entries(relationmemberids)) {
  //   var allnodes = []
  //   var nodegroups = {}
  //   value.forEach((item, i) => {
  //     var maybename = getElementsValueByXPath('//way[@id="'+item+'"]/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/@v', result);
  //     var refnodes = getElementsValueByXPath('//way[@id="'+item+'"]/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/../nd/@ref', result);
  //     if (maybename.length > 0){
  //       if (!wayNames_by_Id[key]){
  //         wayNames_by_Id[key] = maybename[0];
  //       } else if (wayNames_by_Id[key] != maybename[0]){
  //        //   logger("Found two different names: " + wayNames_by_Id[key] + " and " + maybename[0])
  //       }
  //       if (!ways_by_Name[maybename[0]]){
  //         ways_by_Name[maybename[0]] = [key];
  //       } else if (!ways_by_Name[maybename[0]].includes(key)){
  //        //   logger("Found two different keys for " + maybename[0]);
  //         ways_by_Name[maybename[0]].push(key);
  //         usekey = ways_by_Name[maybename[0]][0];
  //       }
  //     }
  //     allnodes = merge(allnodes,refnodes);
  //     // allnodes = allnodes.concat(refnodes);
  //     // allnodes = removeDuplicates(allnodes);
  //   });
  //   //EXPERIMENT
  //   if (allNodesInRelation[usekey]){
  //     // logger(usekey + " already exists");
  //     allNodesInRelation[usekey] = allNodesInRelation[usekey].concat(allnodes);
  //     usekey = null;
  //   } else {
  //     allNodesInRelation[key] = allnodes;
  //   }
  //   // allNodesInRelation[key] = allnodes;
  // }
}
///////////////////////////////

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

//Dumbest possible way to get rid of those double intersections on mass ave
	let possibledupes = [];
	let intnodes = Object.values(intersections_by_nodeId).map((arr) => {
		let a = arr.slice();
		a.sort();
		return a.toString();
	});
	let count = 0;
	for (const [key, value] of Object.entries(intersections_by_nodeId)) {
		let a = value.slice();
		a.sort();
		// if (intnodes.indexOf(a.toString()) != intnodes.lastIndexOf(a.toString())){
		if (intnodes.indexOf(a.toString()) != count){
			possibledupes.push(key)
		}
		count++;
	}

	intersections_by_nodeId = Object.fromEntries(Object.entries(intersections_by_nodeId).filter(([k,v]) => !possibledupes.includes(k)));

  //We need this to preserve order from nodes_by_wayId
  for (const [key, value] of Object.entries(allNodesInRelation)) {
    var wayixs = value.filter(node => node in intersections_by_nodeId);
		let coords = wayixs.map( (nodeid) => {
			let node = GetElementsByAttribute(result, "node", "id", nodeid)[0];
			return {id: nodeid, coord: {x:parseFloat(node.getAttribute("lat")), y:parseFloat(node.getAttribute("lon"))}};
		});
		if (coords.length < 3){
			intersections_by_wayId[key] = wayixs;
		}
		else {
			let sorted = sortIntoIds(coords);
	    intersections_by_wayId[key] = sorted;
		}
  }
  //intersections_by_wayId should be sorted in a line which is not guaranteed to happen
  let intersection_coords = {}

  for (const [key, value] of Object.entries(intersections_by_wayId)) {
		if (value.length < 2){
			var idx = allNodesInRelation[key].indexOf(value[0]);
			if (idx == allNodesInRelation[key].length - 1){
				idx = -1;
			}
			value.push(allNodesInRelation[key][idx+1]);
		}
    let coords = value.map( (nodeid) => {
      let node = GetElementsByAttribute(result, "node", "id", nodeid)[0];
      return {id: nodeid, coord: {x:parseFloat(node.getAttribute("lat")), y:parseFloat(node.getAttribute("lon"))}};
    });
    intersection_coords[key] = coords;
  }

  var allNodes = Object.values(allNodesInRelation).flat();

  return { ways_by_refNodeId: ways_by_refNodeId, nodes_by_wayId: nodes_by_wayId, ways_by_Name: ways_by_Name,
    wayNames_by_Id:wayNames_by_Id, intersections_by_wayId: intersections_by_wayId, allNodesInRelation: allNodesInRelation,
  allNodes: allNodes, result: result, intersections_by_nodeId: intersections_by_nodeId}
	// allNodes: allNodes, result: result, intersections_by_nodeId: intersections_by_nodeId, streetrelationids: streetrelationids}
	groupEnd();
}

//This is an attempt to keep the correct order of nodes in streets
	function merge(arr1, arr2){
		let bigger = arr1.length > arr2.length ? arr1 : arr2;
		let smaller = arr1.length > arr2.length ? arr2 : arr1;
		let insertindex = 0;
		smaller.forEach((item,i) => {
			if (bigger.includes(item)){
				insertindex = bigger.indexOf(item)+1;
			} else {
				bigger.splice(insertindex,0,item);
				insertindex++;
			}
		});
		return bigger;
	}

	function two_farthest(coordlist){
	  let farthestdist = 0;
	  let farthest1 = null;
	  let farthest2 = null;
	  for (let i = 0; i < coordlist.length - 1; i++){
			for (let j = i + 1; j < coordlist.length; j++){
					let distance = Math.sqrt(Math.pow(coordlist[i].coord.x-coordlist[j].coord.x,2) + Math.pow(coordlist[i].coord.y-coordlist[j].coord.y,2));
					if (distance > farthestdist){
						farthestdist = distance;
						farthest1 = coordlist[i];
						farthest2 = coordlist[j];
					}
			}
		}

	  return [farthest1, farthest2];
	}

	function get_nearest(coord, coordlist){
		let nearestdist = 40042;
		let nearest = null;
		for (let i = 0; i < coordlist.length; i++){
				let distance = Math.sqrt(Math.pow(coordlist[i].coord.x-coord.coord.x,2) + Math.pow(coordlist[i].coord.y-coord.coord.y,2));
				if (distance < nearestdist){
					nearest = coordlist[i];
					nearestdist = distance;
				}
		}

		return nearest;
	}

	function sortIntoIds(coordlist){
		let endpoints = two_farthest(coordlist);
		let sorted = [endpoints[0].id]
		let rest = coordlist.slice();
	  rest.splice(rest.indexOf(endpoints[0]),1);
		let curr = endpoints[0];
		while (rest.length > 1){
			let nextpt = get_nearest(curr, rest);
			sorted.push(nextpt.id);
			rest.splice(rest.indexOf(nextpt),1);
			curr = nextpt;
		}
		sorted.push(rest[0].id)
		return sorted;
	}
