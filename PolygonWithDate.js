import {StreetPolygon, createPolygon} from './StreetPolygon.js';

export default class PolygonWithDate{
  constructor(polygon, date){
    this._polygon = createPolygon(polygon);
    this._date = date;
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

  set date(date){
    this._date = date;
  }

}
