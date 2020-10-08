import React, { Component, useState } from 'react';
import { Map, TileLayer, Marker, Popup, Polygon, SVGOverlay, LayerGroup, Circle, FeatureGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// import './App.css';
import Geolocation from '@react-native-community/geolocation';
import L from 'leaflet';
import findIntersections from './map.js';
import Grid from './Grid.js';
// import {storeData, getMyObject} from './storage.js';

var bigInt = require("big-integer");
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// const storeData = async (values) => {
//   try {
//     console.log("storing");
//     const jsonValue = JSON.stringify(values)
//     console.log(jsonValue);
//     await AsyncStorage.setItem('@storage_Key', jsonValue)
//   } catch (e) {
//     console.log(e);
//   }
// }
//
//
// const getMyObject = async () => {
//   try {
//     const jsonValue = await AsyncStorage.getItem('@storage_Key')
//     console.log(jsonValue);
//     return jsonValue != null ? JSON.parse(jsonValue) : null
//   } catch(e) {
//     console.log(e)
//   }
// }

class MapView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      markers: [],
      polygons: null,
      bounds: null
    }
  }


  componentDidMount() {
    Geolocation.getCurrentPosition(position => {
      this.setState({
        currentLocation: { lat: position.coords.latitude, lng: position.coords.longitude },
          zoom: 14,
          error: null,
          isLoaded: false
      });
      findIntersections(this.state.currentLocation)
        .then(res => {
          console.log(res);
          this.setState({ polygons: res.polygon, markers: res.markers });
          // storeData(res.polygon)
        });
   });

  }

  renderGrid(){
    if (this.state.polygons){
        // getMyObject().then( res => console.log(res));
        return  <Polygon fillColor="purple" positions={this.state.polygons} stroke={false}/>
      }
  }

  // renderPolygon(){
  //   if (this.state.polygons){
  //       getMyObject().then( res => console.log(res));
  //       return <Polygon fillColor="purple" positions={this.state.polygons} stroke={false}/>
  //     }
  // }

  render() {

    if (!this.state) {
      return <div>Loading</div>
    }

    // console.log(this);
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
        {
          this.renderGrid()
        }
        {this.state.markers.map((marker) => (
                    <Marker position={marker.position} key={marker.position.lat + marker.position.lng}>
                    <Popup> {marker.label} </Popup>
                    </Marker>
                ))}
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
