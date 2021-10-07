import PolygonWithDate from './PolygonWithDate.js';

export default class UserPolygon{
  constructor(userid){
    this._userid = userid;
    this._polygons = {};
  }

  addOrUpdatePolygon(polygon){
    if (!this._polygons[polygon.id]){
      polygon = this.addPolygonWithDate(polygon, new Date());
    } else {
      polygon = this.updatePolygonDate(polygon);
    }
    return polygon;
  }

  addPolygonWithColor(polygon, date){
    this._polygons[polygon] = date;
  }

  addPolygonWithDate(polygon, date){
    var pdate = new PolygonWithDate(polygon, date);
    this._polygons[polygon.id] = pdate;
    return pdate;
  }

  updatePolygonDate(polygon){
    this._polygons[polygon.id]._date = new Date();
    return this._polygons[polygon.id];
  }

  get polygons() {
    return this._polygons;
  }

}
