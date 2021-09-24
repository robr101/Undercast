# Undercast
![Undercast Screenshot 1](https://github.com/robr101/Undercast/blob/master/screenshots/undercast-screenshot-1.png "Undercast Screenshot 1")
![Undercast Screenshot 2](https://github.com/robr101/Undercast/blob/master/screenshots/undercast-screenshot-2.png "Undercast Screenshot 2")

## Description

Undercast is a simple weather app with a unique, clock-based display.  It is written in vanilla Javascript with React Native.
Undercast relies on OpenWeatherMap.org's One-Call API to retrieve weather forecast data, and Here.com's reverse geolocation API for city search and local names from Latitude/Longitude.

## Important Files

- App.js
    - Main application, coordinates data retrieval and display through the other components
- DayDisplay.js
    - Component for mini day previews at bottom of application
- dataIcons.js
    - dataURLs of the weather icons used throughout the app.
- Locator.js
    - Component to add a search bar to search locations with "get location" (crosshair icon) button and refresh button
- WeatherGauge.js
    - Main current weather display, uses react-native-canvas to draw a unique clock-format of weather data.
- apikey.js
    - API keys for using OpenWeatherMap and Here.com.  Note that I haven't included API keys here as it's a public repo.  This is also a terrible way to store the keys, as they'd be
      local to the app and could be viewed by any user.  In a production app you'll want to pipe requests through your own web server which holds your secrets.  Might update later with an example of how this would be done with Flask or Django.
      UPDATE: check out @robr101/undercast-server for an example of a simple Flask app you could use to hide the API keys from the user

## Other Stuff

get_icons.py is just a quick script I wrote to download all the free icons from OpenWeatherMap.  You could use this to get those icons, or use the ones I've included (I made them in Blender).
