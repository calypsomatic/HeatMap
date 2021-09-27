import React, {useState, useEffect } from 'react';
import { TileLayer, Polygon, MapContainer, useMap, LayerGroup, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Geolocation from '@react-native-community/geolocation';
import L from 'leaflet';
import {createNewIntersections, findExistingIntersections} from './startingover.js';
import {storeData, getMyObject, getLocationPolygon, updateUserPolygon, removeData} from './storage.js';
import StreetPolygon from './StreetPolygon.js';

const debug = true;
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

//TODO how to deal with user
const user = "testuser";
const rad = 0.004;
var zoom = 16;
const colorSchema = {0: "dark blue", 1: 'green', 2: 'orange', 3: 'red', 4:'purple', 5:'blue'}

delete L.Icon.Default.prototype._getIconUrl;

//Gets the needed icon
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

function MultiPoly(polygons) {
  const log = getLogger("MultiPoly", true);
  if (polygons && polygons.polygons && polygons.polygons.length){
    log.log(polygons);
    return polygons.polygons.map((poly,i) => {
                let color = poly.color ? poly.color : "dark grey";
                let corners = poly.corners ? poly.corners : poly._polygon.corners;
                return <Polygon fillColor = {color} positions={corners} key={poly.id} stroke={false}/>
            });
    }
    else{
      return null;
    }
    log.end();
}

function Markers(markers){
  const log = getLogger("Markers", true);
  if(markers && markers.markers){
    log.log(markers);
    return markers.markers.map((marker) => (
                <Marker position={marker.position} key={marker.position.lat + marker.position.lng}>
                <Popup> {marker.label} </Popup>
                </Marker>
            ))
  }
  return null;
  log.end();
}

function BigPoly(bounds){
  const log = getLogger("BigPoly", false);
  let poss = [[90, -180], [90, 180], [-90, 180], [-90, -180]]
  let p = bounds.polygons;
  if (p && p.length){
    let t = [poss];
    p.forEach(c => {
      t.push(c.corners);
    })
    log.log(t)
    return <Polygon fillColor = {"dark grey"} positions={t} stroke={false} />
  } else {
    return <Polygon fillColor = {'#000000'} positions={poss} stroke={false}/>
  }
  log.end();
  }

function PolyMap(){
  const[loc, setLoc] = useState(null);
  const[bounds, setBounds] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const map = useMap();
  const [markers, setMarkers] = useState([]);

  const log = getLogger("PolyMap", true);

  useEffect(() => {
    Geolocation.getCurrentPosition(pos => {
        let currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(currentLocation);
        setMarkers([{position:new L.LatLng(pos.coords.latitude, pos.coords.longitude), label: "You are here"}]);
        map.setView(currentLocation, 15);
        setBounds([(pos.coords.longitude-rad*2),(pos.coords.latitude-rad*2),(pos.coords.longitude+rad*2),(pos.coords.latitude+rad*2)]);
        findExistingIntersections(user, currentLocation)
            .then(res => {
              const log = getLogger("MapView.findExistingIntersections", true);
              log.log(res);
            // setPolygons(res.polygon)
            setMarkers(res.markers);
            //if there are nearby intersections that aren't in the db yet, create them
            createNewIntersections(currentLocation, res)
            .then(resnew => {
              const log = getLogger("MapView.createNewIntersections", true);
              // setPolygons(res.polygon.concat(resnew.polygons));
              log.log(resnew)
              setPolygons(resnew.polygons);
              // setMarkers(resnew.markers);
              log.end();
            })
            //Gets the polygon where you are right now
            getLocationPolygon(currentLocation).then( pres =>{
              const log = getLogger("getLocationPolygon", false);
              log.log(pres);
              if (pres && pres.length){
                let localp = pres[0];
                if (!(localp instanceof StreetPolygon)){
                  localp = toClass(localp, StreetPolygon.prototype);
                }
                //update this polygon with current date and assign to user
                // updateUserPolygon(user, localp);
                log.end();
              } else {
                //TODO make new polygon?
              }
            });
            log.end();
        });
      });
    }, [])
    log.log(polygons, bounds, loc);
    // return (
    //   <>
    //     <BigPoly polygons={polygons} loc={loc} zoom={zoom} bounds={bounds}/>
    //     <MultiPoly polygons={polygons}/>
    //     <Markers markers={markers}/>
    //   </>
    // )
    return (
      <>
        <MultiPoly polygons={polygons}/>
        <Markers markers={markers}/>
      </>
    )
    // return null
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
