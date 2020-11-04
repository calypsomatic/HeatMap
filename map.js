import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import {storeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds} from './storage.js';
import StreetPolygon from './StreetPolygon.js';
import {processVoronoi} from './voronoi-processing.js';
import {getAndProcessStreetData} from './street-data.js';
import {getAllNeighborsForWay, findSideNodesOnOtherStreetWithMidpoints, findSideIntersectionsFromNodeAndWay, findClosestNodeAndIntersection, findSideIntersectionsOnOtherStreet, findSideIntersectionsOnOtherStreetWithMidpoints} from './node-processing.js';

const debug = true;
const markers = [];
const polygons = [];
const rad = 0.004;

export const createNewIntersections = async (location) => {

	console.log("createNewIntersections");

	const currlat = location.lat;
	const currlon = location.lng;

	///JUST A TEST
	// getPolygonsByMultipleStreetIds(streetrelationids).then( (res) =>{
	// 	console.log(res);
	// }
	// )

	//Get all the node info and process it first
	let resp = await getAndProcessStreetData(currlat, currlon);
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
			let ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
			markers.push({position: ll, label: labelfunc(item, i)});
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

	// let massnodes = intersections_by_wayId[11562328];
	// let collegenodes = intersections_by_wayId[11570474];
	// let hollandnodes = intersections_by_wayId[11592194];
	// addNodesToMarkers(massnodes, labelNodeInOrder)
	// addNodesToMarkers(collegenodes, labelNodeInOrder)
	// addNodesToMarkers(hollandnodes, labelNodeInOrder)




	// addNodesToMarkers(dovernodes, labelNode);
	// let daynodes = allNodesInRelation[ways_by_Name["Day Street"]];
	// 	addNodesToMarkers(daynodes, labelNode);
	// // console.log(intersections_by_nodeId[5274407769]);
	// console.log(intersections_by_nodeId[71930313]);
	// console.log(ways_by_refNodeId[5274407769]);
	// console.log(ways_by_refNodeId[71930313]);
	// console.log(wayNames_by_Id[11553284])




	let neighbors = {};
	const numtoteststart = 3;
	const numtotestend = 4;

 function getNeighborsForWay(nodeid, wayid) {
	 const ways = ways_by_refNodeId[nodeid].filter(node => node != nodeid);
		var node = GetElementsByAttribute(result, "node", "id", nodeid)[0]
		var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
		markers.push({position: ll, label: "intersection " + nodeid + " " + node.getAttribute("lat") + "," + node.getAttribute("lon")});
		console.log("getting neighbors for " + nodeid + " with streets: " + ways);
	neighbors[nodeid] = findSideNodesOnOtherStreetWithMidpoints(result, allNodesInRelation, intersections_by_nodeId, nodeid, wayid)
	console.log("neighbors for " + nodeid, neighbors[nodeid]);
 }

 if (streetrelationids){
	 streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		 getAllNeighborsForWay(result, intersections_by_nodeId, str, intersections_by_wayId[str], allNodesInRelation)
		 // intersections_by_wayId[str].forEach((item, i) => {
			//  	getNeighborsForWay(item, str);
		 // });
 });
} else {
	Object.keys(intersections_by_wayId).slice(numtoteststart, numtotestend).forEach((way, i) => {
		let newneighbors = getAllNeighborsForWay(result, intersections_by_nodeId, way, intersections_by_wayId[way], allNodesInRelation);
		console.log(newneighbors);
		neighbors = {...neighbors, ...newneighbors};
		console.log(neighbors);
		// intersections_by_wayId[way].forEach((item, j) => {
		// 	 getNeighborsForWay(item, way);
		// });
	});

}

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
// // 			 console.log("getting neighbors for " + item + " with streets: " + ways);
// // 		 // neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, item, ways).map(el => el.filter(e => !!e)).filter( g => g.length > 0);
// // 		 // neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, item, ways);
// // 		 // neighbors[item] = findSideIntersectionsFromNodeAndWay(allNodesInRelation, intersections_by_nodeId, GetElementsByAttribute(result, "node", "id", item)[0], 11553284);
// // 		 // neighbors[item] = findSideIntersectionsOnOtherStreet(intersections_by_wayId, intersections_by_nodeId, item, str);
// // 		 // neighbors[item] = findSideIntersectionsFromNodeAndWayWithMidPoints(result, allNodesInRelation, intersections_by_nodeId, GetElementsByAttribute(result, "node", "id", item)[0], 11553284)
// // //		 neighbors[item] = findSideIntersectionsOnOtherStreetWithMidpoints(result, intersections_by_wayId, intersections_by_nodeId, item, str)
// // 		 neighbors[item] = findSideNodesOnOtherStreetWithMidpoints(result, allNodesInRelation, intersections_by_nodeId, item, str)
// // 		 console.log("neighbors for " + item, neighbors[item]);
// 		});
// 		// console.log(wayNames_by_Id[str] + ": maxlat: ", maxlat, ", maxlon: ", maxlon);
// 	});

	 console.log(neighbors);

// Object.keys(neighbors).map( (key) => {
// 		addNodesToMarkers(neighbors[key], (x,y) => "node " + x + ", " + key + "'s neighbor");
// });
// addVertsToMarkers(midpoints, (x,y) => y)




	 //If I want to try Voronoi
	 // let extrapolygons = processVoronoi(result, streetrelationids, intersections_by_wayId);
	 // Array.prototype.push.apply(polygons, extrapolygons);

	 // addNodesToMarkers(Object.keys(neighbors),labelNode);

	 // Object.keys(neighbors).map( (key) => {
		//  neighbors[key].forEach((item, i) => {
		// 	 		if (item[0]) {
		// 				 var ll2 = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
		// 	  		 markers.push({position: ll2, label: key + "'s neighbor: " + item[0].getAttribute("id")});
		// 			 }
		// 			 if (item[1] && item[1].length>0){
		// 				 var ll3 = new L.LatLng(item[1][0], item[1][1]);
		// 	  		 markers.push({position: ll3, label: key + "'s midpoint: " + item[1][0] + "," + item[1][1]});
		// 			 }
	 //
		//  });
	 //
	 // })

function createPolygonsForWay(wayid){
	for (var i = 0; i < intersections_by_wayId[wayid].length-1; i++){

		//TODO when are these empty and what to do about it
		if (neighbors[intersections_by_wayId[wayid][i]] && neighbors[intersections_by_wayId[wayid][i+1]]){
			var c1 = neighbors[intersections_by_wayId[wayid][i]].map( (corner) => corner[1]);
			var c2 = neighbors[intersections_by_wayId[wayid][i+1]].map( (corner) => corner[1]);
			var test = c1.concat(c2);
			//TODO better filter?
			test = test.filter( (x) => !!x && x.length>0)
			if (test.length > 2){
				var poly = new StreetPolygon(test, wayNames_by_Id[wayid], wayid)
				polygons.push(poly);
			}
		}
	}
}

if (streetrelationids){
	streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		createPolygonsForWay(str);
	})
} else {
	Object.keys(intersections_by_wayId).slice(numtoteststart, numtotestend).forEach((way, i) => {
		createPolygonsForWay(way);
	})
}

	 // streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		//  // for (var i = 0; i < intersections_by_wayId[str].length-1; i++){
		//  //
		// 	//  //TODO when are these empty and what to do about it
		// 	//  if (neighbors[intersections_by_wayId[str][i]] && neighbors[intersections_by_wayId[str][i+1]]){
		// 	// 	 var c1 = neighbors[intersections_by_wayId[str][i]].map( (corner) => corner[1]);
		// 	// 	 var c2 = neighbors[intersections_by_wayId[str][i+1]].map( (corner) => corner[1]);
		// 	// 	 var test = c1.concat(c2);
		// 	// 	 //TODO better filter?
		// 	// 	 test = test.filter( (x) => !!x && x.length>0)
		// 	// 	 if (test.length > 2){
		// 	// 		 var poly = new StreetPolygon(test, wayNames_by_Id[str], str)
		// 	// 		 polygons.push(poly);
		// 	// 	 }
		// 	//  }
		//  // }
	 // })
	 console.log(polygons);

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

			 if (debug){
				 console.log("sides1:");
				 console.log(sides1);
			 }

			 const polygon = []
			 //
			 sides1.forEach((item, i) => {
				 if (item.some(el => !!el)){
					 console.log(item);
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

			 if (debug){
				 console.log("sides2:");
				 console.log(sides2);
			 }


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
			 // console.log("poly:", poly);
			 var testPoly = new StreetPolygon(polygon.map( (coord) => [coord[0]+1,coord[1]+1]), "Test Street", yourWay + 1);
		 }

			 // polygons.push(poly)
			 // polygons.push(testPoly)
			 // storeData(polygons, "polygons");
			 console.log("returning:", polygons, markers);
			 return {polygon: polygons, markers: markers};

		 // },
		 // (error) => {
			//  // this.setState({
			// 	//  isLoaded: true,
			// 	//  error
			//  // });
		 // }
	 // )
}




export const findExistingIntersections = async (location) => {

	console.log("finding intersections");

	if (debug){
		console.log(location);
	}

	var currlat = location.lat;
	var currlon = location.lng;

	var polyshere = await getPolygonsInBounds([(currlon-rad),(currlat-rad),(currlon+rad),(currlat+rad)]);
	if (polyshere && polyshere.length){
		console.log(polyshere);
		// return {polygon: polyshere, markers: polyshere.map( (poly) => poly.corners).flat()};
		return {polygon: polyshere};
	} else {
		return {polygon: []}
	}

}

// export default findExistingIntersections, createNewIntersections;
