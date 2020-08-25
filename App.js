import React, { Component } from 'react';
import {View, Text, Button, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert} from 'react-native';

import { Logs } from 'expo';

import * as Location from 'expo-location';

import mock_weather_data from './weatherdata';
import { Utils } from './Utils';
import { owm_api_key, here_api_key } from './apikey';
import DayDisplay from './DayDisplay';
import WeatherGauge from './WeatherGauge';
import keyStore from './KeyStorage';


const KEY_USER_HOME_LOCATION = '@user-home';
const KEY_SAVED_LOCATIONS = '@user-locations';
const KEY_MEASUREMENT_SYS = '@user-measurements';

const URL_SEARCH_CITY = 'https://undercast.robrussell.dev/api/search-city';
const URL_LOCATION_DETAILS = 'https://undercast.robrussell.dev/api/location-details';
const URL_WEATHER_DATA = 'https://undercast.robrussell.dev/api/weather-data';

Logs.enableExpoCliLogging();


class App extends Component {

  _isMounted = false;



  state = {
    userPreferences: {
      homeLocation: {
        lat: 0,
        lon: 0,
        city: "Anywhere",
        state: "USA"
      },
      savedLocations: [{lat: 0, lon: 0}],
      measurementSystem: "Imperial",
    },
    location: {lat: 0, lon: 0},
    weatherData: 'none',
    currentWeather: {
      cloudCover: 0,
      temp: -1000,
      desc: 'none',
    },
    // need at least 4 blanks because the main screen directly references daily[1-3]
    daily: [{max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'}, 
            {max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'}, 
            {max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'}, 
            {max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'},
            {max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'},
            {max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'},
            {max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'},
            {max_temp: 0, min_temp: 0, desc: 'none', dt: 0, date: 0, pop: 0, icon: '01d.png'},],
    hourly: [{temp: 0, date: null, pop: 0, clouds: 0}],
    minutely: [{date: null, precipitation: 0}],
    rainSoon: 0,

  };



  async getUserPreferences () {
    try {
      var homeLoc = await keyStore.get(KEY_USER_HOME_LOCATION);
      var saved = await keyStore.get(KEY_SAVED_LOCATIONS);
      var ms = await keyStore.get(KEY_MEASUREMENT_SYS);

      this.state.userPreferences.homeLocation = JSON.parse(homeLoc);
      this.state.userPreferences.savedLocations = JSON.parse(saved);
      this.state.userPreferences.measurementSystem = JSON.parse(ms);

      console.log("INFO getUserPreferences: ");
      console.log(this.userPreferences);
    } catch (e)
    {
      console.log("Couldn't load user preferences:");
      console.error(e);
    }
  }



  async saveAllUserPreferences () {
    await keyStore.store(KEY_USER_HOME_LOCATION, JSON.stringify(this.state.userPreferences.homeLocation));
    await keyStore.store(KEY_SAVED_LOCATIONS, JSON.stringify(this.state.userPreferences.savedLocations));
    await keyStore.store(KEY_MEASUREMENT_SYS, JSON.stringify(this.state.userPreferences.measurementSystem));

    return true;
  }



  async getLocationDetails (lat, lon) {
      var here_reverse_url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat}%2C${lon}&lang=en-US&apiKey=${here_api_key}`;
      try {
        const locationRes = await fetch(here_reverse_url);
        const locationData = await locationRes.json();
    
        return locationRes;
      } catch (e)
      {
        console.error("Couldn't get locations details");
        console.error(e);
      }
      
  }



  getWeatherData = async (lat, lon) => {

    try {

      var here_reverse_url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat}%2C${lon}&lang=en-US&apiKey=${here_api_key}`;

      var weatherUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${owm_api_key}`;
      
      const locationRes = await fetch(here_reverse_url);
      const locationData = await locationRes.json();

      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json(); // res is a stream so wait for it to finish before trying to fill the state

      this.fillWeatherState(weatherData, locationData);

    } catch (err) {
      // TODO show this error a little more gracefully
      console.error(err);
    }
    
  }

  /**
   * 
   * NOTE: 
   */
  saveLocation = async (location) => {
    
    // NOTE: TODO: SOMEHTING
    var locs = this.state.userPreferences.savedLocations;
    locs.push(location);
    this.setState({ userPreferences: { savedLocations: [ locs ] }});
    try {
      await keyStore.store(KEY_SAVED_LOCATIONS, JSON.stringify(this.state.userPreferences.savedLocations));
    } catch (e) {
      console.error("Couldn't save user location");
      console.error(e);
    }
  }



  getCurrentLocation = async () => {
    try {

      let {status} = await Location.requestPermissionsAsync();
      
      if (status !== 'granted') {
        alert("Need your permission to get your current location!");
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      console.log(location);
      console.log(location.coords);

      return location.coords;

    } catch (e) {
      console.error("Error getting current location from phone.");
      console.error(e);
    }
  }

  /**
   * 
   * Fill in the app's state object with weather data we retrieved with getWeather()
   * 
   * @param {JSON} weatherJson : json data from openweathermap.org one-call api 
   * @return NONE
   */
  fillWeatherState = (weatherJson, location) => {
    // use the mock data instead of api results
    // weatherJson = mock_weather_data;
    let current = weatherJson.current;
    var daily = [];
    var hourly = [];
    var nextHourPop = [];

    weatherJson.daily.forEach((day) => {
      daily.push({
        dt: day.dt,
        date: new Date(day.dt * 1000),
        max_temp: Math.round(Utils.KtoF(day.temp.max)),
        min_temp: Math.round(Utils.KtoF(day.temp.min)),
        pop: day.pop,
        desc: day.weather[0].description,
        icon: day.weather[0].icon,
        sunrise: day.sunrise,
        sunset: day.sunset,
        humidity: day.humidity,
        dew_point: day.dew_point,
        clouds: day.clouds,

      });
      
    });

    weatherJson.hourly.forEach((hour) => {
      hour.date = new Date(hour.dt * 1000);
      hour.temp = Math.round(Utils.KtoF(hour.temp));
    });

    weatherJson.minutely.forEach(minute => minute.date = new Date(minute.dt * 1000));

    console.log('trying to set app state...');

    if (this._isMounted) {
      this.setState({
        location: location,
        currentWeather: {
          cloudCover: current.clouds,
          temp: Math.round(Utils.KtoF(current.temp)),
          desc: current.weather[0].description,
          icon: current.weather[0].icon,

        },
        daily: daily,
        hourly: weatherJson.hourly,
        minutely: weatherJson.minutely
      });
    }
    
  }



  componentWillUnmount = () => {
    this._isMounted = false;
  }



  componentDidMount = async () => {
    this._isMounted = true;

    try {
      // let userPrefs = await this.getUserPreferences();
      // console.log(userPrefs);
      const coords = await this.getCurrentLocation();
      
      this.getWeatherData(coords.latitude, coords.longitude);

    } catch (e) {
      console.error(e);
    }
    
    
  }


  async searchCity (event) {
    try {
      
      let searchText = event.nativeEvent.text.trim();
      
      if (!searchText) {
        return;
      }
        
      searchText = encodeURIComponent(searchText);
      let search_url = `https://geocode.search.hereapi.com/v1/geocode?q=${searchText}&apiKey=${here_api_key}`;
      const res = await fetch(search_url);
      const loc_data = await res.json();

      this.getWeatherData(loc_data.items[0].position.lat, loc_data.items[0].position.lng);

      // Alert.alert("Save Location?",
      // "Do you want to save this location?",
      // [
      //   {text: "Save", onPress: this.saveLocation.bind(this)},
      //   {text: "Cancel"},
      // ]);

    } catch (e) {
      console.log("Error searching text from here api:");
      console.error(e);
    }
  }


  render() {
    let gaugeData = {
      hourly: this.state.hourly,
      minutely: this.state.minutely,
      today: {
        currentTemp: this.state.currentWeather.temp,
        high: this.state.daily[0].max_temp,
        low: this.state.daily[0].min_temp,
        pop: this.state.daily[0].pop,
        sunrise: this.state.daily[0].sunrise,
        sunset: this.state.daily[0].sunset,
        clouds: this.state.daily[0].clouds,
        humidity: this.state.daily[0].humidity,
        icon: this.state.currentWeather.icon,
      }
    }

    let location_title = 'not sure where ya are';
    let location_city = 'Anywhere';
    let location_state = 'USA';

    if (this.state.location.items) {
      location_city = this.state.location.items[0].address.city;
      location_state = this.state.location.items[0].address.state;
      location_title = this.state.location.items[0].title;
    }

    return (
      <View style={styles.container}>
        
        <TextInput style={styles.textLocation} placeholder={location_city + "," + location_state} onSubmitEditing={this.searchCity.bind(this)} />
        
        <View style={styles.currentContainer}>       
          <WeatherGauge data={gaugeData}/>
        </View>

        <ScrollView style={styles.daysContainer} horizontal={true} showsHorizontalScrollIndicator={false} decelerationRate="fast">
          {/* this.state.daily[0] is the current day, so start at 1 since that info is displayed already */}
          <DayDisplay day={this.state.daily[1]}></DayDisplay>
          <DayDisplay day={this.state.daily[2]}></DayDisplay>
          <DayDisplay day={this.state.daily[3]}></DayDisplay>
          <DayDisplay day={this.state.daily[4]}></DayDisplay>
          <DayDisplay day={this.state.daily[5]}></DayDisplay>
          <DayDisplay day={this.state.daily[6]}></DayDisplay>
        </ScrollView>

      </View>
    )
  }
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  textLocation: {
    marginTop: 65,
    fontSize: 16,
    fontWeight: "bold",
  },
  currentContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,    
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    padding: 5,
    marginBottom: 10
  },
  daysContainer: {
    flex: 1,
    marginTop: 50
  },
})

export default App;