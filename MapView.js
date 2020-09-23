import React, { Component, useState } from 'react';
import { Map, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Geolocation from '@react-native-community/geolocation';

class MapView extends Component {
  constructor(props) {
    super(props);
    Geolocation.getCurrentPosition(position => {
      this.setState({
        currentLocation: { lat: position.coords.latitude, lng: position.coords.longitude },
          zoom: 14,
      })
    });
  }


  render() {
    if (!this.state) {
      return <div>Loading</div>
    }

    //TODO: fix attribution.  given here: http://maps.stamen.com/#toner/12/37.7706/-122.3782

    return (
      <Map center={this.state.currentLocation} zoom={this.state.zoom}>
        <TileLayer
          url="http://tile.stamen.com/toner/{z}/{x}/{y}.png"
          attribution="Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL."
        />

      </Map>
    );
  }
}

export default MapView;
