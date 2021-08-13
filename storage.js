import AsyncStorage from '@react-native-community/async-storage';
import StreetPolygon from './StreetPolygon.js';
import PolygonWithDate from './PolygonWithDate.js';
import UserPolygon from './UserPolygon.js';

const debug = true;
var logger = debug ? console.log.bind(console) : function () {};
var group = debug ? console.group.bind(console) : function () {};
var groupEnd = debug ? console.groupEnd.bind(console) : function () {};

const storeData = async (values, key) => {
  group("store Data:");
  try {
      logger("storing: ", values, key);
    const jsonValue = JSON.stringify(values)
    await AsyncStorage.mergeItem('@' + key, jsonValue)
  } catch (e) {
    logger(e);
  }
  groupEnd();
}

const removeData = async (key)  => {
  group("remove Data:");
  try {
      logger("removing: ", key);
    await AsyncStorage.removeItem('@' + key)
  } catch (e) {
    logger(e);
  }
  groupEnd();
}

const updateUserPolygon = async (user, polygon) => {
  group("updateUserPolygon");
  let userPolys = await getUserPolygons(user);
    logger("new poly: ", polygon);
    logger("userPOlys: ", userPolys);
  if (!userPolys){
    userPolys = new UserPolygon(user);
  }
    userPolys.addOrUpdatePolygon(polygon);
      logger("updating userpolygon:", userPolys);
    storeData(userPolys, "userpolygons_"+user);
    groupEnd();
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
    logger(e)
  }
}

const getLocationPolygon = async(loc) => {
  group("getLocationPolygon");
  let minrad = 0.0008;
  let currlat = loc.lat;
  let currlon = loc.lng;
	let bounds = [(currlon-minrad),(currlat-minrad),(currlon+minrad),(currlat+minrad)];
  let nearby = await getPolygonsInBounds(bounds);
    logger(nearby);
  return nearby.filter( poly => poly.containsPoint([loc.lat,loc.lng]));
  groupEnd();
}

const getUserPolygons = async(user) => {
  group("getUserPolygons");
  let userPolys = await getMyObject("userpolygons_" + user )
  /////switch to UserPolygon
  if (userPolys && !(userPolys instanceof UserPolygon)){
    userPolys = toClass(userPolys, UserPolygon.prototype);
    return userPolys;
  } else {
    return null;
  }
  groupEnd();
}

const getUserPolygonsInBounds = async(user, bounds) => {
  group("getUserPolygonsInBounds");
  let userPolys = await getUserPolygons(user)
  //UserPolys is a dictionary; turn this into just an array of those that are in bounds
  if (userPolys && userPolys.polygons && Object.keys(userPolys.polygons).length > 0){
    return Object.values(userPolys.polygons).filter( (pd) => toClass(pd, PolygonWithDate.prototype).isInBounds(bounds));
  } else {
    return [];
  }
  groupEnd();
}

const getPolygonsInBounds = async(bounds) => {
  group("getPolygonsInBounds");
    let polys = await getMyObject("polygons");
    if (!polys){
      return [];
    }
    //TODO a better way to do this?!
    if (!(polys instanceof Array)){
      polys = Object.values(polys);
    }
    let result = polys.map((item) => toClass(item, StreetPolygon.prototype)).filter( (poly) => poly.isInBounds(bounds));
      logger("in bounds: ")
      logger(result)
    return result;
    log.groupEnd();
}

const getPolygonsBySingleStreetId = async (id) => {
  const polys = await getMyObject("polygons");
  return polys.map((item) => toClass(item, StreetPolygon.prototype)).filter( (poly) => poly.street_id == id);
}

const getPolygonsByMultipleStreetIds = async (ids) => {
  let polys = await getMyObject("polygons");
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

export {storeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds, getUserPolygonsInBounds, getLocationPolygon, updateUserPolygon, removeData, toClass};
