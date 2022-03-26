import { ExpoLeaflet, MapLayer, MapShape } from 'expo-leaflet'
import * as Location from 'expo-location'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native'
import {findExistingIntersections} from './startingover.js';

const mapLayers: Array<MapLayer> = [
  {
    attribution:
    "Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL.",
    baseLayerIsChecked: true,
    baseLayerName: 'Stamen',
    layerType: 'TileLayer',
    url: "http://tile.stamen.com/toner/{z}/{x}/{y}.png",
  }
]

const rad = 0.004;

const mapOptions = {
  attributionControl: false,
  zoomControl: Platform.OS === 'web',
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    backgroundColor: 'dodgerblue',
    paddingHorizontal: 10,
    paddingTop: 30,
    width: '100%',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  mapControls: {
    backgroundColor: 'rgba(255,255,255,.5)',
    borderRadius: 5,
    bottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    marginHorizontal: 10,
    padding: 7,
    position: 'absolute',
    right: 0,
  },
  mapButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  mapButtonEmoji: {
    fontSize: 28,
  },
})

let colorSchema = {0: "grey", 1: "blue", 2:"red", 3:"green", 4:"orange", 5:"purple"}
function MultiPoly(polygons) {
  if (polygons && polygons.length){
    return polygons.map((poly,i) => {
                let color = poly.color ? poly.color : "dark grey";
                // let color = colorSchema[i%6];
                let corners = poly.corners ? poly.corners : poly._polygon.corners;
                return {
                  shapeType: 'polygon',
                  color: color,
                  positions: corners,
                  stroke: false
                }
            });
    }
    else{
      return null;
    }
}

function BigPoly(bounds, p){
  let poss = [{
    lat: 90,
    lng: -180,
  },{
    lat: 90,
    lng: 180,
  },{
    lat: -90,
    lng: 180,
  },
  {
    lat: -90,
    lng: -180,
  }]
  if (p && p.length){
    let t = [poss];
    p.forEach(c => {
      t.push(c.corners);
    })
    return {
      shapeType: 'polygon',
      color: '#000000',
      positions: t,
      stroke: false
    }
  } else {
    return {
      shapeType: 'polygon',
      color: '#000000',
      positions: poss,
      stroke: false
    }
  }
  }

export default function App() {
  const [zoom, setZoom] = useState(16)
  const [mapCenterPosition, setMapCenterPosition] = useState(null)
  // const [ownPosition, setOwnPosition] = useState<null | LatLngLiteral>(null)
  const[bounds, setBounds] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [mapShapes, setMapShapes] = useState([])

  


  useEffect(() => {
    const getLocationAsync = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('Permission to access location was denied')
      }

      let location = await Location.getCurrentPositionAsync({})
      // location.coords.latitude = location.coords.latitude + (rad/2);
      // location.coords.longitude = location.coords.longitude + (rad/2);
        setMapCenterPosition({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        })
      setBounds([(location.coords.longitude-rad*2),(location.coords.latitude-rad*2),(location.coords.longitude+rad*2),(location.coords.latitude+rad*2)]);


      findExistingIntersections("testuser", location).then(res => {
        setPolygons(res.polygon);
        // let test = BigPoly(bounds, res.polygon);
        let test2 = MultiPoly(res.polygon);
        // setMapShapes([test].concat(test2));
        setMapShapes(test2);
        })

    }
    getLocationAsync().catch((error) => {
      console.error(error)
    })
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, position: 'relative' }}>
      {
            (mapCenterPosition == null)?
             <ActivityIndicator/>
             :
        <ExpoLeaflet
          loadingIndicator={() => <ActivityIndicator />}
          mapCenterPosition={mapCenterPosition}
          mapLayers={mapLayers}
          mapOptions={mapOptions}
          mapShapes={mapShapes}
          maxZoom={20}
          onMessage={(message) => {
            switch (message.tag) {
              // case 'onMapMarkerClicked':
              //   Alert.alert(
              //     `Map Marker Touched, ID: ${message.mapMarkerId || 'unknown'}`,
              //   )
              //   break
              // case 'onMapClicked':
              //   Alert.alert(
              //     `Map Touched at:`,
              //     `${message.location.lat}, ${message.location.lng}`,
              //   )
              //   break
              case 'onMoveEnd':
                setMapCenterPosition(message.mapCenter)
                break
              case 'onZoomEnd':
                setZoom(message.zoom)
                break
              default:
                if (['onMove'].includes(message.tag)) {
                  return
                }
            }
          }}
          zoom={zoom}
        />
      }

      </View>
    </SafeAreaView>
  )
}