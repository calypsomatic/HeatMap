import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import { create, all } from 'mathjs';
// import {PythonShell} from 'python-shell';

const config = { }
const math = create(all, config)

//Not sure if this will want to be changed, or when
const rad = 0.004;

export const getAndProcessStreetData = async (currlat, currlon) => {

	var osmapi = "https://www.openstreetmap.org/api/0.6/"
	var osm =		osmapi + "map?bbox="+(currlon-rad)+","+(currlat-rad)+","+(currlon+rad)+","+(currlat+rad)

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
        if (debug){
         console.log("Found two different names: " + wayNames_by_Id[item] + " and " + maybename[0])
       }
      }
      if (!ways_by_Name[maybename[0]]){
        ways_by_Name[maybename[0]] = [item];
      } else if (!ways_by_Name[maybename[0]].includes(item)){
       //  if (debug){
       //   console.log("Found two different keys for " + maybename[0]);
       // }
        ways_by_Name[maybename[0]].push(item);
        usekey = ways_by_Name[maybename[0]][0];
      }
    }
  //EXPERIMENT
  if (allNodesInRelation[usekey]){
    // console.log(usekey + " already exists");
    // allNodesInRelation[usekey] = allNodesInRelation[usekey].concat(refnodes);
		allNodesInRelation[usekey] = merge(allNodesInRelation[usekey],refnodes);
    usekey = null;
  } else {
    allNodesInRelation[item] = refnodes;
  }
  // allNodesInRelation[key] = allnodes;
});


	////////////////////////////////////////////////////////////////


///////////////////////////////////
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
  //        //  if (debug){
  //        //   console.log("Found two different names: " + wayNames_by_Id[key] + " and " + maybename[0])
  //        // }
  //       }
  //       if (!ways_by_Name[maybename[0]]){
  //         ways_by_Name[maybename[0]] = [key];
  //       } else if (!ways_by_Name[maybename[0]].includes(key)){
  //        //  if (debug){
  //        //   console.log("Found two different keys for " + maybename[0]);
  //        // }
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
  //     // console.log(usekey + " already exists");
  //     allNodesInRelation[usekey] = allNodesInRelation[usekey].concat(allnodes);
  //     usekey = null;
  //   } else {
  //     allNodesInRelation[key] = allnodes;
  //   }
  //   // allNodesInRelation[key] = allnodes;
  // }

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
		// console.log(key, wayixs)
		let coords = wayixs.map( (nodeid) => {
			let node = GetElementsByAttribute(result, "node", "id", nodeid)[0];
			return {id: nodeid, coord: {x:parseFloat(node.getAttribute("lat")), y:parseFloat(node.getAttribute("lon"))}};
		});
		if (coords.length < 3){
			intersections_by_wayId[key] = wayixs;
		}
		else {
			let sorted = sortIntoIds(coords);
			// console.log(sorted);
	    intersections_by_wayId[key] = sorted;
		}
  }


  //intersections_by_wayId should be sorted in a line which is not guaranteed to happen
  let intersection_coords = {}

  for (const [key, value] of Object.entries(intersections_by_wayId)) {
    let coords = value.map( (nodeid) => {
      let node = GetElementsByAttribute(result, "node", "id", nodeid)[0];
      return {id: nodeid, coord: {x:parseFloat(node.getAttribute("lat")), y:parseFloat(node.getAttribute("lon"))}};
    });
    intersection_coords[key] = coords;
  }


// function radians(deg){
//     return deg * (Math.PI/180);
//   }
//
// // https://stackoverflow.com/questions/16774935/javascript-function-nearest-neighbor
// function vincenty_sphere(lt1,lt2,lon1,lon2) {
//
//   let lat1 = radians(lt1)
//   let lat2 = radians(lt2)
//   let delta_lon = radians(lon2-lon1)
//
//   let term1 = (Math.cos(lat2) * Math.sin(delta_lon))**2
//   let term2 = (Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta_lon))**2
//   let numerator = Math.sqrt(term1 + term2)
//
//   let denominator = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(delta_lon)
//
//   let central_angle = Math.atan2(numerator, denominator)
//
//   let radius = 6372.8    // km
//
//   return radius * central_angle
// }


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

// let test = Object.values(intersection_coords)[0];
// console.log("test: ", test);
// let r = sortIntoIds(test);
// console.log(r);

//
//
// function two_nearest(coord, list){
//   let lat = coord["coord"][0]
//   let lon = coord["coord"][1]
//
//   let nearest1dist = 40042.0    // km
//   let nearest1 = null;
//   let nearest2dist = 40042.1
//   let nearest2 = null;
//   for (let i = 0; i < list.length; i++){
//       let distance = vincenty_sphere(lat, list[i].coord[0], lon, list[i].coord[1])
//       if(distance < nearest1dist){
//           nearest2dist = nearest1dist;
//           nearest2 = nearest1;
//           nearest1dist = distance;
//           nearest1 = list[i];
//         }  else if (distance < nearest2dist){
//           nearest2dist = distance;
//           nearest2 = list[i]
//         }
//       }
//
//   return [nearest1, nearest2];
// }
// let nearest_neighbors = {};
//
// for (const [key, value] of Object.entries(intersection_coords)) {
//   //key is wayId, value is list of intersections
//   let nearest_dict = {};
//   value.forEach((item, i) => {
//     let rest = value.slice();
//     rest.splice(i,i+1);
//     nearest_dict[item["id"]] = two_nearest(item, rest);
//   });
//   nearest_neighbors[key] = nearest_dict
//   // let test = two_nearest(Object.values(intersection_coords)[0][0], Object.values(intersection_coords)[0].slice(1));
//
//
// }
// console.log("nearest_neighbors: ", nearest_neighbors);

  //TODO See if I can do this in python


	// save code as start.js


  // function findNearestNeighbors(coordList){
  //   let dists = Array(coordList.length).fill().map(() => Array(coordList.length).fill(0));
  //   let nearest = [];
  //   coordList.forEach((item, i) => {
  //     let prev = dists.slice(0,i).map( (a) => a[i])
  //     let minIndex = prev.indexOf(Math.min(...prev))
  //     let secondmin = prev.indexOf(Math.min(...Array.from(prev).splice(minIndex,minIndex)))
  //     for (let j = i+1; j < coordList.length; j++){
  //           dists[i][j] = Math.sqrt(Math.pow(item[0]-coordList[j][0],2) + Math.pow(item[1]-coordList[j][1],2));
  //           if (minIndex < 0 || dists[i][j] < dists[i][minIndex]){
  //             secondmin = minIndex;
  //             minIndex = j;
  //           } else if (secondmin < 0 || dists[i][j] < dists[i][secondmin]){
  //             secondmin = j
  //           }
  //       }
  //       nearest[i] = [minIndex,secondmin];
  //   });
  //   console.log(dists);
  //   console.log(nearest);
  // }
  //
  // findNearestNeighbors(Object.values(intersection_coords)[0]);



  var allNodes = Object.values(allNodesInRelation).flat();

  return { ways_by_refNodeId: ways_by_refNodeId, nodes_by_wayId: nodes_by_wayId, ways_by_Name: ways_by_Name,
    wayNames_by_Id:wayNames_by_Id, intersections_by_wayId: intersections_by_wayId, allNodesInRelation: allNodesInRelation,
  allNodes: allNodes, result: result, intersections_by_nodeId: intersections_by_nodeId}
	// allNodes: allNodes, result: result, intersections_by_nodeId: intersections_by_nodeId, streetrelationids: streetrelationids}

}
