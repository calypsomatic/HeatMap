import React, { Component, useState } from 'react';
import { Map, TileLayer, Marker, Popup, Polygon, SVGOverlay, LayerGroup, Circle, FeatureGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Geolocation from '@react-native-community/geolocation';
import L from 'leaflet';
import {findExistingIntersections, createNewIntersections} from './map.js';
import MultiPolygon from './MultiPolygon.js';
import {storeData, getMyObject, getLocationPolygon, updateUserPolygon, removeData} from './storage.js';
import StreetPolygon from './StreetPolygon.js';
import PolygonWithDate from './PolygonWithDate.js';
import Logger from './Logger.js';

const logger = new Logger(false, 'MapView.js');

//var bigInt = require("big-integer");
delete L.Icon.Default.prototype._getIconUrl;

//TODO how to deal with user
const user = "testuser";

//Gets the needed icon
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

class MapView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentLocation: {lat: null, lng: null},
      zoom: 14,
      markers: [],
      polygons: null,
      bounds: null
    }
  }


  componentDidMount() {
    //Set the current location and find nearby intersections
    Geolocation.getCurrentPosition(position => {
      this.setState({            // removeData("userpolygons_"+user)
            // removeData("polygons");

        currentLocation: { lat: position.coords.latitude, lng: position.coords.longitude }      });
      findExistingIntersections(user, this.state.currentLocation)
        .then(res => {
          logger.group("MapView: findExistingIntersections");
            logger.log(res);
            logger.log(this.state);
          this.setState({ polygons: res.polygon.concat(this.state.polygons ? this.state.polygons : [])});
            logger.log(this.state);
        //if there are nearby intersections that aren't in the db yet, create them
        createNewIntersections(this.state.currentLocation, res)
        .then(resnew => {
          logger.group("MapView: createNewIntersections");
            logger.log(this.state);
            logger.log(resnew);
          // this.setState({ polygons: resnew.polygon.concat(this.state.polygons ? this.state.polygons.filter( (poly) => resnew.polygon.includes(poly)) : []),
            this.setState({ polygons: resnew.polygon.concat(this.state.polygons ? this.state.polygons : []),
          markers: resnew.markers ? resnew.markers.concat(this.state.markers) : this.state.markers});
            logger.log(this.state);
            logger.groupEnd();
        });

        //Gets the polygon where you are right now
        getLocationPolygon(this.state.currentLocation).then( res =>{
          logger.group("MapView: getLocationPolygon");
            logger.log("location polygon:")
            logger.log(res);
          if (res && res.length){
            let localp = res[0];
            if (!(localp instanceof StreetPolygon)){
              localp = toClass(localp, StreetPolygon.prototype);
            }
              logger.log(localp.id);
            //update this polygon with current date and assign to user
            ///////////
            //Try to pass just the polygon and update date in method
            //var userp = new PolygonWithDate(localp, new Date())
            updateUserPolygon(user, localp);

            ///////
            // var userp = new PolygonWithDate(localp, new Date())
            // updateUserPolygon(user, userp);
              logger.log(this.state);
              // logger.log("removing userpolgyons");
            // removeData("userpolygons_"+user)
            // removeData("polygons");
            logger.groupEnd();
          }
        })
        logger.groupEnd();
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

  renderMarkers(){
    if(this.state.markers){
      // logger.log(this.state.markers);
      return this.state.markers.map((marker) => (
                  <Marker position={marker.position} key={marker.position.lat + marker.position.lng}>
                  <Popup> {marker.label} </Popup>
                  </Marker>
              ))
    }
  }

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
        <Popup> You are here: {this.state.currentLocation.lat}, {this.state.currentLocation.lng} </Popup>
        </Marker>
        <MultiPolygon polygons={this.state.polygons}/>
        {
          this.renderMarkers()
        }
      </Map>
    );
  }
}

export default MapView;


//
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
