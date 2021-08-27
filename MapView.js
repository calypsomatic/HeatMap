import React, {useState, useEffect } from 'react';
import { TileLayer, Polygon, MapContainer, useMap, LayerGroup, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Geolocation from '@react-native-community/geolocation';
import L from 'leaflet';
// import {findExistingIntersections, createNewIntersections} from './map.js';
import {createNewIntersections} from './startingover.js';
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
const colorSchema = {0: "dark gray", 1: 'yellow', 2: 'orange', 3: 'red', 4:'purple', 5:'blue', 6:'green', 7:'dark blue'}

delete L.Icon.Default.prototype._getIconUrl;

//Gets the needed icon
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

function MultiPoly(polygons) {
  group("MultiPoly");
  if (polygons && polygons.polygons && polygons.polygons.length){
    logger(polygons);
    // return <Polygon fillColor = {"blue"} positions={polygons.polygons[0].corners} key={1} stroke={false}/>
    return polygons.polygons.map((poly,i) => {
                // let color = poly.color ? poly.color : "dark grey";
                let color = colorSchema[i%8]
                let corners = poly.corners ? poly.corners : poly._polygon.corners;
                return <Polygon fillColor = {color} positions={corners} key={poly.id} stroke={false}/>
            });
    }
    else{
      return null;
    }
    groupEnd();
}

function Markers(markers){
  group("Markers");
  if(markers){
    logger(markers);
    return markers.markers.map((marker) => (
                <Marker position={marker.position} key={marker.position.lat + marker.position.lng}>
                <Popup> {marker.label} </Popup>
                </Marker>
            ))
  }
  return null;
  groupEnd();
}

function BigPoly(bounds){
  group("BigPoly");
  let poss = [[90, -180], [90, 180], [-90, 180], [-90, -180]]
  let p = bounds.polygons;
  if (p && p.length){
    let t = [poss];
    p.forEach(c => {
      t.push(c.corners);
    })
    logger(t)
    return <Polygon fillColor = {"dark grey"} positions={t} stroke={false} />
  } else {
    return <Polygon fillColor = {'#000000'} positions={poss} stroke={false}/>
  }
  groupEnd();
  }

function PolyMap(){
  const[loc, setLoc] = useState(null);
  const[bounds, setBounds] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const map = useMap();
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    Geolocation.getCurrentPosition(pos => {
        let currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(currentLocation);
        map.setView(currentLocation, 15);
        setBounds([(pos.coords.longitude-rad),(pos.coords.latitude-rad),(pos.coords.longitude+rad),(pos.coords.latitude+rad)]);
        // findExistingIntersections(user, currentLocation)
        //     .then(res => {
        //       group("MapView.findExistingIntersections");
        //       logger(res);
              // res.polygon.forEach((p) => {
              //   p.color = "blue";
              // })
            // setPolygons(res.polygon)
            //if there are nearby intersections that aren't in the db yet, create them
            createNewIntersections(currentLocation, [])
            .then(resnew => {
              group("MapView.createNewIntersections");
              // this.setState({ polygons: resnew.polygon.concat(this.state.polygons ? this.state.polygons.filter( (poly) => resnew.polygon.includes(poly)) : []),
              // let test = resnew.polygon.filter(p => !res.polygon.some(r => r.id == p.id))
              // test.forEach((item) => {
              //   item.color = "red";
              // });

              // setPolygons(res.polygon.concat(test));
              logger(resnew.polygons);
              setPolygons(resnew.polygons);
              setMarkers(resnew.markers);
              groupEnd();
            })
            //Gets the polygon where you are right now
            // getLocationPolygon(currentLocation).then( pres =>{
            //   group("getLocationPolygon");
            //   logger(pres);
            //   if (pres && pres.length){
            //     let localp = pres[0];
            //     if (!(localp instanceof StreetPolygon)){
            //       localp = toClass(localp, StreetPolygon.prototype);
            //     }
            //     //update this polygon with current date and assign to user
            //     // updateUserPolygon(user, localp);
            //     removeData("userpolygons_"+user)
            //     removeData("polygons");
            //     groupEnd();
            //   }
            // });
            // groupEnd();
        // });
      });
    }, [])
    logger(polygons, bounds, loc);
    // return (
    //   <>
    //     <BigPoly polygons={polygons} loc={loc} zoom={zoom} bounds={bounds}/>
    //     <MultiPoly polygons={polygons}/>
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
