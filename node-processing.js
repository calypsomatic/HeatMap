import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import StreetPolygon from './StreetPolygon.js';

const debug = false;
var logger = debug ? console.log.bind(console) : function () {};
var group = debug ? console.group.bind(console) : function () {};
var groupEnd = debug ? console.groupEnd.bind(console) : function () {};

export function getAllNeighborsForWay(result, intersections_by_nodeId, wayid, way_intersections, nodes_by_wayId){
 group("getAllNeighborsForWay");
	 let neighbors = {}
	 neighbors[way_intersections[0]] = findSideNodesOnOtherStreetWithMidpoints(result, nodes_by_wayId, intersections_by_nodeId, way_intersections[0], wayid);
	 if (way_intersections.length < 2){
		 var idx = nodes_by_wayId[wayid].indexOf(way_intersections[0]);
		 if (idx == nodes_by_wayId[wayid].length - 1){
			 idx = -1;
		 }
		 let perp = getBothPerpendiculars(nodeIdToCoords(result, way_intersections[0]), nodeIdToCoords(result, nodes_by_wayId[wayid][idx+1]));
		 neighbors[nodes_by_wayId[wayid][idx+1]] = [[null,perp[0]],[null,perp[1]]];
	 }
	 for (let i = 1; i < way_intersections.length; i++){
		 let perps = getBothPerpendiculars(nodeIdToCoords(result, way_intersections[i]), nodeIdToCoords(result, way_intersections[i-i]));
		 neighbors[way_intersections[i]] = [[null,perps[0]],[null,perps[1]]];
	 }
	 return neighbors;
	 groupEnd();
 }

export function findSideNodesOnOtherStreetWithMidpoints(result, nodes_by_wayId, intersections_by_nodeId, nodeid, wayid){
		 group("findSideIntersectionsFromNodeAndWayWithMidPoints");
     if (intersections_by_nodeId[nodeid] && intersections_by_nodeId[nodeid].length){
  		 let otherStreets = intersections_by_nodeId[nodeid].filter(way => way != wayid);
  		 //this is probably a really dumb idea
  		 let streetNodes = nodes_by_wayId[otherStreets[0]]
  		 if (otherStreets.length > 1){
  		 	for (let i = 1; i < otherStreets.length; i++){
  		 		let moreNodes = nodes_by_wayId[otherStreets[i]]
  		 		streetNodes = merge(streetNodes,moreNodes);
  		 	}
  		 }

  		 //TODO What to do here
  		 if (streetNodes && streetNodes.length < 2){
  		 	return [[null,[]],[null,[]]]
  		 }

  		 var idx = streetNodes.indexOf(nodeid);
  		 let resp = [];
  		 let anyNode = GetElementsByAttribute(result, "node", "id", nodeid)[0];
  		 if (idx > 0){
  		 	var forNode = GetElementsByAttribute(result, "node", "id", streetNodes[idx-1])[0];
  //		 	var formp = [(parseFloat(anyNode.getAttribute("lat")) + parseFloat(forNode.getAttribute("lat")))/2.0, (parseFloat(anyNode.getAttribute("lon")) + parseFloat(forNode.getAttribute("lon")))/2.0]
  			var formp = extendMidpoint(nodeToCoords(anyNode), nodeToCoords(forNode), 0);
  		 	resp.push([forNode,formp])
  		 } else {
  		 	resp.push(null)
  		 }
  		 if (idx < streetNodes.length - 1){
  		 	var backNode = GetElementsByAttribute(result, "node", "id", streetNodes[idx+1])[0];
  //		 	var backmp = [(parseFloat(anyNode.getAttribute("lat")) + parseFloat(backNode.getAttribute("lat")))/2.0, (parseFloat(anyNode.getAttribute("lon")) + parseFloat(backNode.getAttribute("lon")))/2.0]
  			var backmp = extendMidpoint(nodeToCoords(anyNode), nodeToCoords(backNode), 0);
  		 	resp.push([backNode,backmp]);
  		 } else {
  		 			resp.push([null,extendMidpoint(
  		 					[parseFloat(anyNode.getAttribute("lat")), parseFloat(anyNode.getAttribute("lon"))],
  		 					formp)])
  		 }
  		 if (!resp[0]){
  		 	resp[0] = [null,extendMidpoint(
  		 			[parseFloat(anyNode.getAttribute("lat")), parseFloat(anyNode.getAttribute("lon"))],
  		 			backmp)]
  		 }
  		 return resp;
     }
		 groupEnd();
	 }

//////////HELPER FUNCTIONS/////////
function getMidPoint(node1, node2){
		 return calculateMidpoint(node1, node2, 0)
}

function extendMidpoint(node1, node2){
		 return calculateMidpoint(node1, node2, 1);
}

function calculateMidpoint(node1, node2, sign){
	 const dist = sign == 0 ? 0.0005 : -0.0005;
	 const linevector = [node2[0]-node1[0], node2[1]-node1[1]];
	 const lvsize = Math.sqrt(linevector[0]*linevector[0] + linevector[1]*linevector[1]);
	 const lvnormal = [linevector[0]/lvsize,linevector[1]/lvsize];
	 return [node1[0]+dist*lvnormal[0],node1[1]+dist*lvnormal[1]];
}

function nodeIdToCoords(result, nodeid){
var node = GetElementsByAttribute(result, "node", "id", nodeid)[0];
return nodeToCoords(node);
}

function nodeToCoords(node){
return[parseFloat(node.getAttribute("lat")),parseFloat(node.getAttribute("lon"))];
}

function getBothPerpendiculars(node1, node2){
const d = 0.0005; //TODO figure this out
const linevector = [node2[1]-node1[1], node1[0]-node2[0]];
const lvsize = Math.sqrt(linevector[0]*linevector[0] + linevector[1]*linevector[1]);
const lvnormal = [linevector[0]/lvsize,linevector[1]/lvsize];
return [[node1[0]+d*lvnormal[0],node1[1]+d*lvnormal[1]], [node1[0]-d*lvnormal[0],node1[1]-d*lvnormal[1]]];
}

function getPerpendiculars(node1, node2, side){
//		 logger("getting perps for ", node1, node2);
	// addCoordsToMarkers([node1,node2], (x,y) => "node " + y);
	const d = 0.0005; //TODO figure this out
	// const linevector = [node2[0]-node1[0], node2[1]-node1[1]];
	const linevector = [node2[1]-node1[1], node1[0]-node2[0]];
	const lvsize = Math.sqrt(linevector[0]*linevector[0] + linevector[1]*linevector[1]);
	const lvnormal = [linevector[0]/lvsize,linevector[1]/lvsize];
let coord = side == 0 ? [node1[0]+d*lvnormal[0],node1[1]+d*lvnormal[1]] : [node1[0]-d*lvnormal[0],node1[1]-d*lvnormal[1]]
	return coord;
}

//merges two arrays, keeping order as best as possible
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

////////CURRENTLY UNUSED ATTEMPTS////////

//returns [closestNode, closestIntersectionNode]
//currently not used
export function findClosestNodeAndIntersection(result, allNodes, intersections_by_nodeId, lat, lng)
	 {
		 group("findClosestNodeAndIntersection");
		 //Let's try to find out which street you are on and what the closest intersection is
		 var minStreet = 100000;
		 var minStreetNode = null;
		 var minIsx = 1000000;
		 var minIsxNode = null;

		 allNodes.forEach((x, i) => {
			 var node = GetElementsByAttribute(result, "node", "id", x)[0];

			 // var dist = new Decimal(node.getAttribute("lat")-latlong.lat).toPower(2).plus(new Decimal(node.getAttribute("lon")-latlong.lng).toPower(2)).sqrt();
			 var dist = Math.sqrt(Math.pow(parseFloat(node.getAttribute("lat"))-parseFloat(lat),2) + Math.pow(parseFloat(node.getAttribute("lon"))-parseFloat(lng),2));
			 if (dist < minStreet){
				 minStreet = dist;
				 minStreetNode = node;
			 }
			 if (intersections_by_nodeId[x] && dist < minIsx){
				 minIsx = dist;
				 minIsxNode = node;
			 }
		 });

			 return [minStreetNode, minIsxNode];
			 groupEnd();
	 }

//curently not used
export function findSideIntersectionsFromNodeAndWay(allNodesInRelation, intersections_by_nodeId, anyNode, wayNode)
	 {
		 group("findSideIntersectionsFromNodeAndWay");
		 var waynodes = allNodesInRelation[wayNode];
		 var idx = waynodes.indexOf(anyNode.getAttribute("id"));
		 var forward = waynodes.slice(idx+1).concat(waynodes.slice(0,idx)).find(function(el, i){
			 return el in intersections_by_nodeId;
		 })
		 var backward = waynodes.slice(0, idx).reverse().concat(waynodes.slice(idx+1).reverse()).find(function(el, i){
			 return el in intersections_by_nodeId;
		 })
		 return [forward, backward];
		 groupEnd();
	 }

//currently not used
export function findSideIntersectionsFromNodeAndWayWithMidPoints(result, allNodesInRelation, intersections_by_nodeId, anyNode, wayNode)
 	 {
		 group("findSideIntersectionsFromNodeAndWayWithMidPoints");
 		 var waynodes = allNodesInRelation[wayNode];
 		 var idx = waynodes.indexOf(anyNode.getAttribute("id"));
 		 var forward = waynodes.slice(idx+1).concat(waynodes.slice(0,idx)).find(function(el, i){
 			 return el in intersections_by_nodeId;
 		 })
 		 var backward = waynodes.slice(0, idx).reverse().concat(waynodes.slice(idx+1).reverse()).find(function(el, i){
 			 return el in intersections_by_nodeId;
 		 })
		 let forNode = GetElementsByAttribute(result, "node", "id", forward)[0];
		 let formp = [(parseFloat(anyNode.getAttribute("lat")) + parseFloat(forNode.getAttribute("lon")))/2.0, (parseFloat(anyNode.getAttribute("lon")) + parseFloat(forNode.getAttribute("lon")))/2.0]
		 let backNode = GetElementsByAttribute(result, "node", "id", backward)[0];
		 let backmp = [(parseFloat(anyNode.getAttribute("lat")) + parseFloat(backNode.getAttribute("lon")))/2.0, (parseFloat(anyNode.getAttribute("lon")) + parseFloat(backNode.getAttribute("lon")))/2.0]
 		 return [[forNode, formp], [backNode, backmp]];
		 groupEnd();
 	 }


//currently not used
export function findSideIntersectionsOnOtherStreetWithMidpoints(result, intersections_by_wayId, intersections_by_nodeId, nodeid, wayid)
		 {
			 group("findSideIntersectionsOnOtherStreetWithMidpoints");
			 let otherStreets = intersections_by_nodeId[nodeid].filter(way => way != wayid);
			 //this is probably a really dumb idea
			 let streetIntersections = intersections_by_wayId[otherStreets[0]]
			 if (otherStreets.length > 1){
				 for (let i = 1; i < otherStreets.length; i++){
					 let moreIntersections = intersections_by_wayId[otherStreets[i]]
					 streetIntersections = merge(streetIntersections,moreIntersections);
				 }
			 }

			 //TODO What to do here
			 if (streetIntersections.length < 2){
				 return [[null,[]],[null,[]]]
			 }

			 var idx = streetIntersections.indexOf(nodeid);
			 let resp = [];
			 let anyNode = GetElementsByAttribute(result, "node", "id", nodeid)[0];
			 if (idx > 0){
				 var forNode = GetElementsByAttribute(result, "node", "id", streetIntersections[idx-1])[0];
				 var formp = [(parseFloat(anyNode.getAttribute("lat")) + parseFloat(forNode.getAttribute("lat")))/2.0, (parseFloat(anyNode.getAttribute("lon")) + parseFloat(forNode.getAttribute("lon")))/2.0]
				 resp.push([forNode,formp])
			 } else {
				 resp.push(null)
			 }
			 if (idx < streetIntersections.length - 1){
				 var backNode = GetElementsByAttribute(result, "node", "id", streetIntersections[idx+1])[0];
				 var backmp = [(parseFloat(anyNode.getAttribute("lat")) + parseFloat(backNode.getAttribute("lat")))/2.0, (parseFloat(anyNode.getAttribute("lon")) + parseFloat(backNode.getAttribute("lon")))/2.0]
				 resp.push([backNode,backmp]);
			 } else {
						 resp.push([null,extendMidpoint(
								 [parseFloat(anyNode.getAttribute("lat")), parseFloat(anyNode.getAttribute("lon"))],
								 formp)])
			 }
			 if (!resp[0]){
				 resp[0] = [null,extendMidpoint(
						 [parseFloat(anyNode.getAttribute("lat")), parseFloat(anyNode.getAttribute("lon"))],
						 backmp)]
			 }
			 return resp;
			 groupEnd();
		 }

//currently not used
export function findSideIntersectionsOnOtherStreet(intersections_by_wayId, intersections_by_nodeId, nodeid, wayid)
	 	 {
			 group("findSideIntersectionsOnOtherStreet");
			 let otherStreets = intersections_by_nodeId[nodeid].filter(way => way != wayid);
			 //this is probably a really dumb idea
			 let streetIntersections = intersections_by_wayId[otherStreets[0]]
			 if (otherStreets.length > 1){
				 for (let i = 1; i < otherStreets.length; i++){
					 let moreIntersections = intersections_by_wayId[otherStreets[i]]
					 streetIntersections = merge(streetIntersections,moreIntersections);
				 }
			 }
//			 let streetIntersections = otherStreets.map((wid) => intersections_by_wayId[wid]).flat();
	 		 var idx = streetIntersections.indexOf(nodeid);
			 let result = [];
			 if (idx > 0){
				 result.push(streetIntersections[idx-1])
			 }
			 if (idx < streetIntersections.length - 1){
				 result.push(streetIntersections[idx+1]);
			 }
			 return result;
			 groupEnd();
	 	 }

//TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
//currently not used
export function findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, isxId, wayIds){
	group("findSideIntersectionsByDistanceWithMidpoints");
		 var isxNode = GetElementsByAttribute(result, "node", "id", isxId)[0];
		 // var streetIx = wayIds.map((wid) => intersections_by_wayId[wid]).flat();
		 var streetIx = wayIds.map((wid) => intersections_by_wayId[wid]).flat().filter(node => node != isxId);
		 var minSide1 = 100000;
		 var minIsx1 = null;
		 var mp1 = null
		 var minSide2 = 1000000;
		 var minIsx2= null;
		 var mp2 = null;

		 var latSign = null;
		 var lonSign = null;
		 var isxNodeLat = parseFloat(isxNode.getAttribute("lat"));
		 var isxNodeLon = parseFloat(isxNode.getAttribute("lon"));

		 streetIx.forEach((x, i) => {
			 var node = GetElementsByAttribute(result, "node", "id", x)[0];

			 // var dist = new Decimal(node.getAttribute("lat")-isxNode.getAttribute("lat")).toPower(2).plus(new Decimal(node.getAttribute("lon")-isxNode.getAttribute("lon")).toPower(2)).sqrt();
			 var nodeLat = parseFloat(node.getAttribute("lat"));
			 var nodeLon = parseFloat(node.getAttribute("lon"));
			 var dist = Math.sqrt(Math.pow(nodeLat-isxNodeLat,2) + Math.pow(nodeLon-isxNodeLon,2));
			 if ((!minIsx1 || (Math.sign(isxNodeLat-nodeLat) == latSign && Math.sign(isxNodeLat-nodeLat) == lonSign)) && dist < minSide1){
				 minSide1 = dist;
				 minIsx1 = node;
				 latSign = Math.sign(isxNodeLat-nodeLat);
				 lonSign = Math.sign(isxNodeLon-nodeLon);
				 mp1 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
				 // mp1 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
			 }
			 // else if ((!minIsx2 || (Math.sign(isxNodeLat-nodeLat) == minSign)) && dist < minSide2){
			 else if (Math.sign(isxNodeLat-nodeLat) != latSign && Math.sign(isxNodeLon-nodeLon) != lonSign && (!minIsx2 || dist < minSide2)){
				 minSide2 = dist;
				 minIsx2 = node;
				 // mp2 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
				 mp2 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
			 }
		 });

		 if (!mp1 || !mp2){
			 if (!mp1){
				 mp1 = getPerpendiculars([isxNodeLat, isxNodeLon], mp2,0)
			 } else {
				 mp2 = getPerpendiculars([isxNodeLat, isxNodeLon], mp1,0)
			 }
		 }
		 let v = [[minIsx1, mp1], [minIsx2, mp2]];
		 return v;
		 groupEnd();
	 }
