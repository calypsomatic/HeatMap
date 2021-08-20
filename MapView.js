import React, {useState, useEffect } from 'react';
import { TileLayer, Polygon, MapContainer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Geolocation from '@react-native-community/geolocation';
import L from 'leaflet';
import {findExistingIntersections, createNewIntersections} from './map.js';
import {storeData, getMyObject, getLocationPolygon, updateUserPolygon, removeData} from './storage.js';
import StreetPolygon from './StreetPolygon.js';

const debug = true;
var logger = debug ? console.log.bind(console) : function () {};
var group = debug ? console.group.bind(console) : function () {};
var groupEnd = debug ? console.groupEnd.bind(console) : function () {};

//TODO how to deal with user
const user = "testuser";
const rad = 0.004;
var zoom = 16;

function MultiPoly(polygons) {
  group("MultiPoly");
  if (polygons){
    logger(polygons);
    return polygons.polygons.map((poly,i) => {
                let color = poly.color ? poly.color : "dark grey";
                let corners = poly.corners ? poly.corners : poly._polygon.corners;
                logger(corners);
                return <Polygon fillColor = {color} positions={corners} key={poly.id} stroke={false}/>
            });
    }
    else{
      return null;
    }
    groupEnd();
}

function BigPoly(bounds){
  group("BigPoly");
  logger(bounds);
  let b= bounds.bounds;
  if (b && b.length){
    let poss = [[b[1],b[0]],[b[3],b[0]],[b[1],b[2]],[b[3],b[2]]]
    logger(poss)
    let test = new StreetPolygon(poss, null, null)
    logger(test.corners)
    let p = bounds.polygons;
    if (p && p.length){
      let t = [poss];
      p.forEach(c => {
        t.push(c.corners);
      })
      logger(t)
      return <Polygon fillColor = {"dark grey"} positions={t} stroke={false}/>
    }
    return <Polygon fillColor = {"dark grey"} positions={poss} stroke={false}/>
  } else {
    return null;
  }
  // let bigpoly = L.polygon(
  //   [[[52, -1],
  //     [52, 1],
  //     [50, 1],
  //     [50, -1]], //outer ring
  //    [[51.509, -0.08],
  //     [51.503, -0.07],
  //     [51.51, -0.047]]] // cutout
  //   ).addTo(map);
  groupEnd();
}

function PolyMap(){
  const[loc, setLoc] = useState(null);
  const[bounds, setBounds] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const map = useMap();

  useEffect(() => {
    Geolocation.getCurrentPosition(pos => {
        let currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(currentLocation);
        map.setView(currentLocation, 15);
        setBounds([(pos.coords.longitude-rad),(pos.coords.latitude-rad),(pos.coords.longitude+rad),(pos.coords.latitude+rad)]);
        findExistingIntersections(user, currentLocation)
            .then(res => {
              group("MapView.findExistingIntersections");
              logger(res);
            setPolygons(res.polygon)
            //if there are nearby intersections that aren't in the db yet, create them
            createNewIntersections(currentLocation, res)
            .then(resnew => {
              group("MapView.createNewIntersections");
              setPolygons(resnew.polygon.concat(res.polygon));
              groupEnd();
            })
            //Gets the polygon where you are right now
            getLocationPolygon(currentLocation).then( pres =>{
              group("getLocationPolygon");
              logger(pres);
              if (pres && pres.length){
                let localp = pres[0];
                if (!(localp instanceof StreetPolygon)){
                  localp = toClass(localp, StreetPolygon.prototype);
                }
                //update this polygon with current date and assign to user
                updateUserPolygon(user, localp);
                groupEnd();
              }
            });
            groupEnd();
        });
      });
    }, [])
    logger(polygons, bounds, loc);
    return (
      // <MultiPoly polygons={polygons}/>)
      <BigPoly polygons={polygons} loc={loc} zoom={zoom} bounds={bounds}/>)
}

function MapView() {
  return(
    <MapContainer>
      <TileLayer
        url="http://tile.stamen.com/toner/{z}/{x}/{y}.png"
        attribution="Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL."
      />
      <PolyMap />
    </MapContainer>
    )
}

export default MapView;
