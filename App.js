import React, { Component } from 'react';
import {View, Text, Button, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar} from 'react-native';

import { Logs } from 'expo';

import * as Location from 'expo-location';

import mock_weather_data from './weatherdata';
import { Utils } from './Utils';
import { owm_api_key, here_api_key } from './apikey';
import DayDisplay from './DayDisplay';
import WeatherGauge from './WeatherGauge';
import Locator from './Locator';
import keyStore from './KeyStorage';

const KEY_USER_HOME_LOCATION = '@user-home';
const KEY_SAVED_LOCATIONS = '@user-locations';
const KEY_MEASUREMENT_SYS = '@user-measurements';

// const URL_SEARCH_CITY = `https://geocode.search.hereapi.com/v1/geocode?q=${searchText}&apiKey=${here_api_key}`;
// const URL_LOCATION_DETAILS = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat}%2C${lon}&lang=en-US&apiKey=${here_api_key}`;
// const URL_WEATHER_DATA = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${owm_api_key}`;

Logs.disableExpoCliLogging();


class App extends Component {

  _isMounted = false;

  _location = {
    city: "Anywhere",
    state: "USA",
    lat: 0,
    lon: 0
  }

  // fill in some default values in the App's state object so we don't get errors when trying to render at startup
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
    location: {city: "Anywhere", state: "USA", lat: 0, lon: 0},
    weatherData: 'none',
    currentWeather: {
      cloudCover: 0,
      temp: -1000,
      desc: 'none',
      icon: '01d'
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



  /**
   * 
   * loads user preferences into the App's state object from KeyStore
   * 
   * @return NONE
   */
  async getUserPreferences () {
    try {
      var homeLoc = await keyStore.get(KEY_USER_HOME_LOCATION);
      var saved = await keyStore.get(KEY_SAVED_LOCATIONS);
      var ms = await keyStore.get(KEY_MEASUREMENT_SYS);

      this.state.userPreferences.homeLocation = JSON.parse(homeLoc);
      this.state.userPreferences.savedLocations = JSON.parse(saved);
      this.state.userPreferences.measurementSystem = JSON.parse(ms);

    } catch (e)
    {
      console.error("Couldn't load user preferences:");
      console.error(e);
    }
  }


    /**
   * 
   * save user preferences in KeyStore
   * 
   * @return true if complete
   */
  async saveAllUserPreferences () {
    await keyStore.store(KEY_USER_HOME_LOCATION, JSON.stringify(this.state.userPreferences.homeLocation));
    await keyStore.store(KEY_SAVED_LOCATIONS, JSON.stringify(this.state.userPreferences.savedLocations));
    await keyStore.store(KEY_MEASUREMENT_SYS, JSON.stringify(this.state.userPreferences.measurementSystem));

    return true;
  }



    /**
   * 
   *  use HERE.com's reverse geocode api to get location info like city name and state
   * 
   * @param {float} lat: latitude of the location to fetch weather data for
   * @param {float} lon: longitude of the location to fetch weather data for
   * @return {JSON} locationDetails: JSON object of the location data retreived
   */
  async getLocationDetails (lat, lon) {
      try {
        const locationRes = await fetch(`https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat}%2C${lon}&lang=en-US&apiKey=${here_api_key}`);
        const locationData = await locationRes.json();
    
        return locationRes;
      } catch (e)
      {
        console.error("Couldn't get locations details");
        console.error(e);
      }
      
  }



  
  /**
   * 
   *  get the weather data from OpenWeatherMap api and fill the app state when it returns
   * 
   * @param {float} lat: latitude of the location to fetch weather data for
   * @param {float} lon: longitude of the location to fetch weather data for
   * @return NONE
   */
  async getWeatherData (lat, lon) {

    try {      
      const locationRes = await fetch(`https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat}%2C${lon}&lang=en-US&apiKey=${here_api_key}`);
      const locationData = await locationRes.json();

      const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${owm_api_key}`);
      const weatherData = await weatherRes.json(); // res is a stream so wait for it to finish before trying to fill the state

      this.fillWeatherState(weatherData, locationData);

    } catch (err) {
      // TODO show this error a little more gracefully
      console.error(err);
    }
    
  }



    /**
   * 
   *  handle calls from Locator.js to refresh the app by calling getWeatherData with the current location data
   * 
   * @return NONE
   */
  refreshWeatherData () {
    this.getWeatherData(this._location.lat, this._location.lon);
  }



    /**
   * 
   *  Use the phone's GPS location to get weather data
   * 
   * @return NONE
   */
  async getWeatherAtCurrentLocation () {
    try {
      const coords = await this.getCurrentLocation();
      this.getWeatherData(coords.latitude, coords.longitude);
    }  catch (e) {
      console.error("Couldn't get weather at current location.");
      console.error(e);
    }
  }


    /**
   * 
   *  get the phone's GPS location (requires location permissions)
   * 
   * @return {obj}: an object that stores latitude and longitude obj: {latitude: float, longitude: float}
   */
  async getCurrentLocation () {
    try {

      let {status} = await Location.requestPermissionsAsync();
      
      if (status !== 'granted') {
        alert("Undercast needs location permissions in order to provide relevant weather information.");
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      this._location.lat = location.coords.latitude;
      this._location.lon = location.coords.longitude;

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
  fillWeatherState (weatherJson, location) {
    // use the mock data instead of api results
    // weatherJson = mock_weather_data;
    let current = weatherJson.current;
    let daily = [];
    let hourly = [];
    let minutely = [];

    // there should always be data for the next 7 days
    if (!weatherJson.daily) {
      console.error("Undercast ran into an error retrieving data about daily weather.");
      return;
    }

    // there should always be data for the next 48 hours
    if (!weatherJson.hourly) {
      console.error("Undercast ran into an error retrieving data about hourly weather.");
      return;
    }

    // minutely is different, if there's no imminent precipitation the API won't return minutely data
    // at all
    if (weatherJson.minutely) {
      weatherJson.minutely.forEach((minute) => {
        minutely.push({
          date: new Date(minute.dt * 1000),
          dt: minute.dt,
          precipitation: minute.precipitation
        });
      });
    }
    // if there's no minutely data, fill in the minutes with 0 values to show no precipitation
    else {
      for (var i = 0; i < 60; i++)
      {
        let dt = Date.now() + (i * 60 * 1000);
        minutely.push({
          date: new Date(dt), 
          dt: dt + (i * 1000),
          precipitation: 0
        });
      }
    }

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
        // more data is available in the openweathermap API, but this is all that's currently in use
      });
    });

    weatherJson.hourly.forEach((hour) => {
      hourly.push({
        date: new Date(hour.dt * 1000),
        temp: Math.round(Utils.KtoF(hour.temp)),
        dt: hour.dt,
        feels_like: hour.feels_like,
        pressure: hour.pressure,
        humidity: hour.humidity,
        dew_point: hour.dew_point,
        clouds: hour.clouds,
        visibility: hour.visibility,
        wind_speed: hour.wind_speed,
        wind_gust: hour.wind_gust,
        wind_deg: hour.wind_deg,
        pop: hour.pop,
        rain: hour.rain, // might be null
        snow: hour.snow, // might be null
        weather: {
          id: hour.weather.id,
          main: hour.weather.main,
          description: hour.weather.description,
          icon: hour.weather.icon
        }
      });
    });

    console.log('INFO: -- App -- trying to set app state...');
    
    this.setState({
      location: location,
      currentWeather: {
        cloudCover: current.clouds,
        temp: Math.round(Utils.KtoF(current.temp)),
        desc: current.weather[0].description,
        icon: current.weather[0].icon,
        high: daily[0].max_temp,
        low: daily[0].min_temp

      },
      daily: daily,
      hourly: hourly,
      minutely: weatherJson.minutely
    },
    // on success 
    () => {console.log("INFO: -- App -- app state set successfully.")});
    
  }



  /**
   * trying to draw on an unmounted object causes errors
   */
  componentWillUnmount = () => {
    this._isMounted = false;
  }


    /**
   * once the app mounts we can start drawing on the canvas
   */
  componentDidMount = async () => {
    this._isMounted = true;

    try {
      const coords = await this.getCurrentLocation();
      
      this.getWeatherData(coords.latitude, coords.longitude);

    } catch (e) {
      console.error(e);
    }
  }



    /**
   * 
   * searchCity calls HERE.com's geocode API to get location data about a searched city.  it chooses the first (best match) result and
   * then calls getWeatherData() with the new location information to refresh the animations
   * 
   * @param {event} event : onSubmitEdit event object from Locator.js
   * @return NONE
   */
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

      // tell the user if their search ended with no results, then exit
      if (loc_data.items.length === 0) {
        alert(`No results for "${searchText}", try a different search`);
        return;
      }

      this._location.lat = loc_data.items[0].position.lat;
      this._location.lon = loc_data.items[0].position.lng;

      this.getWeatherData(loc_data.items[0].position.lat, loc_data.items[0].position.lng);

    } catch (e) {
      console.error("Error searching text from HERE.com api:");
      console.error(e);
    }
  }



    /**
   * 
   *  Render all the app components
   * 
   * @return NONE
   */
  render() {
    let gaugeData = {
      hourly: this.state.hourly,
      minutely: this.state.minutely,
      today: {
        currentTemp: this.state.currentWeather.temp,
        desc: this.state.currentWeather.desc,
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

    let location_title = 'Somewhereville';
    let location_city = 'Anywhere';
    let location_state = 'USA';

    if (this.state.location.items) {
      location_city = this.state.location.items[0].address.city;
      location_state = this.state.location.items[0].address.state;
      location_title = this.state.location.items[0].title;
    }

    return (
      <View style={styles.container}>
        <StatusBar hidden={true}/>
        <Locator city={location_city} 
                 state={location_state} 
                 title={location_title} 
                 searchCallback={this.searchCity.bind(this)} 
                 getLocationCallback={this.getWeatherAtCurrentLocation.bind(this)}
                 refreshCallback={this.refreshWeatherData.bind(this)}
        />
        
        <View style={styles.currentContainer}>       
          <WeatherGauge data={gaugeData}
                        hourly={this.state.hourly}
                        minutely={this.state.minutely}
                        today={this.state.currentWeather}
                        />
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
    backgroundColor: "#1c9eff",
    height: 100
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