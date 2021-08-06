import AsyncStorage from '@react-native-community/async-storage';
import StreetPolygon from './StreetPolygon.js';
import PolygonWithDate from './PolygonWithDate.js';
import UserPolygon from './UserPolygon.js';
import Logger from './Logger.js';

const logger = new Logger(false, 'storage.js');

const storeData = async (values, key) => {
  logger.group("store Data:");
  try {
      logger.log("storing: ", values, key);
    const jsonValue = JSON.stringify(values)
    await AsyncStorage.mergeItem('@' + key, jsonValue)
  } catch (e) {
    logger.log(e);
  }
  logger.groupEnd();
}

const removeData = async (key)  => {
  logger.group("remove Data:");
  try {
      logger.log("removing: ", key);
    await AsyncStorage.removeItem('@' + key)
  } catch (e) {
    logger.log(e);
  }
  logger.groupEnd();
}

const updateUserPolygon = async (user, polygon) => {
  logger.group("updateUserPolygon");
  if (!(polygon instanceof StreetPolygon)){
    polygon = toClass(polygon, StreetPolygon.prototype);
  }
  let userPolys = await getUserPolygons(user);
    logger.log("new poly: ", polygon);
    logger.log("userPOlys: ", userPolys);
  if (!userPolys){
    userPolys = new UserPolygon(user);
  }
    userPolys.addOrUpdatePolygon(polygon);
      logger.log("updating userpolygon:", userPolys);
    storeData(userPolys, "userpolygons_"+user);
    logger.groupEnd();
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
    logger.log(e)
  }
}

const getLocationPolygon = async(loc) => {
  logger.group("getLocationPolygon");
  let minrad = 0.0008;
  let currlat = loc.lat;
  let currlon = loc.lng;
	let bounds = [(currlon-minrad),(currlat-minrad),(currlon+minrad),(currlat+minrad)];
  let nearby = await getPolygonsInBounds(bounds);
    logger.log(nearby);
  return nearby.filter( poly => poly.containsPoint([loc.lat,loc.lng]));
  logger.groupEnd();
}

const getUserPolygons = async(user) => {
  logger.group("getUserPolygons");
  let userPolys = await getMyObject("userpolygons_" + user )
  /////switch to UserPolygon
  if (userPolys && !(userPolys instanceof UserPolygon)){
    userPolys = toClass(userPolys, UserPolygon.prototype);
    return userPolys;
  } else {
    return null;
  }
  logger.groupEnd();
}

const getUserPolygonsInBounds = async(user, bounds) => {
  logger.group("getUserPolygonsInBounds");
    logger.log("get user polygons in bounds");
  let userPolys = await getUserPolygons(user)
  if (userPolys && userPolys.polygons && userPolys.polygons.length){
      logger.log(userPolys.polygons);
    return userPolys.polygons.filter( (pd) => toClass(pd._polygon, StreetPolygon.prototype).isInBounds(bounds));
  } else {
    return [];
  }
  logger.groupEnd();
}

const getPolygonsInBounds = async(bounds) => {
  logger.group("getPolygonsInBounds");
    let polys = await getMyObject("polygons");
    if (!polys){
      return [];
    }
    //TODO a better way to do this?!
    if (!(polys instanceof Array)){
      polys = Object.values(polys);
    }
    let result = polys.map((item) => toClass(item, StreetPolygon.prototype)).filter( (poly) => poly.isInBounds(bounds));
      logger.log("in bounds: ")
      logger.log(result)
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

export {storeData, getMyObject, getPolygonsInBounds, getPolygonsByMultipleStreetIds, getUserPolygonsInBounds, getLocationPolygon, updateUserPolygon, removeData};
