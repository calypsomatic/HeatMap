import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import StreetPolygon from './StreetPolygon.js';

//returns [closestNode, closestIntersectionNode]
export function findClosestNodeAndIntersection(result, allNodes, intersections_by_nodeId, lat, lng)
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


export function findSideIntersectionsFromNodeAndWay(allNodesInRelation, intersections_by_nodeId, anyNode, wayNode)
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

	 export function findSideIntersectionsFromNodeAndWayWithMidPoints(result, allNodesInRelation, intersections_by_nodeId, anyNode, wayNode)
	 	 {
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
	 	 }

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

	 export function findSideIntersectionsOnOtherStreetWithMidpoints(result, intersections_by_wayId, intersections_by_nodeId, nodeid, wayid)
		 {
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
		 }


	 export function findSideIntersectionsOnOtherStreet(intersections_by_wayId, intersections_by_nodeId, nodeid, wayid)
	 	 {
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
	 	 }

//TRYING TO ACCOMMODATE FOR MORE THAN ONE STREET
export function findSideIntersectionsByDistanceWithMidpoints(result, intersections_by_wayId, isxId, wayIds){
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
	 }
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


		 function extendMidpoint(node1, node2){
			 const dist = Math.sqrt(Math.pow(node1[0]-node2[0],2) + Math.pow(node1[1]-node2[1],2));
			 const linevector = [node2[0]-node1[0], node2[1]-node1[1]];
			 const lvsize = Math.sqrt(linevector[0]*linevector[0] + linevector[1]*linevector[1]);
			 const lvnormal = [linevector[0]/lvsize,linevector[1]/lvsize];
			 return [node1[0]-dist*lvnormal[0],node1[1]-dist*lvnormal[1]];
		 }


	 	 function getPerpendiculars(node1, node2, side){
	 //		 console.log("getting perps for ", node1, node2);
	 			// addCoordsToMarkers([node1,node2], (x,y) => "node " + y);
	 		 	const d = 0.0005; //TODO figure this out
	 			// const linevector = [node2[0]-node1[0], node2[1]-node1[1]];
	 			const linevector = [node2[1]-node1[1], node1[0]-node2[0]];
	 			const lvsize = Math.sqrt(linevector[0]*linevector[0] + linevector[1]*linevector[1]);
	 			const lvnormal = [linevector[0]/lvsize,linevector[1]/lvsize];
				let coord = side == 0 ? [node1[0]+d*lvnormal[0],node1[1]+d*lvnormal[1]] : [node1[0]-d*lvnormal[0],node1[1]-d*lvnormal[1]]
	 			return coord;
				// return [[node1[0]+d*lvnormal[0],node1[1]+d*lvnormal[1]],[node2[0]+d*lvnormal[0],node2[1]+d*lvnormal[1]],[node1[0]-d*lvnormal[0],node1[1]-d*lvnormal[1]],[node2[0]-d*lvnormal[0],node2[1]-d*lvnormal[1]]];




	 			// return [[node1[0]+d*lvnormal[0],node1[1]+d*lvnormal[1]],[node1[0]-d*lvnormal[0],node1[1]-d*lvnormal[1]]];
	 			// return [[node1[0]+d, node1[1]+d], [node1[0]-d, node1[1]-d], [node2[0]+d, node2[1]+d], [node2[0]-d, node2[1]-d]]

	 		 	// const slope = (node2[1] - node1[1])/(node2[0] - node1[0]);
	 			// const inter = node1[1] - (node1[0]*slope);
	 			// const perpslope = 1/(slope);
	 			// const perpinter = node1[1] - (node1[0]/slope);
	 			// let a = 1;
	 			// let b = -2*node1[0];
	 			// let c = node1[0]*node1[0] - (2*d*d*slope/3);
	 			// let disc = b*b - 4*a*c;
	 			// if (disc > 0){
	 			// 	let root1 = (-b + Math.sqrt(disc)) / (2 * a);
	     	// 	let root2 = (-b - Math.sqrt(disc)) / (2 * a);
	 			// 	let y = perpslope*root1 + perpinter;
	 	 }

	 //ASSUMING THERE'S ONLY ONE STREET
	 		 // function findSideIntersectionsByDistanceWithMidpoints(isxId, wayId){
	 			//  var isxNode = GetElementsByAttribute(result, "node", "id", isxId)[0];
	 			//  var streetIx = intersections_by_wayId[wayId].filter(node => node != isxId);
	 			//  var minSide1 = 100000;
	 			//  var minIsx1 = null;``
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
