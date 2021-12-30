import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import Voronoi from './assets/rhill-voronoi-core.js';
import StreetPolygon from './StreetPolygon.js';
import {getLocationPolygon,addPolygonsWithDate, updateUserPolygon, removePolygons, storePolygons, storeData, removeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds, getUserPolygonsInBounds} from './storage.js';
import {test} from './process-activity.js'

////////////////////////////////////////////
//  LONGITUDE == LEFT TO RIGHT, x, (-71) //
//  LATITUDE == TOP TO BOTTOM, y, (42)  //
/////////////////////////////////////////
const debug = false;
var logger = debug ? console.log.bind(console) : function () {};
var group = debug ? console.group.bind(console) : function () {};
var groupEnd = debug ? console.groupEnd.bind(console) : function () {};
const getLogger = (func, on) => {
  if (on){
    group(func);
    return {log: logger, end: groupEnd}
  }
  else {
    return {log: function () {}, end: function () {}}
  }
}

const markers = [];
const polygons = [];
// const rad = 0.01;

const getAndProcessStreetData = async (currlat, currlon, existing, rad) => {
  // currlat = currlat + rad/2;
  // currlon = currlon - rad/2;
  // currlat = 42.389930725097656
  // currlon = -71.1178970336914
  const log = getLogger("getAndProcessStreetData", true);
  log.log(currlat, currlon);
  const osmapi = "https://www.openstreetmap.org/api/0.6/"
  log.log(rad);
  log.log(existing)
  var osm =	osmapi + "map?bbox="+(currlon-rad)+","+(currlat-rad)+","+(currlon+rad)+","+(currlat+rad)

  log.log("calling ", osm);
  //TODO Deal with errors and such
  var resp = await fetch(osm);
  var str = await resp.text();

  //Set up variables
  var ways_by_refNodeId = {}
	var nodes_by_wayId = {}
	var ways_by_Name = {}
	var wayNames_by_Id = {}
	var intersections_by_wayId = {}
	var allNodesInRelation = {}

  //Parse osm result
  var result = new window.DOMParser().parseFromString(str, "text/xml");
  log.log("result: ", result);

  // A simple function to remove duplicate items
  let removeDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) === index);

  //Every street (way) has its own id
  let wayids = getElementsValueByXPath('//way/tag[@k="highway" and not(@v="service")]/../tag[@k="name"]/../@id', result);
  log.log("wayids: ", wayids);

  let testways = getElementsValueByXPath('//way/tag[@k="highway"]/../tag[@k="name"]/../@id', result);
  log.log("testways: ", testways);

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
         log.log("Found two different names: " + wayNames_by_Id[item] + " and " + maybename[0])
      }
      if (!ways_by_Name[maybename[0]]){
        ways_by_Name[maybename[0]] = [item];
      } else if (!ways_by_Name[maybename[0]].includes(item)){
        ways_by_Name[maybename[0]].push(item);
        usekey = ways_by_Name[maybename[0]][0];
      }
    }

    if (allNodesInRelation[usekey]){
      allNodesInRelation[usekey] = merge(allNodesInRelation[usekey],refnodes);
      usekey = null;
    } else {
      allNodesInRelation[item] = refnodes;
    }
  });

    for (const [key, value] of Object.entries(allNodesInRelation)) {
      value.forEach((child, i) => {
          if (!ways_by_refNodeId[child]){
            ways_by_refNodeId[child] = [key];
          } else {
            ways_by_refNodeId[child].push(key);
          }
      });
    }

    log.log("wayNames_by_Id: ", wayNames_by_Id);
    log.log("ways_by_Name: ", ways_by_Name);
    log.log("ways_by_refNodeId: ", ways_by_refNodeId);

    //intersections_by_nodeId's keys are all the nodes that are intersections, and the values are an array of which streets meet it
    var intersections_by_nodeId = Object.fromEntries(Object.entries(ways_by_refNodeId).filter(([k,v]) => v.length>1));

    log.log("intersections_by_nodeId: ", intersections_by_nodeId);

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
  			return {id: nodeid, coord: {y:parseFloat(node.getAttribute("lat")), x:parseFloat(node.getAttribute("lon"))}};
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
        return {id: nodeid, coord: {y:parseFloat(node.getAttribute("lat")), x:parseFloat(node.getAttribute("lon"))}};
      });
      intersection_coords[key] = coords;
    }

    let testsites = [];
  	let minlon = 1000;
  	let maxlon = -1000;
  	let minlat = 1000;
  	let maxlat = -1000;

    log.log("intersections_by_wayId: ", intersections_by_wayId);
    let testind = 0;
    let streetData = []

    for (const [key, value] of Object.entries(allNodesInRelation)) {
      value.forEach((item, i) => {
        addNodeToTestSites(item);
        streetData.push([key, wayNames_by_Id[key], item]);
      });
    	}

      //If I want to use midpoints of intersections for voronoi pts -
      //Makes a better polygon but harder to manage
      // for (const [key, value] of Object.entries(intersections_by_wayId)) {
      //     if (value.length == 1){
      //       addNodeToTestSites(value[0]);
      //       streetData.push([key, wayNames_by_Id[key]]);
      //     } else {
      //       for (let i = 0; i < value.length - 1; i++){
      //           let first = getCoordsForNode(value[i]);
      //           let second = getCoordsForNode(value[i+1]);
      //           let mid = calculateMidpoint(first, second, 0);
      //           if (!isNaN(mid.x) && !isNaN(mid.y)){
      //             addCoordsToTestSites(mid);
      //             streetData.push([key, wayNames_by_Id[key]]);
      //           }
      //       }
      //     }
      //   }

    	log.log("testsites: ", testsites)
      log.log(streetData);

      // xl < xr, yt < yb
      var bbox = {xl: minlon, xr: maxlon, yt: minlat, yb: maxlat};
      log.log(bbox);

    	var voronoi = new Voronoi();
    	var diagram = voronoi.compute(testsites, bbox);
    	log.log(diagram);

      //If I want to display the voronoi pts
      // testsites.forEach((item) => {
      //   let ll = new L.LatLng(item.y, item.x);
      //   markers.push({position: ll, label: item.voronoiId +" ("+item.y +"," + item.x +")"});
      // });
      let streetDataDict = {}
      testsites.forEach((item, i) => {
        streetDataDict[item.voronoiId] = streetData[i];
      });
      log.log(streetDataDict);


    	let polys = {}

      //Create polygons for each voronoi cell, mark if it's on the edge of the graph
    	diagram.cells.forEach((item, i) => {
          let onedge = false;
          let corners = [];
          let neighbors = [];
          let siteId = item.site.voronoiId;
          item.halfedges.forEach((he) => {
            if (he.edge.lSite == null || he.edge.rSite == null){
              onedge = true;
            } else {
              if (he.edge.lSite.voronoiId == siteId){
                neighbors.push(he.edge.rSite.voronoiId);
              } else {
                neighbors.push(he.edge.lSite.voronoiId);
              }
            }
            if (!corners.some((c) => c[1] == he.edge.va.x  && c[0] == he.edge.va.y)){
              corners.push([he.edge.va.y,he.edge.va.x]);
            }
            if (!corners.some((c) => c[1] == he.edge.vb.x  && c[0] == he.edge.vb.y)) {
              corners.push([he.edge.vb.y,he.edge.vb.x]);
            }
          });
          //If I want to display the corners of the cells
          // corners.forEach((c) => {
          //   let ll = new L.LatLng(c[0], c[1]);
          //   let ind = markers.findIndex(m => m.position.lat == ll.lat && m.position.lng == ll.lng);
          //   if (ind == -1){
          //     markers.push({position: ll, label: "corner for " + item.site.voronoiId +" ("+c[0] +"," + c[1] +")"});
          //   } else {
          //     markers[ind].label = markers[ind].label + " " + item.site.voronoiId;
          //   }
          // });
            var poly = new StreetPolygon(corners, streetDataDict[item.site.voronoiId][1], streetDataDict[item.site.voronoiId][0], {lat: item.site.y, lon: item.site.x}, streetDataDict[item.site.voronoiId][2]);
            poly.edge = onedge;
            poly.neighbors = neighbors;
            polys[siteId] = poly;
    	});

      log.log("polys found: ", polys);

      let polygons = [];

      //Only add polygons that are not on the edge - edge polys are unreliable
      for (const [sId, p] of Object.entries(polys)) {
        if (!p.edge){
            let edges = false;
            p.neighbors.forEach((nbr) => {
              if (polys[nbr].edge){
                edges = true;
              }
            });
            if (!edges){
              polygons.push(p);
            }
        }
      }

//In this section, search for conflicts with existing polygons and try to recalculate
////////////////////////////
minlon = 1000;
maxlon = -1000;
minlat = 1000;
maxlat = -1000;
testsites = []
streetData = []

let remove = new Set();
let tryAgain = new Set();

existing.polygon.forEach(x => {
  addCoordsToTestSites({y:x._center.lat, x:x._center.lon})
  streetData.push(x);
   polygons.forEach( (y,i) => {
     if (x._id == y._id){
       remove.add(y._id)
       if (!cornersMatch(x._corners, y._corners)){
         remove.add(x._id)
         tryAgain.add(x._id)
       }
     }
     else {
       let skip = false;
       y._corners.forEach( (c) => {
         if(x.containsPoint(c)){
           if (!x._corners.filter( z => z[0] == c[0] && z[1] == c[1]).length){
             remove.add(x._id)
             remove.add(y._id)
             tryAgain.add(y._id)
             tryAgain.add(x._id)
           }
           skip = true;
           return false;
         }
       })
       if (!skip){
         x._corners.forEach( (c) => {
           if(y.containsPoint(c)){
             if (!y._corners.filter( z => z[0] == c[0] && z[1] == c[1]).length){
               remove.add(x._id)
               remove.add(y._id)
               tryAgain.add(y._id)
               tryAgain.add(x._id)
             }
             return false;
           }
         })
       }
     }
  })
})

polygons.forEach( x => {
  addCoordsToTestSites({y:x._center.lat, x:x._center.lon})
  streetData.push(x);
})

//Make a new voronoi with the existing and the new
bbox = {xl: minlon, xr: maxlon, yt: minlat, yb: maxlat};
var voronoi = new Voronoi();
var diagram = voronoi.compute(testsites, bbox);
log.log(diagram);

streetDataDict = {}
testsites.forEach((item, i) => {
  streetDataDict[item.voronoiId] = streetData[i];
});

let polys2 = []

//Add the newly calculated polys only
diagram.cells.forEach((item, i) => {
    if (tryAgain.has(streetDataDict[item.site.voronoiId]._id)){
      let onedge = false;
      let corners = [];
      let neighbors = [];
      let siteId = item.site.voronoiId;
      item.halfedges.forEach((he) => {
        if (he.edge.lSite == null || he.edge.rSite == null){
          onedge = true;
        } else {
          if (he.edge.lSite.voronoiId == siteId){
            neighbors.push(he.edge.rSite.voronoiId);
          } else {
            neighbors.push(he.edge.lSite.voronoiId);
          }
        }
        if (!corners.some((c) => c[1] == he.edge.va.x  && c[0] == he.edge.va.y)){
          corners.push([he.edge.va.y,he.edge.va.x]);
        }
        if (!corners.some((c) => c[1] == he.edge.vb.x  && c[0] == he.edge.vb.y)) {
          corners.push([he.edge.vb.y,he.edge.vb.x]);
        }
      });
        var poly = new StreetPolygon(corners, streetDataDict[item.site.voronoiId]._street_name, streetDataDict[item.site.voronoiId]._street_id, {lat: item.site.y, lon: item.site.x}, streetDataDict[item.site.voronoiId]._id);
        poly.edge = onedge;      // storeData(polygons, "polygons");

        poly.neighbors = neighbors;
        polys2.push(poly);
    }
});

//These are the new polygons to store
polygons = polygons.filter( x => !remove.has(x._id)).concat(polys2)
//For displaying along with existing
let toDisplay = polygons.concat(existing.polygon.filter(x => !remove.has(x._id)))


//////////////////////////////////

      // removeData("polygons");
      // removeData("userpolygons_testuser")
      // removePolygons(remove);
      // storeData(polygons, "polygons");
      storePolygons(polygons);
      return { polygons: toDisplay, markers:markers}
    	log.end();

      //Used to detect already existing polygons
  	 function cornersMatch(corners1, corners2){
  	 	if (corners1.length != corners2.length){
  	 		return false;
  	 	}
  	 	return corners1.every((c, index) =>
  	 		c.every((val, i) => val === corners2[index][i]));
  	 }

  		// function cornerSort(c1, c2){
  		// 	if (c1[0] == c2[0]){
  		// 		return c1[1] - c2[1];
  		// 	}
  		// 	return c1[0]-c2[0];
  		// }

      function getCoordsForNode(nodeid){
        let node = GetElementsByAttribute(result, "node", "id", nodeid)[0];
        let y = parseFloat(node.getAttribute("lat"));
        let x = parseFloat(node.getAttribute("lon"));
        return {x:x, y:y};
      }

      function addCoordsToTestSites(coords){
        testsites.push(coords);
        if (coords.y < minlat){
          minlat = coords.y;
        }
        if (coords.y > maxlat){
          maxlat = coords.y;
        }
        if (coords.x < minlon){
          minlon = coords.x;
        }
        if (coords.x > maxlon){
          maxlon = coords.x;
        }
      }

      function addCoordArrayToTestSites(ca){
        addCoordsToTestSites({y: ca[0], x:ca[1]});
      }

      function addNodeToTestSites(nodeid){
        let coords = getCoordsForNode(nodeid);
        addCoordsToTestSites(coords);
      }

      function calculateMidpoint(node1, node2, sign){
           const dist = sign == 0 ? 0.0005 : -0.0005;
           const linevector = [node2.x-node1.x, node2.y-node1.y];
           const lvsize = Math.sqrt(linevector[0]*linevector[0] + linevector[1]*linevector[1]);
           const lvnormal = [linevector[0]/lvsize,linevector[1]/lvsize];
           return {x:node1.x+dist*lvnormal[0],y:node1.y+dist*lvnormal[1]};
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
}

export const createNewIntersections = async (location, existing, rad=0.0025) => {
  const log = getLogger("createNewIntersections", true);
  log.log("existing:");
  log.log(existing);

  const currlat = location.coords.latitude;
  const currlon = location.coords.longitude;

  //Get all the node info and process it first
  let resp = await getAndProcessStreetData(currlat, currlon, existing, rad);
  log.log("processed street data: ", resp);

//   function addNodesToMarkers(nodes, labelfunc){
//     nodes.forEach((item, i) => {
//       let node = GetElementsByAttribute(result, "node", "id", item)[0]
//       if (node){
//         let ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
//         markers.push({position: ll, label: labelfunc(item, i)});
//       } else {
//         log.log("no node ", item);
//       }
//     });
//   }
//
//   for (const [key, value] of Object.entries(intersections_by_wayId)) {
//     // log.log(value)
//     addNodesToMarkers(value, labelNode);
// }
log.log("completed creating new intersections");
return {polygons: resp.polygons, markers: resp.markers};
log.groupEnd();
}

//TODO Get the colors working.  In progress
const colorSchema = {1: 'yellow', 2: 'orange', 3: 'red', 4:'purple', 5:'blue', 6:'green', 7:'dark blue'}

function convertPolygonListToColors(polygons){
	return polygons.map( p => {
		p._polygon['color'] = getColorForPolygon(p);
		return p._polygon;
	});
}

function getColorForPolygon(polygon){
  return getColorFromDate(polygon._date);
}

//TODO how to deal with different color schemas etc and also this is bad
function getColorFromDate(date){
	// group("getColorForPolygon");
	let interval = Math.floor((new Date().getTime() - new Date(date).getTime())/(1000 * 3600 * 24));
		// log.log("interval: " + interval);
	let schema = Object.keys(colorSchema).sort();
		// log.log("schema: " + schema);
		if( interval < schema[0]){
			return colorSchema[schema[0]];
		}
		else if( interval < schema[1]){
			return colorSchema[schema[1]];
		}
		else if( interval < schema[2]){
			return colorSchema[schema[2]];
		}
		else if( interval < schema[3]){
			return colorSchema[schema[3]];
		}
		else if( interval < schema[4]){
			return colorSchema[schema[4]];
		}
		else if( interval < schema[5]){
			return colorSchema[schema[5]];
		}
		else if( interval < schema[6]){
			return colorSchema[schema[6]];
		}true
			// return colorSchema[schema[6]];
			return null;
			// log.end();
}


//Get intersections that are alraedy in database, including those for this user
export const findExistingIntersections = async (user, location) => {
  let markers = [];

  ///// // TEMP: /////////
//   let datapts = await test();
//   console.log(datapts);
//   //   markers.push({position: ll, label: item.voronoiId +" ("+item.y +"," + item.x +")"});
//   const promises = datapts.map(async (item,i) => {
//     // markers.push({position: item[1], label: i})
//    const locp = await getLocationPolygon(item[1]);
//    return locp
//  })
//  const locps = await Promise.all(promises)
//   addPolygonsWithDate(user, locps.map((x,i) => [x[0], datapts[i][0]]));

  ///////

  const log = getLogger("findExistingIntersections", true);
	log.log(location);

  const rad = 0.0025;
	var currlat = location.coords.latitude;
	var currlon = location.coords.longitude;
	let bounds = [(currlon-rad),(currlat-rad),(currlon+rad),(currlat+rad)];
  log.log(bounds);

	let polygons = [];
	var polyshere = await getPolygonsInBounds(bounds);
  log.log("polyshere:")
  log.log(polyshere);
  polyshere.forEach((item, i) => {
      let ll = new L.LatLng(item._center.lat, item._center.lon);
      markers.push({position: ll, label: item._id});
  });

	let userpolys = await getUserPolygonsInBounds(user, bounds);
	if (polyshere && polyshere.length){
		log.log("userpolys:")
		log.log(userpolys);
		if (userpolys && userpolys.length){
			polygons = convertPolygonListToColors(userpolys);
			//Remove any that are in the user list to avoid duplicates
			polyshere = polyshere.filter( p => !polygons.some(pg => pg._id == p._id));
		}
			log.log("polyshere:")
			log.log(polyshere);
		polygons = polygons.concat(polyshere);
    polygons.forEach((p,i) => {
      if (p.containsPoint([currlat,currlon])){
          updateUserPolygon(user, p);
          polygons[i].color = getColorFromDate(new Date().getTime());
      }
    });
    createNewIntersections(location, {polygon: polygons, markers:markers})
  	return {polygon: polygons, markers:markers}
	} else {
    //TODO We have no polys for this location; need to make some quick.
    //In the meantime, one sham poly
    var poly = new StreetPolygon([[(currlat-0.00025),(currlon-0.00025)],
                                  [(currlat+0.00025),(currlon-0.00025)],
                                  [(currlat+0.00025),(currlon+0.00025)],
                                  [(currlat-0.00025),(currlon+0.00025)]]);
    poly.color = "yellow";
    createNewIntersections(location, {polygon: [], markers:markers})
    polygons.push(poly)
    return {polygon: polygons, markers:markers}
  }
  // removeData("userpolygons_" + user);

	log.end();

}
