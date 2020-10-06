import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import {storeData, getMyObject} from './storage.js';

var debug = true;

const findIntersections = async (location) => {

	console.log("finding intersections");

	if (debug){
		console.log(location);
	}
	var markers = [];


	var currlat = location.lat;
	var currlon = location.lng;
	var rad = 0.002;
	var osmapi = "https://www.openstreetmap.org/api/0.6/"
	var osm =		osmapi + "map?bbox="+(currlon-rad)+","+(currlat-rad)+","+(currlon+rad)+","+(currlat+rad)

	//TODO Deal with errors and such
	var resp = await fetch(osm);
 	var str = await resp.text();
	var result = new window.DOMParser().parseFromString(str, "text/xml");

 	if (debug){
		 	console.log(result);
	}
	var streetrelationids = getElementsValueByXPath('//relation/tag[@k="type" and @v="street"]/../@id', result);

	if (debug){
		console.log("streetrelationids: ", streetrelationids);
	}

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

	 if (debug){
		 console.log(relationmemberids);
	 }

	 getMyObject("relationmemberids").then(res => {
 			if (res != null){
 				relationmemberids = Object.assign(res, relationmemberids);
 			}
			//TODO make this merge data?
 			storeData(relationmemberids, "relationmemberids");
 	});

	 let removeDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) === index);

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
					 if (debug){
					 	console.log("Found two different names: " + wayNames_by_Id[key] + " and " + maybename[0])
					}
				 }
				 if (!ways_by_Name[maybename[0]]){
					 ways_by_Name[maybename[0]] = [key];
				 } else if (!ways_by_Name[maybename[0]].includes(key)){
					 if (debug){
					 	console.log("Found two different keys for " + maybename[0]);
					}
					 ways_by_Name[maybename[0]].push(key);
				 }
			 }
			 allnodes = allnodes.concat(refnodes);
			 allnodes = removeDuplicates(allnodes);
		 });
		 allNodesInRelation[key] = allnodes;
	 }

	 if (debug){
		 console.log("ways_by_Name:");
		 console.log(ways_by_Name);
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

	 if (debug){
		 console.log("allNodesInRelation:");
		 console.log(allNodesInRelation);
		 console.log("ways_by_refNodeId:");
		 console.log(ways_by_refNodeId);
	 }

	 //intersections_by_nodeId's keys are all the nodes that are intersections, and the values are an array of which streets meet it
	 var intersections_by_nodeId = Object.fromEntries(Object.entries(ways_by_refNodeId).filter(([k,v]) => v.length>1));
	 if (debug){
		 console.log("intersections_by_nodeId:");
		 console.log(intersections_by_nodeId);
	 }

	 //We need this to preserve order from nodes_by_wayId
	 for (const [key, value] of Object.entries(allNodesInRelation)) {
		 var wayixs = value.filter(node => node in intersections_by_nodeId);
		 intersections_by_wayId[key] = wayixs;
	 }

	 if (debug){
		 console.log("intersections_by_wayId:");
		 console.log(intersections_by_wayId);
		 console.log("wayNames_by_Id:");
		 console.log(wayNames_by_Id);
	 }

	 var allNodes = Object.values(allNodesInRelation).flat();

	 if (debug){
		 console.log("allNodes:");
		 console.log(allNodes);
	 }

	 //returns [closestNode, closestIntersectionNode]
	 function findClosestNodeAndIntersection(latlong)
	 {
		 //Let's try to find out which street you are on and what the closest intersection is
		 var minStreet = 100000;
		 var minStreetNode = null;
		 var minIsx = 1000000;
		 var minIsxNode = null;

		 allNodes.forEach((x, i) => {
			 var node = GetElementsByAttribute(result, "node", "id", x)[0];

			 // var dist = new Decimal(node.getAttribute("lat")-latlong.lat).toPower(2).plus(new Decimal(node.getAttribute("lon")-latlong.lng).toPower(2)).sqrt();
			 var dist = Math.sqrt(Math.pow(parseFloat(node.getAttribute("lat"))-parseFloat(latlong.lat),2) + Math.pow(parseFloat(node.getAttribute("lon"))-parseFloat(latlong.lng),2));
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
	 }

	 var nodeandIx = findClosestNodeAndIntersection(location);

	 if (debug){
		 console.log("nodeandIx:");
		 console.log(nodeandIx);
	 }

	 var minStreetNode = nodeandIx[0];
	 var minIsxNode = nodeandIx[1];

	 //Let's find the streets you are at the intersection of
	 var intersectionNodes = ways_by_refNodeId[minIsxNode.getAttribute("id")];

	 if (debug){
		 console.log("intersectionNodes:");
	 	console.log(intersectionNodes);
	}

	 function findSideIntersectionsFromNodeAndWay(anyNode, wayNode)
	 {
		 var waynodes = allNodesInRelation[wayNode];
		 var idx = waynodes.indexOf(anyNode.getAttribute("id"));
		 var forward = waynodes.slice(idx+1).concat(waynodes.slice(0,idx)).find(function(el, i){
			 return el in intersections_by_nodeId;
		 })
		 var backward = waynodes.slice(0, idx).reverse().concat(waynodes.slice(idx+1).reverse()).find(function(el, i){
			 return el in intersections_by_nodeId;
		 })
		 return [forward, backward];
	 }

		 //You know what, screw it, let's just use friggin' distance I guess
		 //TODO What if two closest intersections are in the same direction?
		 // function findSideIntersectionsByDistanceWithMidpoints(isxId, wayId){
			//  var isxNode = GetElementsByAttribute(result, "node", "id", isxId)[0];
			//  var streetIx = intersections_by_wayId[wayId].filter(node => node != isxId);
			//  var minSide1 = 100000;
			//  var minIsx1 = null;
			//  var mp1 = null
			//  var minSide2 = 1000000;
			//  var minIsx2= null;
			//  var mp2 = null;
		 //
			//  var isxNodeLat = parseFloat(isxNode.getAttribute("lat"));
			//  var isxNodeLon = parseFloat(isxNode.getAttribute("lon"));
		 //
			//  streetIx.forEach((x, i) => {
			// 	 var node = GetElementsByAttribute(result, "node", "id", x)[0];
		 //
			// 	 // var dist = new Decimal(node.getAttribute("lat")-isxNode.getAttribute("lat")).toPower(2).plus(new Decimal(node.getAttribute("lon")-isxNode.getAttribute("lon")).toPower(2)).sqrt();
			// 	 var dist = Math.sqrt(Math.pow(parseFloat(node.getAttribute("lat"))-isxNodeLat,2) + Math.pow(parseFloat(node.getAttribute("lon"))-isxNodeLon,2));
			// 	 if (dist < minSide1){
			// 		 minSide2 = minSide1;
			// 		 minIsx2 = minIsx1;
			// 		 mp2 = mp1;
			// 		 minSide1 = dist;
			// 		 minIsx1 = node;
			// 		 mp1 = [(parseFloat(node.getAttribute("lat")) + isxNodeLat)/2.0, (parseFloat(node.getAttribute("lon")) + isxNodeLon)/2.0]
			// 		 // mp1 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
			// 	 }
			// 	 else if (dist < minSide2){
			// 		 minSide2 = dist;
			// 		 minIsx2 = node;
			// 		 // mp2 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
			// 		 mp2 = [(parseFloat(node.getAttribute("lat")) + parseFloat(isxNode.getAttribute("lat")))/2.0, (parseFloat(node.getAttribute("lon")) + parseFloat(isxNode.getAttribute("lon")))/2.0]
			// 	 }
			//  });
			//  return [[minIsx1, mp1], [minIsx2, mp2]]
		 // }


		 function findSideIntersectionsByDistanceWithMidpoints(isxId, wayId){
			 var isxNode = GetElementsByAttribute(result, "node", "id", isxId)[0];
			 var streetIx = intersections_by_wayId[wayId].filter(node => node != isxId);
			 var minSide1 = 100000;
			 var minIsx1 = null;
			 var mp1 = null
			 var minSide2 = 1000000;
			 var minIsx2= null;
			 var mp2 = null;

			 var minSign = null;
			 var isxNodeLat = parseFloat(isxNode.getAttribute("lat"));
			 var isxNodeLon = parseFloat(isxNode.getAttribute("lon"));

			 streetIx.forEach((x, i) => {
				 var node = GetElementsByAttribute(result, "node", "id", x)[0];

				 // var dist = new Decimal(node.getAttribute("lat")-isxNode.getAttribute("lat")).toPower(2).plus(new Decimal(node.getAttribute("lon")-isxNode.getAttribute("lon")).toPower(2)).sqrt();
				 var nodeLat = parseFloat(node.getAttribute("lat"));
				 var nodeLon = parseFloat(node.getAttribute("lon"));
				 var dist = Math.sqrt(Math.pow(nodeLat-isxNodeLat,2) + Math.pow(nodeLon-isxNodeLon,2));
				 if ((!minIsx1 || (Math.sign(isxNodeLat-nodeLat) == minSign)) && dist < minSide1){
					 minSide1 = dist;
					 minIsx1 = node;
					 minSign = Math.sign(isxNodeLat-nodeLat);
					 mp1 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
					 // mp1 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
				 }
				 else if ((!minIsx2 || (Math.sign(isxNodeLat-nodeLat) == minSign)) && dist < minSide2){
					 minSide2 = dist;
					 minIsx2 = node;
					 // mp2 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
					 mp2 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
				 }
			 });
			 return [[minIsx1, mp1], [minIsx2, mp2]]
		 }


		 //TODO good chance this won't always work
		 var yourWay = ways_by_refNodeId[minStreetNode.getAttribute("id")][0]
		 var sides = findSideIntersectionsFromNodeAndWay(minStreetNode, yourWay);

		 if (debug){
		 	console.log("sides:");
		 	console.log(sides);
		}

	 sides.forEach((item, i) => {
			if (item){
				var node = GetElementsByAttribute(result, "node", "id", item)[0]
				var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
				markers.push({position: ll, label: node.getAttribute("id")});
			}
	 });

			 //Now for each intersection aside you, find their sides:
			 //TODO clean up this whole mess
			 var sides1way = ways_by_refNodeId[sides[0]].filter(node => node != yourWay)[0];
			 // var streetIx = intersections_by_wayId[sides1way].filter(node => node != sides[0]);
			 // streetIx.forEach((item, i) => {
				//  var node = GetElementsByAttribute(result, "node", "id", item)[0]
				//  var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
				//  markers.push({position: ll, label: "street: " + sides1way + " node: " + node.getAttribute("id")});
			 // });

			 var sides1 = findSideIntersectionsByDistanceWithMidpoints(sides[0], sides1way);

			 if (debug){
				 console.log("sides1:");
				 console.log(sides1);
			 }
			 //
			 sides1.forEach((item, i) => {
			     var ll = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
					 markers.push({position: ll, label: item[0].getAttribute("id")});
			 });
			 // //
			 var sides2way = ways_by_refNodeId[sides[1]].filter(node => node != yourWay)[0];

			 var streetIx = intersections_by_wayId[sides2way].filter(node => node != sides[1]);
			 // streetIx.forEach((item, i) => {
				//  var node = GetElementsByAttribute(result, "node", "id", item)[0]
				//  var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
				//  markers.push({position: ll, label: "street: " + sides2way + " node: " + node.getAttribute("id")});
			 // });
			 var sides2 = findSideIntersectionsByDistanceWithMidpoints(sides[1], sides2way);

			 if (debug){
				 console.log("sides2:");
				 console.log(sides2);
			 }
			 //
			 //
			 sides2.forEach((item, i) => {
			     var ll = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
					 markers.push({position: ll, label: item[0].getAttribute("id")});
			 });


			 if (debug){
				 console.log("[sides1[0][1][0]: " + sides1[0][1][0]);
				 console.log("sides1[0][1][1]]: " + sides1[0][1][1]);
				 console.log("sides1[1][1][0]]: " + sides1[1][1][0]);
				 console.log("sides1[1][1][1]]: " + sides1[1][1][1]);
				 console.log("sides2[1][1][0]]: " + sides2[1][1][0]);
				 console.log("sides2[1][1][1]]: " + sides2[1][1][1]);
				 console.log("sides2[0][1][0]]: " + sides2[0][1][0]);
				 console.log("sides2[0][1][1]]: " + sides2[0][1][1]);
			 }

			 var polygon = [
					 [sides1[0][1][0], sides1[0][1][1]],
					 [sides1[1][1][0], sides1[1][1][1]],
					 [sides2[0][1][0], sides2[0][1][1]],
					 [sides2[1][1][0], sides2[1][1][1]]
			 ];

			 // return polygon;
			 return {polygon: polygon, markers: markers};

		 // },
		 // (error) => {
			//  // this.setState({
			// 	//  isLoaded: true,
			// 	//  error
			//  // });
		 // }
	 // )
}

export default findIntersections;
