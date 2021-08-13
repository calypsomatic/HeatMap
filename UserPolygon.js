import PolygonWithDate from './PolygonWithDate.js';

export default class UserPolygon{
  constructor(userid){
    this._userid = userid;
    this._polygons = {};
  }

  addOrUpdatePolygon(polygon){
    if (!this._polygons[polygon.id]){
      this.addPolygonWithDate(polygon, new Date());
    } else {
      this.updatePolygonDate(polygon);
    }
  }

  addPolygonWithColor(polygon, date){
    this._polygons[polygon] = date;
  }

  addPolygonWithDate(polygon, date){
    var pdate = new PolygonWithDate(polygon, date);
    this._polygons[polygon.id] = pdate;
  }

  updatePolygonDate(polygon){
    this._polygons[polygon.id]._date = new Date();
  }

  get polygons() {
    return this._polygons;
  }

}
