var uuid = require('react-native-uuid');

export default class PolygonWithDate{
  constructor(polygon, date){
    this._polygon = polygon;
    this._date = date;
    this._id = uuid.v4();
  }

  get polygon(){
    return this._polygon;
  }

  get date(){
    return this._date;
  }

  get id(){
    return this._id;
  }

  set date(date){
    this._date = date;
  }

}
