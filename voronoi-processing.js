import Voronoi from './assets/rhill-voronoi-core.js';
import { GetElementsByAttribute, getElementsValueByXPath } from './xmlfncs.js';
import StreetPolygon from './StreetPolygon.js';

export function processVoronoi2(xmldoc, streetrelationids, intersections_by_wayId, polygons){

var midpoints = []
var polygons = []

const numtoteststart = 0;
const numtotestend = 17;

let minlon = 1000;
let maxlon = -1000;
let minlat = 1000;
let maxlat = -1000;


let intersectionstest = []

//FIND MIDPOINTS
//TODO make sure they're in the right order somehow!!
streetrelationids.slice(numtoteststart,numtotestend).forEach((str, j) => {
		let templat = null;
		let templon = null;
		let node1lat = null;
		let node1lon = null
  	for (var i = 0; i < intersections_by_wayId[str].length-1; i++){
			if (templat && templon) {
				node1lat = templat;
				node1lon = templon;
			} else {
				var node1id = intersections_by_wayId[str][i];
				var node1 = GetElementsByAttribute(xmldoc, "node", "id", node1id)[0];
				node1lat = parseFloat(node1.getAttribute("lat"));
				node1lon = parseFloat(node1.getAttribute("lon"));
				intersectionstest.push({x:node1lat, y: node1lon});
				if (node1lat < minlat){
					minlat = node1lat;
				} else if (node1lat > maxlat){
					maxlat = node1lat;
				}
				if (node1lon < minlon){
					minlon = node1lon;
				} else if (node1lon > maxlon){
					maxlon = node1lon;
				}
			}
				let node2id = intersections_by_wayId[str][i+1];
				let node2 = GetElementsByAttribute(xmldoc, "node", "id", node2id)[0];
				var node2lat = parseFloat(node2.getAttribute("lat"));
				var node2lon = parseFloat(node2.getAttribute("lon"));
				midpoints.push({x:(node1lat + node2lat)/2.0, y: (node1lon + node2lon)/2.0});
				templat = node2lat;
				templon = node2lon;
				intersectionstest.push({x:node2lat, y: node2lon});
		}
		if (node2lat < minlat){
			minlat = node2lat;
		} else if (node2lat > maxlat){
			maxlat = node2lat;
		}
		if (node2lon < minlon){
			minlon = node2lon;
		} else if (node2lon > maxlon){
			maxlon = node2lon;
		}
});

console.log(midpoints);

//TODO Why do I need to do this to keep my bounds outside my points
minlat = minlat - 0.001;
minlon = minlon - 0.001;
maxlat = maxlat + 0.001;
maxlon = maxlon + 0.001;

console.log(intersectionstest);

//Let's see if I can use voronoi without too much trouble...
var voronoi = new Voronoi();
// var bbox = {xl: currlat-rad, xr: currlat+rad, yt: currlon-rad, yb: currlon+rad}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
var bbox = {xl: minlat, xr: maxlat, yt: minlon, yb: maxlon}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
// var bbox = {xl: minlat, xr: maxlat, yt: maxlon, yb: minlon}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
console.log(bbox);
var diagram = voronoi.compute(midpoints.concat(intersectionstest), bbox);
console.log(diagram);

diagram.cells.forEach((item, i) => {
	// item.halfedges.forEach((he, j) => {
	// 	console.log(he.edge.va);
	// });

	let corners = item.halfedges.map( (cell) => [[cell.edge.va.x, cell.edge.va.y],[cell.edge.vb.x, cell.edge.vb.y]]);
	console.log(corners);
	var poly = new StreetPolygon(corners.flat(), i, i);
	polygons.push(poly);
});

console.log(polygons);
return polygons;
}
