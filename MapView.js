import React, { Suspense, Component, useState, useEffect, useCallback } from 'react';
import { useMapEvent, useLeafletContext, Map, TileLayer, Marker, Popup, Polygon, SVGOverlay, LayerGroup, Circle, FeatureGroup, LayersControl, MapContainer, useMap, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Geolocation from '@react-native-community/geolocation';
import L from 'leaflet';
import {findExistingIntersections, createNewIntersections} from './map.js';
import MultiPolygon from './MultiPolygon.js';
import {storeData, getMyObject, getLocationPolygon, updateUserPolygon, removeData} from './storage.js';
import StreetPolygon from './StreetPolygon.js';
import PolygonWithDate from './PolygonWithDate.js';

//TODO how to deal with user
const user = "testuser";
const rad = 0.004;
var zoom = 16;
var markers = [];
// var polygons = null;
var bounds = null;
const multiPolygon = [
  [
    [42.3953, -71.1257],
    [42.3953, -71.1259],
    [42.3954, -71.1258],
  ],
  [
    [42.3953, -71.1258],
    [42.3953, -71.1259],
    [42.3954, -71.1259],
  ],
]

//   function MyComponent() {
//     const map = useMapEvent('click', () => {
//       map.setCenter([50.5, 30.5])
//     })
//     return null
// }
function MultiPoly(polygons) {
  if (polygons){
    return polygons.polygons.map((poly,i) => {
      console.log(poly);
                let color = poly.color ? poly.color : "dark grey";
                let corners = poly.corners ? poly.corners : poly._polygon.corners;
                return <Polygon fillColor = {color} positions={corners} key={poly.id} stroke={false}/>
            });
    }
    else{
      return null;
    }
}

function Test(){
  const[loc, setLoc] = useState(null);
  const[bounds, setBounds] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const map = useMap();

  useEffect(() => {
    Geolocation.getCurrentPosition(pos => {
        console.log(pos)
          setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          map.setView({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 15);
          setBounds([(pos.coords.longitude-rad),(pos.coords.latitude-rad),(pos.coords.longitude+rad),(pos.coords.latitude+rad)]);
          findExistingIntersections(user, { lat: pos.coords.latitude, lng: pos.coords.longitude })
            .then(res => {
              console.log("MapView.findExistingIntersections");
              setPolygons(res.polygon)
            })
          });
  }, [])
    return (<MultiPoly polygons={polygons}/>)
}



function MapView() {
  return(
    <MapContainer>
      <TileLayer
        url="http://tile.stamen.com/toner/{z}/{x}/{y}.png"
        attribution="Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL."
      />
      <Test />
    </MapContainer>
    )
}

export default MapView;
