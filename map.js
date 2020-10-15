import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import {storeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds} from './storage.js';
import StreetPolygon from './StreetPolygon.js';

const debug = true;
const markers = [];
const polygons = [];

//Not sure if this will want to be changed, or when
const rad = 0.002;

export const createNewIntersections = async (location) => {

	console.log("createNewIntersections");

	var currlat = location.lat;
	var currlon = location.lng;

	var osmapi = "https://www.openstreetmap.org/api/0.6/"
	var osm =		osmapi + "map?bbox="+(currlon-rad)+","+(currlat-rad)+","+(currlon+rad)+","+(currlat+rad)

	//TODO Deal with errors and such
	var resp = await fetch(osm);
 	var str = await resp.text();
	// console.log(str);
	var result = new window.DOMParser().parseFromString(str, "text/xml");

 	if (debug){
		 	console.log(result);
	}
	var streetrelationids = getElementsValueByXPath('//relation/tag[@k="type" and @v="street"]/../@id', result);

	if (debug){
		console.log("streetrelationids: ", streetrelationids);
	}

	///JUST A TEST
	getPolygonsByMultipleStreetIds(streetrelationids).then( (res) =>{
		console.log(res);
	}
	)

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

	//  getMyObject("relationmemberids").then(res => {
 	// 		if (res != null){
 	// 			relationmemberids = Object.assign(res, relationmemberids);
 	// 		}
	// 		//TODO make this merge data?
 	// 		storeData(relationmemberids, "relationmemberids");
 	// });

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

	 // allNodesInRelation[11553284].forEach((item, i) => {
	 // 		var node = GetElementsByAttribute(result, "node", "id", item)[0];
		// 	var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
		// 	markers.push({position: ll, label: "all nodes: " + i});
	 // });




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

	 const testid = 11559511;

	 const neighbors = {};
	 const numtoteststart = 2;
	 const numtotestend = 3;
	 var bylats = {}

	streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		// var bylat = intersections_by_wayId[str].sort( (a,b) => {
		// 	console.log(a + ": " + GetElementsByAttribute(result, "node", "id", a)[0].getAttribute("lat"));
		// 	console.log(b + ": " + GetElementsByAttribute(result, "node", "id", b)[0].getAttribute("lat"));
		// 	return GetElementsByAttribute(result, "node", "id", a)[0].getAttribute("lat") - GetElementsByAttribute(result, "node", "id", b)[0].getAttribute("lat");
		// })
		// var bylon = intersections_by_wayId[str].sort( (a,b) => {return a[1] - b[1]})
		// if (bylat[0] == bylon[0]){
		// 	//use either one
		// } else {
		//
		// }
		// bylats[str] = bylat;
		// bylat.forEach((item, i) => {

		intersections_by_wayId[str].forEach((item, i) => {
			console.log("intersection " + i +": " + item);
			const ways = ways_by_refNodeId[item].filter(node => node != str);
			 var node = GetElementsByAttribute(result, "node", "id", item)[0]
			 var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
			 markers.push({position: ll, label: "intersection " + item});
			 console.log("getting neighbors for " + item + " with streets: " + ways);
		 neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(item, ways).map(el => el.filter(e => !!e)).filter( g => g.length > 0);
		 // neighbors[item] = findSideIntersectionsFromNodeAndWay(GetElementsByAttribute(result, "node", "id", item)[0], 11553284);
		});
	});

// console.log("bylats: ", bylats);

	 // intersections_by_wayId[testid].forEach((item, i) => {
		//  const ways = ways_by_refNodeId[item].filter(node => node != testid);
		//   var node = GetElementsByAttribute(result, "node", "id", item)[0]
		//   var ll = new L.LatLng(node.getAttribute("lat"), node.getAttribute("lon"));
		//   markers.push({position: ll, label: "intersection " + item});
	 // 	neighbors[item] = findSideIntersectionsByDistanceWithMidpoints(item, ways);
		// // neighbors[item] = findSideIntersectionsFromNodeAndWay(GetElementsByAttribute(result, "node", "id", item)[0], 11553284);
	 // });

	 console.log(neighbors);


	 Object.keys(neighbors).map( (key) => {
		 if (key == 71950805){
			 neighbors[key].forEach((item, i) => {
				 console.log(item);
				 if (item){
					 // var node2 = GetElementsByAttribute(result, "node", "id", item)[0];
					 if (item[0]){
						 var ll2 = new L.LatLng(item[0].getAttribute("lat"), item[0].getAttribute("lon"));
			  		 markers.push({position: ll2, label: key + "'s neighbor: " + item[0].getAttribute("id")});
					 }
					 if (item[1]){
						 var ll3 = new L.LatLng(item[1][0], item[1][1]);
			  		 markers.push({position: ll3, label: key + "'s midpoint: " + item[1][0] + "," + item[1][1]});
					 }
				 }
			 });

		 }

	 })

	 streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		 // for (var i = 0; i < intersections_by_wayId[str].length-1; i++){
			 for (var i = 1; i < 2; i++){
				// console.log("intersections: ", intersections_by_wayId[str][i], " and ", intersections_by_wayId[str][i+1]);
			 // var c1 = neighbors[bylats[str][i]].map( (corner) => corner[1]);
			 var c1 = neighbors[intersections_by_wayId[str][i]].map( (corner) => corner[1]);
			 console.log(c1);
			 // var c2 = neighbors[bylats[str][i+1]].map( (corner) => corner[1]);
			 var c2 = neighbors[intersections_by_wayId[str][i+1]].map( (corner) => corner[1]);
			 console.log(c2);
			 //TEST:
			 if (c1.length < 2){
				 console.log(str + "," + intersections_by_wayId[str][i] + ": only 1 neighbor in c1");
			 }
			 if (c2.length < 2){
				 console.log(str + "," + intersections_by_wayId[str][i+1] + ": only 1 neighbor in c2");
			 }


			 var test = c1.concat(c2);
			 // console.log("four corners: ", test);
			 // test.sort( (a, b) => {return a[0] - b[0];});
			 // console.log("test sorted: ", test);
			 var poly = new StreetPolygon(test, wayNames_by_Id[str], str)
			 polygons.push(poly);
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









	 //returns [closestNode, closestIntersectionNode]
	 function findClosestNodeAndIntersection(lat, lng)
	 {
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
	 }

	 var nodeandIx = findClosestNodeAndIntersection(currlat, currlon);

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

		 //TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
		 function findSideIntersectionsByDistanceWithMidpoints(isxId, wayIds){
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

			 //TODO: instead of this, maybe just extend a line from the existing neighbor halfway to next road?

			 // if (!mp1) {
				//  allNodes.filter(node => node != isxId).forEach((x, i) => {
				// 	 var node = GetElementsByAttribute(result, "node", "id", x)[0];
				// 	 var nodeLat = parseFloat(node.getAttribute("lat"));
				// 	 var nodeLon = parseFloat(node.getAttribute("lon"));
			 //
				// 	 if (Math.sign(isxNodeLat-nodeLat) != latSign && Math.sign(isxNodeLon-nodeLon) != lonSign){
				// 		 var dist = Math.sqrt(Math.pow(nodeLat-isxNodeLat,2) + Math.pow(nodeLon-isxNodeLon,2));
				// 		 if (dist < minSide1){
				// 			 minSide1 = dist;
				// 			 minIsx1 = node;
				// 			 latSign = Math.sign(isxNodeLat-nodeLat);
				// 			 lonSign = Math.sign(isxNodeLon-nodeLon);
				// 			 mp1 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
				// 		 }
				// 	 }
				// })
			 // }
			 // if (!mp2) {
				//  allNodes.filter(node => node != isxId).forEach((x, i) => {
				// 	 var node = GetElementsByAttribute(result, "node", "id", x)[0];
				// 	 var nodeLat = parseFloat(node.getAttribute("lat"));
				// 	 var nodeLon = parseFloat(node.getAttribute("lon"));
			 //
				// 	 if (Math.sign(isxNodeLat-nodeLat) != latSign && Math.sign(isxNodeLon-nodeLon) != lonSign){
				// 		 var dist = Math.sqrt(Math.pow(nodeLat-isxNodeLat,2) + Math.pow(nodeLon-isxNodeLon,2));
				// 		 if (dist < minSide2){
				// 			 minSide2 = dist;
				// 			 minIsx2 = node;
				// 			 mp2 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
				// 		 }
				// 	 }
				// })
			 // }
			 return [[minIsx1, mp1], [minIsx2, mp2]]
		 }


//ASSUMING THERE'S ONLY ONE STREET
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
			//  var minSign = null;
			//  var isxNodeLat = parseFloat(isxNode.getAttribute("lat"));
			//  var isxNodeLon = parseFloat(isxNode.getAttribute("lon"));
		 //
			//  streetIx.forEach((x, i) => {
			// 	 var node = GetElementsByAttribute(result, "node", "id", x)[0];
		 //
			// 	 // var dist = new Decimal(node.getAttribute("lat")-isxNode.getAttribute("lat")).toPower(2).plus(new Decimal(node.getAttribute("lon")-isxNode.getAttribute("lon")).toPower(2)).sqrt();
			// 	 var nodeLat = parseFloat(node.getAttribute("lat"));
			// 	 var nodeLon = parseFloat(node.getAttribute("lon"));
			// 	 var dist = Math.sqrt(Math.pow(nodeLat-isxNodeLat,2) + Math.pow(nodeLon-isxNodeLon,2));
			// 	 if ((!minIsx1 || (Math.sign(isxNodeLat-nodeLat) == minSign)) && dist < minSide1){
			// 		 minSide1 = dist;
			// 		 minIsx1 = node;
			// 		 minSign = Math.sign(isxNodeLat-nodeLat);
			// 		 mp1 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
			// 		 // mp1 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
			// 	 }
			// 	 else if ((!minIsx2 || (Math.sign(isxNodeLat-nodeLat) == minSign)) && dist < minSide2){
			// 		 minSide2 = dist;
			// 		 minIsx2 = node;
			// 		 // mp2 = [new Decimal(node.getAttribute("lat")).plus(new Decimal(isxNode.getAttribute("lat"))).dividedBy(2).toNumber(), new Decimal(node.getAttribute("lon")).plus(new Decimal(isxNode.getAttribute("lon"))).dividedBy(2).toNumber()]
			// 		 mp2 = [(nodeLat + isxNodeLat)/2.0, (nodeLon + isxNodeLon)/2.0]
			// 	 }
			//  });
			//  return [[minIsx1, mp1], [minIsx2, mp2]]
		 // }


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
			 // var sides1 = findSideIntersectionsByDistanceWithMidpoints(sides[0], sides1way);

			 //TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
			 var sides1 = findSideIntersectionsByDistanceWithMidpoints(sides[0], sides1ways);

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
			// var sides2 = findSideIntersectionsByDistanceWithMidpoints(sides[1], sides2way);

			 //TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
			 var sides2 = findSideIntersectionsByDistanceWithMidpoints(sides[1], sides2ways);

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
				 // function findClosestNodeAndIntersection(latlong)
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
			 var testPoly = new StreetPolygon(polygon.map( (coord) => [coord[0]+1,coord[1]+1]), "Test Street", yourWay + 1);
			 // polygons.push(poly)
			 // storeData(polygons, "polygons");
			 console.log("returning:", poly, markers);
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
