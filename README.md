# Undercast

## Description

Undercast is a simple weather app with a unique, clock-based display.  It is written in vanilla Javascript with React Native.
Undercast relies on OpenWeatherMap.org's One-Call API to retrieve weather forecast data, and Here.com's reverse geolocation API for city search and local names from Latitude/Longitude.

## Files

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

