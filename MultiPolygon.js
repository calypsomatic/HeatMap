import React, { Component, useState } from 'react';
import { Polygon } from "react-leaflet";

const colorDict = {0: "purple", 1: "red", 2: "green", 3: "blue", 4: "orange", 5: "yellow"}

class MultiPolygon extends Component {

    constructor(props) {
      super(props);
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
        return this.state.polygons.map((poly,i) => {
                    let color = poly.color ? poly.color : "dark grey";
                    let corners = poly.corners ? poly.corners : poly._polygon.corners;
                    return <Polygon fillColor = {color} positions={corners} key={poly.id} stroke={false}/>
                });
        }
        else{
          return null;
        }
    }


}

export default MultiPolygon;

                    // <Polygon fillColor = {colorDict[i%(Object.keys(colorDict).length)]} positions={poly.corners} key={poly.id} stroke={false}/>
