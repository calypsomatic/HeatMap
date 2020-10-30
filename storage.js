import AsyncStorage from '@react-native-community/async-storage';
import StreetPolygon from './StreetPolygon.js';

const storeData = async (values, key) => {
  try {
    console.log("storing: ", values, key);
    const jsonValue = JSON.stringify(values)
    await AsyncStorage.mergeItem('@' + key, jsonValue)
  } catch (e) {
    console.log(e);
  }
}

//TODO is there a better way to do this?
const toClass = function(obj, proto) {
obj.__proto__ = proto;
return obj;
}


const getMyObject = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem('@' + key);
    return jsonValue != null ? JSON.parse(jsonValue) : null
  } catch(e) {
    console.log(e)
  }
}

const getPolygonsInBounds = async(bounds) => {
    let polys = await getMyObject("polygons");
    //TODO a better way to do this?!
    if (!(polys instanceof Array)){
      polys = Object.values(polys);
    }
    console.log(polys);
    return polys.map((item) => toClass(item, StreetPolygon.prototype)).filter( (poly) => poly.isInBounds(bounds));
}

const getPolygonsBySingleStreetId = async (id) => {
  const polys = await getMyObject("polygons");
  return polys.map((item) => toClass(item, StreetPolygon.prototype)).filter( (poly) => poly.street_id == id);
}

const getPolygonsByMultipleStreetIds = async (ids) => {
  let polys = await getMyObject("polygons");
  console.log(polys);
  if (polys && !(polys instanceof Array)){
    polys = Object.values(polys).map((item) => toClass(item, StreetPolygon.prototype)).filter( (poly) => ids.includes(poly.street_id));
  }
  //TODO will I need an else?
  if (!polys){
    return [];
  }
  return polys.reduce( (accumulator, obj) => {
    if (!accumulator[obj.street_id]){
      accumulator[obj.street_id] = [];
    }
    accumulator[obj.street_id].push(obj);
    return accumulator;
  }, {});
}

export {storeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds};
