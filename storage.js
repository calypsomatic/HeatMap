import AsyncStorage from '@react-native-community/async-storage';

const storeData = async (values, key) => {
  try {
    const jsonValue = JSON.stringify(values)
    await AsyncStorage.setItem('@' + key, jsonValue)
  } catch (e) {
    console.log(e);
  }
}


const getMyObject = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem('@' + key);
    return jsonValue != null ? JSON.parse(jsonValue) : null
  } catch(e) {
    console.log(e)
  }
}

export {storeData, getMyObject};
