import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import {storeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds, getUserPolygonsInBounds} from './storage.js';
import StreetPolygon from './StreetPolygon.js';
import {processVoronoi} from './voronoi-processing.js';
import {getAndProcessStreetData} from './street-data.js';
import {getAllNeighborsForWay, findSideNodesOnOtherStreetWithMidpoints, findSideIntersectionsFromNodeAndWay, findClosestNodeAndIntersection} from './node-processing.js';

const debug = false;
var logger = debug ? console.log.bind(console) : function () {};
var group = debug ? console.group.bind(console) : function () {};
var groupEnd = debug ? console.groupEnd.bind(console) : function () {};
const markers = [];
const polygons = [];
const rad = 0.01;

export const createNewIntersections = async (location, existing) => {

		group("createNewIntersections");
		logger("existing:");
		logger(existing);

	const currlat = location.lat;
	const currlon = location.lng;

	//Get all the node info and process it first
	let resp = await getAndProcessStreetData(currlat, currlon);
	logger("resp received: ", resp);
	const ways_by_refNodeId = resp["ways_by_refNodeId"];
	const nodes_by_wayId = resp["nodes_by_wayId"];
	const ways_by_Name = resp["ways_by_Name"];
	const wayNames_by_Id = resp["wayNames_by_Id"];
	const intersections_by_wayId = resp["intersections_by_wayId"];
	const allNodesInRelation = resp["allNodesInRelation"];
	const intersections_by_nodeId = resp["intersections_by_nodeId"];
	const streetrelationids = resp["streetrelationids"];
	const allNodes = resp["allNodes"];
	const result = resp["result"];

	function addVertToMarkers(vert, labelfunc){
		let ll = new L.LatLng(vert.x, vert.y);
		markers.push({position: ll, label: labelfunc(vert)});
	}

 	function addVertsToMarkers(verts, labelfunc){
 		verts.forEach((item, i) => {
			addVertToMarkers(item, labelfunc(item, i));
 		});
 	}

  function addCoordsToMarkers(coords, labelfunc){
	 	coords.forEach((item, i) => {
		 	let ll = new L.LatLng(item[0], item[1]);
  		markers.push({position: ll, label: labelfunc(item, i)});
	 	});
 	}

	function addNodesToMarkers(nodes, labelfunc){
		nodes.forEach((item, i) => {
			let node = GetElementsByAttribute(result, "node", "id", item)[0]
			if (node){
				let ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
				markers.push({position: ll, label: labelfunc(item, i)});
			} else {
				logger("no node ", item);
			}
		});
	}

	function labelByCoords(coord, ind){
		 return coord[0] + "," + coord[1];
 	}

	function labelNode(n, i){
		let nd = GetElementsByAttribute(result, "node", "id", n)[0];
		return nd.getAttribute("id") + ": " + nd.getAttribute("lat") + "," + nd.getAttribute("lon");
	}

	function labelNodeInOrder(n, i){
		let nd = GetElementsByAttribute(result, "node", "id", n)[0];
		return i + ": " + nd.getAttribute("id") + ": " + nd.getAttribute("lat") + "," + nd.getAttribute("lon");
	}
	for (const [key, value] of Object.entries(intersections_by_wayId)) {
		// logger(value)
		addNodesToMarkers(value, labelNode);
}
return {polygons: resp.polygons, markers: markers};

	let neighbors = {};
	const numtoteststart = 0;
	const numtotestend = 12;
	logger("intersections_by_wayId.length: ", Object.keys(intersections_by_wayId).length);

// Each way (road) has neighbors - roads that intersect it on either side of the given node
 function getNeighborsForWay(nodeid, wayid) {
	 group("getNeighborsForWay");
	 const ways = ways_by_refNodeId[nodeid].filter(node => node != nodeid);
		var node = GetElementsByAttribute(result, "node", "id", nodeid)[0]
		var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
		// markers.push({position: ll, label: "intersection " + nodeid + " " + node.getAttribute("lat") + "," + node.getAttribute("lon")});
		logger("getting neighbors for " + nodeid + " with streets: " + ways);
	neighbors[nodeid] = findSideNodesOnOtherStreetWithMidpoints(result, allNodesInRelation, intersections_by_nodeId, nodeid, wayid)
	logger("neighbors for " + nodeid, neighbors[nodeid]);
	groupEnd();
 }

 if (streetrelationids){
	 streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		 getAllNeighborsForWay(result, intersections_by_nodeId, str, intersections_by_wayId[str], allNodesInRelation)
		 // intersections_by_wayId[str].forEach((item, i) => {
			//  	getNeighborsForWay(item, str);
		 // });
 });
} else {
	// Object.keys(intersections_by_wayId).slice(numtoteststart, numtotestend).forEach((way, i) => {
		Object.keys(intersections_by_wayId).forEach((way, i) => {
			// logger("result: ", result);
			// logger("intersections_by_nodeId: ", intersections_by_nodeId);
			// logger("way: ", way);
			// logger("intersections_by_wayId[way]: ", intersections_by_wayId[way]);
			// logger("allNodesInRelation: ", allNodesInRelation);
		let newneighbors = getAllNeighborsForWay(result, intersections_by_nodeId, way, intersections_by_wayId[way], allNodesInRelation);
		neighbors = {...neighbors, ...newneighbors};
		// intersections_by_wayId[way].forEach((item, j) => {
		// 	 getNeighborsForWay(item, way);
		// });
	});
}

//Currently not used
	function testWayToGetNeighbors(){
		// group("testWayToGetNeighbors");
	// 	streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
	// 		// let maxlat = currlat - 0.005;
	// 		// let maxlon = currlon - 0.005;
	// 		intersections_by_wayId[str].forEach((item, i) => {
	// // 			const ways = ways_by_refNodeId[item].filter(node => node != str);
	// // 			 var node = GetElementsByAttribute(result, "node", "id", item)[0]
	// // 			 if (parseFloat(node.getAttribute("lat")) > maxlat){
	// // 				 maxlat = parseFloat(node.getAttribute("lat"))
	// // 			 }
	// // 			 if (parseFloat(node.getAttribute("lon")) > maxlon){
	// // 				 maxlon = parseFloat(node.getAttribute("lon"))
	// // 			 }
	// // 			 var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
	// // 			 markers.push({position: ll, label: "intersection " + item + " " + node.getAttribute("lat") + "," + node.getAttribute("lon")});
	// // 			 logger("getting neighbors for " + item + " with streets: " + ways);
	// // 		 // neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, item, ways).map(el => el.filter(e => !!e)).filter( g => g.length > 0);
	// // 		 // neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, item, ways);
	// // 		 // neighbors[item] = findSideIntersectionsFromNodeAndWay(allNodesInRelation, intersections_by_nodeId, GetElementsByAttribute(result, "node", "id", item)[0], 11553284);
	// // 		 // neighbors[item] = findSideIntersectionsOnOtherStreet(intersections_by_wayId, intersections_by_nodeId, item, str);
	// // 		 // neighbors[item] = findSideIntersectionsFromNodeAndWayWithMidPoints(result, allNodesInRelation, intersections_by_nodeId, GetElementsByAttribute(result, "node", "id", item)[0], 11553284)
	// // //		 neighbors[item] = findSideIntersectionsOnOtherStreetWithMidpoints(result, intersections_by_wayId, intersections_by_nodeId, item, str)
	// // 		 neighbors[item] = findSideNodesOnOtherStreetWithMidpoints(result, allNodesInRelation, intersections_by_nodeId, item, str)
	// // 		 logger("neighbors for " + item, neighbors[item]);
	// 		});
	// 		// logger(wayNames_by_Id[str] + ": maxlat: ", maxlat, ", maxlon: ", maxlon);
	// 	});
		groupEnd();
	}

	function labelNodesAndVerts(){
		group("labelNodesAndVerts");

		// addNodesToMarkers(Object.keys(neighbors),labelNode);
		logger(neighbors);
 	 Object.keys(neighbors).map( (key) => {
 		 neighbors[key].forEach((item, i) => {
 			 		if (item[0]) {
 						 var ll2 = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
						 let exist = markers.findIndex( x => x.position.lat == ll2.lat && x.position.lon == ll2.lon);
						 if (exist > 0){
							 logger("exist: ", exist, markers[exist]);
							 markers[exist].label = markers[exist].label + ", " + key + "'s neighbor: " + item[0].getAttribute("id");
							 logger(markers[exist]);
						 // }else {
							//  markers.push({position: ll2, label: key + "'s neighbor: " + item[0].getAttribute("id")});
						 }
 					 }
 					 if (item[1] && item[1].length>0 && !isNaN(item[1][0]) && !isNaN(item[1][1])){
 						 var ll3 = new L.LatLng(item[1][0], item[1][1]);
 			  		 // markers.push({position: ll3, label: key + "'s midpoint: " + item[1][0] + "," + item[1][1]});
 					 }

 		 });

 	 })
	 logger(markers);
		groupEnd();
	}


	// logger(neighbors);

labelNodesAndVerts();

	 //If I want to try Voronoi
	 // logger("result: ", result)
	 // logger("streetrelationids: ", streetrelationids);
	 // logger("intersections_by_wayId: ", intersections_by_wayId);
	 // let extrapolygons = processVoronoi(result, streetrelationids, intersections_by_wayId);
	 // logger(extrapolygons);
	 // Array.prototype.push.apply(polygons, extrapolygons);

//Used to detect already existing polygons
	 function cornersMatch(corners1, corners2){
	 	if (corners1.length != corners2.length){
	 		return false;
	 	}
	 	return corners1.every((c, index) =>
	 		c.every((val, i) => val === corners2[index][i]));
	 }

		function cornerSort(c1, c2){
			if (c1[0] == c2[0]){
				return c1[1] - c2[1];
			}
			return c1[0]-c2[0];
		}

//For each road, make polygons, add if they don't already exist
//TODO: Is there a more efficient way to do this?
function createPolygonsForWay(wayid){
	// group("createPolygonsForWay");
	var existingwaycorners = existing.polygon.filter( (x) => x.street_id == wayid).map( (x) => x.corners.sort(cornerSort));
		// logger("creating polygons for ", wayid)
		// logger(existingwaycorners);
	for (var i = 0; i < intersections_by_wayId[wayid].length-1; i++){

		//TODO when are these empty and what to do about it
		if (neighbors[intersections_by_wayId[wayid][i]] && neighbors[intersections_by_wayId[wayid][i+1]]){
			var c1 = neighbors[intersections_by_wayId[wayid][i]].map( (corner) => corner[1]);
			var c2 = neighbors[intersections_by_wayId[wayid][i+1]].map( (corner) => corner[1]);
			var test = c1.concat(c2);
			//TODO better filter?
			test = test.filter( (x) => !!x && x.length>0)
			if (test.length > 2 && !existingwaycorners.some(l => cornersMatch(l,test.sort()))){
				// logger("polygon not found, creating new");
				var poly = new StreetPolygon(test, wayNames_by_Id[wayid], wayid)
				polygons.push(poly);
			}
		}
	}
	// groupEnd();
}

//Create all the polygons
if (streetrelationids){
	streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		createPolygonsForWay(str);
	})
} else {
	Object.keys(intersections_by_wayId).slice(numtoteststart, numtotestend).forEach((way, i) => {
		createPolygonsForWay(way);
	})
}

	 logger(polygons);

//Not currently used
	 function test() {

	 var nodeandIx = findClosestNodeAndIntersection(result, allNodes, intersections_by_nodeId, currlat, currlon);

	 var minStreetNode = nodeandIx[0];
	 var minIsxNode = nodeandIx[1];

	 //Let's find the streets you are at the intersection of
	 var intersectionNodes = ways_by_refNodeId[minIsxNode.getAttribute("id")];


		 //TODO good chance this won't always work
		 var yourWay = ways_by_refNodeId[minStreetNode.getAttribute("id")][0]
		 var sides = findSideIntersectionsFromNodeAndWay(allNodesInRelation, intersections_by_nodeId, minStreetNode, yourWay);

	 sides.forEach((item, i) => {
			if (item){
				var node = GetElementsByAttribute(result, "node", "id", item)[0]
				var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
				// markers.push({position: ll, label: "original side: " + node.getAttribute("id")});
			}
	 });

			 //Now for each intersection aside you, find their sides:
			 //TODO clean up this whole mess
			 //ASSUMING THERE'S ONLY ONE STREET
			 // var sides1way = ways_by_refNodeId[sides[0]].filter(node => node != yourWay)[0];

			 //TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
			 var sides1ways = ways_by_refNodeId[sides[0]].filter(node => node != yourWay);
			 // var streetIx = intersections_by_wayId[sides1way].filter(node => node != sides[0]);
			 // streetIx.forEach((item, i) => {
				//  var node = GetElementsByAttribute(result, "node", "id", item)[0]
				//  var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
				//  markers.push({position: ll, label: "street: " + sides1way + " node: " + node.getAttribute("id")});
			 // });

			 //ASSUMING THERE'S ONLY ONE STREET
			 // var sides1 = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, sides[0], sides1way);

			 //TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
			 var sides1 = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, sides[0], sides1ways);

				 logger("sides1:");
				 logger(sides1);

			 const polygon = []
			 //
			 sides1.forEach((item, i) => {
				 if (item.some(el => !!el)){
					 logger(item);
					 polygon.push([item[1][0], item[1][1]]);
			     var ll = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
					 // markers.push({position: ll, label: "sides1: " + item[0].getAttribute("id")});
				 }
			 });
			 //ASSUMING THERE'S ONLY ONE STREET
			 // var sides2way = ways_by_refNodeId[sides[1]].filter(node => node != yourWay)[0];

			 //TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
			 var sides2ways = ways_by_refNodeId[sides[1]].filter(node => node != yourWay);


			// var streetIx = intersections_by_wayId[sides2way].filter(node => node != sides[1]);


			 // streetIx.forEach((item, i) => {
				//  var node = GetElementsByAttribute(result, "node", "id", item)[0]
				//  var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
				//  markers.push({position: ll, label: "street: " + sides2way + " node: " + node.getAttribute("id")});
			 // });

			 //ASSUMING THERE'S ONLY ONE STREET
			// var sides2 = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, sides[1], sides2way);

			 //TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
			 var sides2 = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, sides[1], sides2ways);

				 logger("sides2:");
				 logger(sides2);


			 sides2.forEach((item, i) => {
				 if (item.some(el => !!el)){
					 polygon.push([item[1][0], item[1][1]]);
			     var ll = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
					 // markers.push({position: ll, label: "sides2: " + item[0].getAttribute("id")});
				 }
			 });

			 //EXPERIMENTAL
			 if (sides2.map(el => el.filter(e => !!e)).filter( g => g.length > 0).length < 2){
				 //find closest node on the other side where the street node would be
				 // {
					 //Let's try to find out which street you are on and what the closest intersection is
					 var minStreet = 100000;
					 var minStreetNode = null;
					 var minp = [];

					 var sideNode = GetElementsByAttribute(result, "node", "id", sides[1])[0]
					 var sideLat = parseFloat(sideNode.getAttribute("lat"));
					 var sideLon = parseFloat(sideNode.getAttribute("lon"));

					 var side2Lat = parseFloat(sides2[0][0].getAttribute("lat"));
					 var side2Lon = parseFloat(sides2[0][0].getAttribute("lon"));

					 var latSign = Math.sign(sideLat-side2Lat);
					 var lonSign = Math.sign(sideLon-side2Lon);

					 allNodes.filter(node => node != sides[1]).forEach((x, i) => {
						 var node = GetElementsByAttribute(result, "node", "id", x)[0];
						 var nodeLat = parseFloat(node.getAttribute("lat"));
						 var nodeLon = parseFloat(node.getAttribute("lon"));

						 if (Math.sign(sideLat-nodeLat) != latSign && Math.sign(sideLon-nodeLon) != lonSign){
							 var dist = Math.sqrt(Math.pow(nodeLat-sideLat,2) + Math.pow(nodeLon-sideLon,2));
							 if (dist < minStreet){
								 minStreet = dist;
								 minStreetNode = node;
								 minp = [(nodeLat + sideLat)/2.0, (nodeLon + sideLon)/2.0]
							 }
						 }
 				 	})
					polygon.push(minp)
					var ll = new L.LatLng(minStreetNode.getAttribute("lat"), minStreetNode.getAttribute("lon"));
					// markers.push({position: ll, label: "extra: " + minStreetNode.getAttribute("id")});
		 }

			 // return polygon;
			 var poly = new StreetPolygon(polygon, wayNames_by_Id[yourWay], yourWay);
			 // polygon.forEach((item, i) => {
			 // 	var ll = new L.LatLng(item[0], item[1]);
				// markers.push({position: ll, label: "corner " + i + ": " + item[0] + "," + item[1]});
			 // });
			 //
			 // logger("poly:", poly);
			 var testPoly = new StreetPolygon(polygon.map( (coord) => [coord[0]+1,coord[1]+1]), "Test Street", yourWay + 1);
		 }

			 // polygons.push(poly)
			 // polygons.push(testPoly)
			 storeData(polygons, "polygons");
			 logger("returning:", polygons);
			 logger("markers: ", markers);
				 // logger("returning:", convertPolygonListToColors(polygons));
			 // return {polygon: convertPolygonListToColors(polygons), markers: []};
			 return {polygon: polygons, markers: markers};
			 groupEnd();

}

//TODO Get the colors working.  In progress
const colorSchema = {1: 'yellow', 2: 'orange', 3: 'red', 4:'purple', 5:'blue', 6:'green', 7:'dark blue'}

function convertPolygonListToColors(polygons){
	return polygons.map( p => {
		p._polygon['color'] = getColorForPolygon(p);
		return p._polygon;
	});
}

//TODO how to deal with different color schemas etc and also this is bad
function getColorForPolygon(polygon){
	// group("getColorForPolygon");
	let interval = (new Date().getTime() - new Date(polygon._date).getTime())/(1000 * 3600 * 24);
		// logger("interval: " + interval);
	let schema = Object.keys(colorSchema).sort();
		// logger("schema: " + schema);
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
		}
			// return colorSchema[schema[6]];
			return null;
			// groupEnd();
}


//Get intersections that are alraedy in database, including those for this user
export const findExistingIntersections = async (user, location) => {

		group("findExistingIntersections");
		logger(location);

	var currlat = location.lat;
	var currlon = location.lng;
	let bounds = [(currlon-rad),(currlat-rad),(currlon+rad),(currlat+rad)];

	let polygons = [];
	var polyshere = await getPolygonsInBounds(bounds);
	let userpolys = await getUserPolygonsInBounds(user, bounds);
	if (polyshere && polyshere.length){
		logger("userpolys:")
		logger(userpolys);
		if (userpolys && userpolys.length){
			polygons = convertPolygonListToColors(userpolys);
			//Remove any that are in the user list to avoid duplicates
			polyshere = polyshere.filter( p => !polygons.some(pg => pg._id == p._id));
		}
		// polyshere = convertPolygonListToColors(polyshere);
			logger("polyshere:")
			logger(polyshere);
		polygons = polygons.concat(polyshere);
	}
	return {polygon: polygons}
	groupEnd();

}
