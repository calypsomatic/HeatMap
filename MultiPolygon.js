import React, { Component, useState } from 'react';
import { Polygon } from "react-leaflet";

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
        return this.state.polygons.map((poly) => (
                    <Polygon fillColor = "purple" positions={poly.corners} key={poly.corners.flat()} stroke={false}/>
                ));
//          return result;
          // return <Polygon fillColor = "purple" positions={this.state.polygons[0].corners} stroke={false}/>
        }
        else{
          return null;
        }
    }


}

export default MultiPolygon;
