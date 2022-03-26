var uuid = require('react-native-uuid');

//This is a hack to make sure an object is an instance of StreetPolygon in other classes
export const createPolygon = function createPolygon(obj) {
  const poly = new StreetPolygon(obj._corners, obj._street_name, obj._street_id, obj._center, obj._id);
  return Object.assign(poly, obj);
};

export default class StreetPolygon {
  constructor(corners, street_name, street_id, center, id){
    this._corners = this.sort_corners(corners);
    this._street_name = street_name;
    this._street_id = street_id;
    this._nvert = corners.length;
    this._center = center;
    //TEMP
    // this._id = id || uuid.v4();
    this._id = id || this._center

  }

  get corners() {
    return this._corners;
  }

  get street_id() {
    return this._street_id;
  }

  get id() {
    return this._id;
  }

  sort_corners(corners){
    var base = avgCorner(corners)
    corners.sort((c1,c2) => Math.atan2(c1[0]-base[0],c1[1]-base[1])-Math.atan2(c2[0]-base[0],c2[1]-base[1]))
    return corners;
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
      if ( ((this._corners[i][1]>point[1]) != (this._corners[j][1]>point[1])) &&
        (point[0] < (this._corners[j][0]-this._corners[i][0]) * (point[1]-this._corners[i][1]) / (this._corners[j][1]-this._corners[i][1]) + this._corners[i][0]) ){
          c = !c;
        }
      }
      return c;
  }
}

function avgCorner(corners){
    let x = 0;
    let y = 0;
    corners.forEach((item, i) => {
      x += item[0];
      y += item[1];
    });
    return [x/corners.length,y/corners.length];
}
