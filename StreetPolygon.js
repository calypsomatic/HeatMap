export default class StreetPolygon {
  constructor(corners, street_name, street_id){
    this._corners = corners;
    this._street_name = street_name;
    this._street_id = street_id;
    this._nvert = corners.length;
  }

  get corners() {
    return this._corners;
  }

  get street_id() {
    return this._street_id;
  }

  // bounds: [minlon, minlat, maxlon, maxlat]
  isInBounds(bounds){
    return this._corners.some((coord) => coord[0] > bounds[1] && coord[0] < bounds[3] && coord[1] > bounds[0] && coord[1] < bounds[2]);
  }

  //point: [lat, lon]
  //taken from here: https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon
  containsPoint(point){
    var i, j, c = 0;
    for (i = 0, j = this._nvert-1; i < this._nvert; j = i++) {
      if ( ((this._nvert[i][1]>point[1]) != (this._nvert[j][1]>point[1])) &&
        (point[0] < (this._nvert[j][0]-this._nvert[i][0]) * (point[1]-this._nvert[i][1]) / (this._nvert[j][1]-this._nvert[i][1]) + this._nvert[i][0]) ){
          c = !c;
        }
      }
      return c;
  }
}
