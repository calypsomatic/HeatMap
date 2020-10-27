import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import {storeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds} from './storage.js';
import StreetPolygon from './StreetPolygon.js';
import {processVoronoi} from './voronoi-processing.js';
import {getAndProcessStreetData} from './street-data.js';
import {findSideIntersectionsByDistanceWithMidpoints, findSideIntersectionsFromNodeAndWay, findClosestNodeAndIntersection, findSideIntersectionsOnOtherStreet} from './node-processing.js';

const debug = true;
const markers = [];
const polygons = [];

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

// 	let possibledupes = [];
// 	let intnodes = Object.values(intersections_by_nodeId).map((arr) => {
// 		let a = arr.slice();
// 		a.sort();
// 		return a.toString();
// 	});
// 	// intnodes.forEach((item, i) => {
// 	// 	if (intnodes.indexOf(item) != i){
// 	// 		possibledupes.push(item)
// 	// 	}
// 	// });
// 	let count = 0;
// 	for (const [key, value] of Object.entries(intersections_by_nodeId)) {
// 		let a = value.slice();
// 		a.sort();
// 		// if (intnodes.indexOf(a.toString()) != intnodes.lastIndexOf(a.toString())){
// 		if (intnodes.indexOf(a.toString()) != count){
// 			possibledupes.push(key)
// 		}
// 		count++;
// 	}
//
// console.log("possibledupes:");
// console.log(possibledupes)
// addNodesToMarkers(possibledupes, labelNode);






	// addNodesToMarkers(dovernodes, labelNode);
	// let daynodes = allNodesInRelation[ways_by_Name["Day Street"]];
	// 	addNodesToMarkers(daynodes, labelNode);
	// // console.log(intersections_by_nodeId[5274407769]);
	// console.log(intersections_by_nodeId[71930313]);
	// console.log(ways_by_refNodeId[5274407769]);
	// console.log(ways_by_refNodeId[71930313]);
	// console.log(wayNames_by_Id[11553284])




	const neighbors = {};
	const numtoteststart = 0;
	const numtotestend = 1;

	streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		let maxlat = currlat - 0.005;
		let maxlon = currlon - 0.005;
		intersections_by_wayId[str].forEach((item, i) => {
			console.log("intersection " + i +": " + item);
			const ways = ways_by_refNodeId[item].filter(node => node != str);
			 var node = GetElementsByAttribute(result, "node", "id", item)[0]
			 if (parseFloat(node.getAttribute("lat")) > maxlat){
				 maxlat = parseFloat(node.getAttribute("lat"))
			 }
			 if (parseFloat(node.getAttribute("lon")) > maxlon){
				 maxlon = parseFloat(node.getAttribute("lon"))
			 }
			 var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
			 // markers.push({position: ll, label: "intersection " + item + " " + node.getAttribute("lat") + "," + node.getAttribute("lon")});
			 console.log("getting neighbors for " + item + " with streets: " + ways);
		 // neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, item, ways).map(el => el.filter(e => !!e)).filter( g => g.length > 0);
		 neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, item, ways);
		 console.log("neighbors for " + item, neighbors[item]);
		 // neighbors[item] = findSideIntersectionsFromNodeAndWay(allNodesInRelation, intersections_by_nodeId, GetElementsByAttribute(result, "node", "id", item)[0], 11553284);
		 // neighbors[item] = findSideIntersectionsOnOtherStreet(intersections_by_wayId, intersections_by_nodeId, item, str);
		});
		console.log(wayNames_by_Id[str] + ": maxlat: ", maxlat, ", maxlon: ", maxlon);
	});

	 // intersections_by_wayId[testid].forEach((item, i) => {
		//  const ways = ways_by_refNodeId[item].filter(node => node != testid);
		//   var node = GetElementsByAttribute(result, "node", "id", item)[0]
		//   var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
		//   markers.push({position: ll, label: "intersection " + item});
	 // 	neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, item, ways);
		// // neighbors[item] = findSideIntersectionsFromNodeAndWay(allNodesInRelation, intersections_by_nodeId, GetElementsByAttribute(result, "node", "id", item)[0], 11553284);
	 // });

	 console.log(neighbors);

// Object.keys(neighbors).map( (key) => {
// 		addNodesToMarkers(neighbors[key], (x,y) => "node " + x + ", " + key + "'s neighbor");
// });
// addVertsToMarkers(midpoints, (x,y) => y)




	 //If I want to try Voronoi
	 // let extrapolygons = processVoronoi(result, streetrelationids, intersections_by_wayId);
	 // Array.prototype.push.apply(polygons, extrapolygons);

	 // streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		//  for (var i = 0; i < intersections_by_wayId[str].length-1; i++){
	 // 	 // for (var i = 1; i < 2; i++){
		// 	 let node1id = intersections_by_wayId[str][i];
		// 	 let node2id = intersections_by_wayId[str][i+1];
		// 	 console.log("node1: ", node1id, ", node2: ", node2id);
		// 	 let node1 = GetElementsByAttribute(result, "node", "id", node1id)[0];
		// 	 let node2 = GetElementsByAttribute(result, "node", "id", node2id)[0];
		// 	 // let sides1 = getPerpendiculars([parseFloat(node1.getAttribute("lat")), parseFloat(node1.getAttribute("lon"))],[parseFloat(node2.getAttribute("lat")), parseFloat(node2.getAttribute("lon"))]);
		// 	 let sides = getPerpendiculars([parseFloat(node1.getAttribute("lat")), parseFloat(node1.getAttribute("lon"))],[parseFloat(node2.getAttribute("lat")), parseFloat(node2.getAttribute("lon"))]);
		// 	 // sides = sides.map( (num) => [parseFloat(num[0].toPrecision(8)),parseFloat(num[1].toPrecision(8))]);
		// 	 console.log("sides: ", sides);
		// 	 // addCoordsToMarkers(sides, labelByCoords);
		// 	 var poly = new StreetPolygon(sides, wayNames_by_Id[str], str);
		// 	 polygons.push(poly);
		//  }
	 // });

// 	 var poly = new StreetPolygon([currlat,currlon,currlat+0.001,currlon+0.001], 123, 123);
// 	 console.log(poly);
// 	 	 polygons.push(poly);
// console.log(polygons);
	 // console.log(neighbors);

	 //
	 Object.keys(neighbors).map( (key) => {
		 neighbors[key].forEach((item, i) => {
			 		if (item[0]) {
						 var ll2 = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
			  		 // markers.push({position: ll2, label: key + "'s neighbor: " + item[0].getAttribute("id")});
					 }
					 if (item[1]){
						 var ll3 = new L.LatLng(item[1][0], item[1][1]);
			  		 // markers.push({position: ll3, label: key + "'s midpoint: " + item[1][0] + "," + item[1][1]});
					 }

		 });

	 })

	 streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		 // for (var i = 0; i < intersections_by_wayId[str].length-1; i++){
			 for (var i = 0; i < 1; i++){
		// 		// console.log("intersections: ", intersections_by_wayId[str][i], " and ", intersections_by_wayId[str][i+1]);
		// 	 // var c1 = neighbors[bylats[str][i]].map( (corner) => corner[1]);
			 var c1 = neighbors[intersections_by_wayId[str][i]].map( (corner) => corner[1]);
		// 	 console.log(c1);
		// 	 // var c2 = neighbors[bylats[str][i+1]].map( (corner) => corner[1]);
			 var c2 = neighbors[intersections_by_wayId[str][i+1]].map( (corner) => corner[1]);
		// 	 console.log(c2);
		// 	 //TEST:
		// 	 if (c1.length < 2){
		// 		 console.log(str + "," + intersections_by_wayId[str][i] + ": only 1 neighbor in c1");
		// 	 }
		// 	 if (c2.length < 2){
		// 		 console.log(str + "," + intersections_by_wayId[str][i+1] + ": only 1 neighbor in c2");
		// 	 }
	 //
	 //
			 var test = c1.concat(c2);
		// 	 // console.log("four corners: ", test);
		// 	 // test.sort( (a, b) => {return a[0] - b[0];});
		// 	 // console.log("test sorted: ", test);
			 var poly = new StreetPolygon(test, wayNames_by_Id[str], str)
			 // polygons.push(poly);
		 }
	 })

	 // for (var i = 0; i < intersections_by_wayId[testid].length-1; i++){
		//  // for (var i = 0; i < 1; i++){
		// 	console.log("intersections: ", intersections_by_wayId[testid][i], " and ", intersections_by_wayId[testid][i+1]);
		//  var c1 = neighbors[intersections_by_wayId[testid][i]].map( (corner) => corner[1]);
		//  console.log(c1);
		//  var c2 = neighbors[intersections_by_wayId[testid][i+1]].map( (corner) => corner[1]);
		//  console.log(c2);
		//  //TEST:
		//  var test = c1.concat(c2);
		//  console.log("four corners: ", test);
		//  test.sort( (a, b) => {return a[0] - b[0];});
		//  console.log("test sorted: ", test);
		//  var poly = new StreetPolygon(test, wayNames_by_Id[testid], testid)
		//  polygons.push(poly);
	 // }
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
		return {}
	}

}

// export default findExistingIntersections, createNewIntersections;
