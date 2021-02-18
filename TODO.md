# First Release Version





- ## Weather Gauge
    - fade circle 1hr before current time

    - ~~key for high / low temps~~
    - ~~precip key~~
        - decided against a precip key for now, might push to later version
    - ~~snow definitions~~
    - ~~cloud cover definitions~~
    - ~~fix layout of inner details~~
    - ~~fix display bug: every other search canvas never renders~~
        - ~~fixed~~: canvas ref attribute now assigns this.canvas = canvas, rendering is started in componentDidMount
        - FIXED: something was getting lost in the state transitions I was doing in lifecycle methods
            - learned a good lesson here: **DO YOU REALLY NEED STATE?**  I wasn't actualy changing anything in the state within this component, the updates were coming from the parent component (App.js), and being passed as props.  Just passing the new props alone is enough to force a re-render and everything works as planned.

- ## Icons
    - ~~blender icons~~
        - ~~80% done, need snow and fog~~
    - ~~convert blender icons to data urls~~


- ## RadarScreen
    - create 2nd view / ScrollView to view radar
    - fetch each image for available times
    - overlay on map components from here.com
        - use the here.com api to get lat/lon and a map tile
            - https://developer.here.com/documentation/map-image/dev_guide/topics/resource-map.html
        - get list of timestamps by fetch from https://api.rainviewer.com/public/maps.json
        - https://tilecache.rainviewer.com/v2/radar/{ts}/{size}/{z}/{latitude}/{longitude}/{color}/{options}.png

- ### Locator Component
    - dropdown or drawer for list of ~~saved~~ *recent* locations
    - ~~display current city, state in text~~
    - ~~swap Text for TextInput on onPress event~~
    - ~~callback to parent to search for a city~~
    - ~~locator button, use current location~~
    - ~~refresh button, re-fetch data~~

- #### General
    - ~~Use home/saved location first~~
        - changed this in favor of current location first
    - ~~Orchestrator function for startup and data refresh~~
        - 9/15 might do some refactoring later if there's time, but refactor for gauge display bug fix is feeling better
    - handle *errors* more gracefully
        - minutely data not showing up
        - alerts for when location / weather data can't be obtained
    - ~~don't move views when keyboard is open~~
        - fixed this by adding height: 100 to parent view

- #### Preferences
    - ~~don't save previously saved locations (use city, st as key?)~~
    - save recent searches IF they came back with a real world location