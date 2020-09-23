import React, {Component} from 'react';
import MapView from './MapView';
import {StyleSheet,TouchableOpacity, Alert, View, Text} from 'react-native';
import './App.css';
import Geolocation from '@react-native-community/geolocation';

function App() {
    return (

    <div className="App">
      <MapView/>
    </div>
  );
}
export default App;
