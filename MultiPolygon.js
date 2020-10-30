import React, { Component, useState } from 'react';
import { Polygon } from "react-leaflet";

const colorDict = {0: "purple", 1: "red", 2: "green", 3: "blue", 4: "orange", 5: "yellow"}

class MultiPolygon extends Component {

    constructor(props) {
      super(props);
      console.log(props);
      this.state = {
        polygons: null,
      }
    }

    componentDidUpdate(prevProps, prevState){
      if (this.props.polygons != this.state.polygons){
        this.setState({polygons: this.props.polygons});
      }
    }

    render(){
      if (this.state.polygons){
        console.log(this.state.polygons);
        //TODO make key unique
        return this.state.polygons.map((poly,i) => (
                    <Polygon fillColor = {colorDict[i%(Object.keys(colorDict).length)]} positions={poly.corners} key={poly.id} stroke={false}/>
                ));
//          return result;
          // return <Polygon fillColor = "purple" positions={this.state.polygons[0].corners} stroke={false}/>
//          <Polygon fillColor = {colorDict[i%6]} positions={poly.corners} key={poly.id} stroke={false}/>
        }
        else{
          return null;
        }
    }


}

export default MultiPolygon;
