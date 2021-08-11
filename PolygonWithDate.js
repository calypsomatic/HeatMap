import {StreetPolygon, createPolygon} from './StreetPolygon.js';
import toClass from './storage.js';

export default class PolygonWithDate{
  constructor(polygon, date){
    this._polygon = createPolygon(polygon);
    this._date = date;
    // this._id = uuid.v4();
  }

  get polygon(){
    return this._polygon;
  }

  get date(){
    return this._date;
  }

  isInBounds(bounds){
        this._polygon = createPolygon(this._polygon)
    return this._polygon.isInBounds(bounds);
  }

  // get id(){
  //   return this._id;
  // }

  set date(date){
    this._date = date;
  }

}
