import React, { Component, useState } from 'react';
import { Map, TileLayer, Marker, Popup, Polygon, SVGOverlay, LayerGroup, Circle, FeatureGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// import './App.css';
import Geolocation from '@react-native-community/geolocation';
import L from 'leaflet';
import {findExistingIntersections, createNewIntersections} from './map.js';
import MultiPolygon from './MultiPolygon.js';
import {storeData, getMyObject} from './storage.js';


var bigInt = require("big-integer");
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

class MapView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentLocation: null,
      zoom: 14,
      markers: [],
      polygons: null,
      bounds: null
    }
  }


  componentDidMount() {
    Geolocation.getCurrentPosition(position => {
      this.setState({
        currentLocation: { lat: position.coords.latitude, lng: position.coords.longitude }      });
      findExistingIntersections(this.state.currentLocation)
        .then(res => {
          console.log(res);
          this.setState({ polygons: res.polygon.concat(this.state.polygons ? this.state.polygons : []), markers: res.markers });
        });
        createNewIntersections(this.state.currentLocation)
        .then(res => {
          console.log(res);
          console.log(res.polygon);
          console.log(this.state.polygons);
          this.setState({ polygons: res.polygon.concat(this.state.polygons ? this.state.polygons : [])});
        });
   });

  }

  // renderPolygon(){
  //   if (this.state.polygons){
  //       // return <Polygon fillColor="purple" positions={this.state.polygons} stroke={false}/>
  //       return this.state.polygons.map((poly) => (
  //                   <Polygon fillColor = "purple" positions={poly.corners} key={poly.corners.flat()} stroke={false}/>
  //               ))
  //     }
  // }

  render() {

    if (!this.state) {
      return <div>Loading</div>
    }

    //TODO: fix attribution.  given here: http://maps.stamen.com/#toner/12/37.7706/-122.3782

    return (
      <Map ref="map" center={this.state.currentLocation} zoom={this.state.zoom}>
        <TileLayer
          url="http://tile.stamen.com/toner/{z}/{x}/{y}.png"
          attribution="Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL."
        />
        <Marker position={this.state.currentLocation}>
        <Popup> You are here </Popup>
        </Marker>
        <MultiPolygon polygons={this.state.polygons}/>
      </Map>
    );
  }
}

export default MapView;


// {this.state.markers.map((marker) => (
//             <Marker position={marker.position} key={marker.position.lat + marker.position.lng}>
//             <Popup> {marker.label} </Popup>
//             </Marker>
//         ))}


// <Map ref="map" center={this.state.currentLocation} zoom={this.state.zoom}>
// <LayerGroup>
// <Grid/>
// </LayerGroup>
//
// </Map>

// {
//   this.renderGrid()
// }

// {
//   this.renderPolygon()
// }
