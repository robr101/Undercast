import React, { Component } from 'react';
import {Text, View, Dimensions} from 'react-native';
import {Image as RNImage} from 'react-native';

import { Utils } from './Utils';

import Canvas, { Image } from 'react-native-canvas';

import icon_01d from './new_icons/01d.png';
import icon_01n from './new_icons/01n.png';
import icon_02d from './new_icons/02d.png';
import icon_02n from './new_icons/02n.png';
import icon_03d from './new_icons/03d.png';
import icon_03n from './new_icons/03n.png';
import icon_04d from './new_icons/04d.png';
import icon_04n from './new_icons/04n.png';
import icon_09d from './new_icons/09d.png';
import icon_09n from './new_icons/09n.png';
import icon_10d from './new_icons/10d.png';
import icon_10n from './new_icons/10n.png';
import icon_11d from './new_icons/11d.png';
import icon_11n from './new_icons/11n.png';
import icon_13d from './new_icons/13d.png';
import icon_13n from './new_icons/13n.png';
import icon_50d from './new_icons/50d.png';
import icon_50n from './new_icons/50n.png';


// scaled positional metrics
const FULL_CIRCLE = Math.PI * 2;
const DEVICE_WIDTH = Dimensions.get('window').width;
const CANVAS_CENTER_X = DEVICE_WIDTH / 2;
const CANVAS_CENTER_Y = DEVICE_WIDTH / 2;
const DEVICE_SCALE = DEVICE_WIDTH / 500; // interface was designed with 500px wide device
const NEXT_60_MIN_RAD = 175 * DEVICE_SCALE;   // next-60 gauge radius
const NEXT_12_HOUR_RAD = 200 * DEVICE_SCALE;    // outside gauge radius

const HORIZONTAL_PADDING = 10 * DEVICE_SCALE;
const VERTICAL_PADDING = 25 * DEVICE_SCALE;

// fonts
const FONT_SIZE_CURRENT_TEMP = 48;
const FONT_SIZE_HL_TEMP = 12;
const FONT_SIZE_CLOCK_LABELS = 16;
const FONT_SIZE_DESC = 18;

const FONT_COLOR = '#ffffff';

const FONT_CURRENT_TEMP = '' + FONT_SIZE_CURRENT_TEMP + 'px sans-serif';
const FONT_HL_TEMP = 'bold ' + FONT_SIZE_HL_TEMP + 'px sans-serif';
const FONT_DEBUG = '10px sans-serif';
const FONT_CLOCK_LABELS = 'bold ' + FONT_SIZE_CLOCK_LABELS + 'px serif';
const FONT_DESC = FONT_SIZE_CLOCK_LABELS + 'px sans-serif';

const FONT_COLOR_CLOCK_LABELS = 'black';

// icons
const ICON_SIZE = 200 * DEVICE_SCALE;

// key placement and dimensions
const TEMP_KEY_WIDTH = 15 * DEVICE_SCALE;
const TEMP_KEY_HEIGHT = 50 * DEVICE_SCALE;
const TEMP_KEY_X = CANVAS_CENTER_X;
const TEMP_KEY_Y = CANVAS_CENTER_Y;

const COLOR_HIGH_TEMP = 'rgb(255, 119, 255)';
const COLOR_LOW_TEMP = 'rgb(0, 119, 255)';

// only draw precip lines if the PoP is greater than MIN_PRECIP
const MIN_PRECIP = 0.2;

const mapPopToAlpha = Utils.getMapRangeFunction(MIN_PRECIP, 1, 0.5, 1);

const dataIcons = {
    "icon_01d": icon_01d,
    "icon_01n": icon_01n,
    "icon_02d": icon_02d,
    "icon_02n": icon_02n,
    "icon_03d": icon_03d,
    "icon_03n": icon_03n,
    "icon_04d": icon_04d,
    "icon_04n": icon_04n,
    "icon_09d": icon_09d,
    "icon_09n": icon_09n,
    "icon_10d": icon_10d,
    "icon_10n": icon_10n,
    "icon_11d": icon_11d,
    "icon_11n": icon_11n,
    "icon_13d": icon_13d,
    "icon_13n": icon_13n,
    "icon_50d": icon_50d,
    "icon_50n": icon_50n
};



class WeatherGauge extends Component {

    // keep track of whether or not the component is mounted because we're doing async updates and
    // dont wanna update state of an unmounted component (memory leak)
    _isMounted = true;

    // default to fahrenheit, need to upgrade later for different units
    tempUnit = 'F';

    // scaling and placement constants based on device width
    deviceWidth = Dimensions.get('window').width;
    centerX = this.deviceWidth / 2;
    centerY = this.deviceWidth / 2;

    // the emulated device used to design the interface is 500px wide
    deviceScale = this.deviceWidth / 500;

    // gauge sizes and thicknesses for each ring
    minuteRadius = 175 * this.deviceScale;
    clockRadius = 200 * this.deviceScale;

    clockThickness = 25 * this.deviceScale;
    minuteThickness = 10 * this.deviceScale;
    tempThickness = 2 * this.deviceScale;

    // text placement and sizes
    
    highLowX = this.centerX + 50;
    highLowY = this.centerY;

    currentTempX = this.centerX;
    currentTempY = this.centerY;

    // detail x and y calculated by text length
    
    currentTempFontSize = 48;
    highLowFontSize = 12;
    detailSize = 10;

    todayHighTemp = -1000;
    todayLowTemp = 1000;

    ctx = null;

    // just a debug var to see if we're past first update
    init = true;

    fullCircle = 2 * Math.PI;
    clockTop = this.fullCircle * 0.75;

    state = {
        current: {temp: 0, date: null, dewpoint: 0, desc: null, precipitation: 0, clouds: 0, sunrise: 0, sunset: 0},
        hourly: [{temp: 0, date: null, pop: 0, clouds: 0}],
        minutely: [{date: null, precipitation: 0}],
        today: {
            currentTemp: 0,
            high: 0,
            low: 0,
            pop: 0,
            sunrise: 0,
            sunset: 0,
            clouds: 0,
            humidity: 0,
            icon: 0,
          },
        error: "no errors yet"
    }


    /**
     * takes in one hourly data point and checks to see if it's going to rain, snow, or be cloudy
     * and then returns an rgba value
     * 
     * measurements in the clauses here are as follows:
     *  rainfall -> volume of rain per mm/hr
     *  snowfall -> volume of snow per mm/hr
     *           -> visibility in meters is used to determine snowfall intensity
     * 
     * @param {JSON} hour - hourly data point from owm 
     * @returns {color} string representation of an rgba value used by CanvasRenderContext2D
     */
    calcStrokeColor (hour) {
        
        let rainfall = 0;

        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;

        // determine rain intensity
        if (hour.rain) {
            rainfall = hour.rain["1h"];

            if (rainfall < 2.5) {
                // light rain
                red = 140;
                green = 190;
                blue = 255;
            } else if (rainfall >= 2.5 && rainfall < 10) {
                // moderate rain
                red = 70;
                green = 160;
                blue = 255;
            } else if (rainfall >= 10 && rainfall < 50) {
                // heavy rain
                red = 0;
                green = 65;
                blue = 220

            } else if (rainfall >= 50) {
                // VIOLENT rain
                red = 0;
                green = 0;
                blue = 180;
            }

            return `rgba(${red},${green},${blue},${hour.pop})`;
        }

        // determine snow intensity
        if (hour.snow) {
            if (hour.visibility > 1000) {
                // very light snow
                red = 164;
                green = 149;
                blue = 199;
            } else if (hour.visiblity < 1000 && hour.visibility > 500) {
                // moderate snowfall
                red = 129;
                green = 90;
                blue = 219;
            } else if (hour.visibility < 500) {
                // heavy snowfall
                red = 93;
                green = 0;
                blue = 255;
            }

            return `rgba(${red},${green},${blue},${hour.pop})`;
        }

        // cloud cover
        if (hour.clouds > 45 && hour.clouds < 75) {
            return 'rgba(185, 185, 185, 1)';
        } else if (hour.clouds > 75) {
            return 'rgba(140, 140, 140, 1)';
        }


        return 'rgba(0, 0, 0, 0)'
    }


    /**
     * 
     * draw the background of the gauges
     * 
     *  NOTE: this method is async because calls returning things from ctx are async
     * 
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} hourlyData 
     */
    async drawBackgroundCircles (ctx, hourlyData) {
        var hourTick = this.fullCircle / 12;
        var minuteTick = hourTick / 60;
        // var startRad = this.clockTop + (hourlyData[0].date.getHours() % 12) * hourTick;

        var startRad = 0;

        // create a gradient background for the precipitation gauge
        try {
            
            var clockGrad = await ctx.createRadialGradient(this.centerX, this.centerY, this.clockRadius - (this.clockThickness / 2), this.centerX, this.centerY, this.clockRadius + (this.clockThickness / 2));

            clockGrad.addColorStop(0, 'rgba(150, 150, 150, 0.6)');
    
            clockGrad.addColorStop(0.2, 'rgba(150, 150, 150, 0.1)');
            clockGrad.addColorStop(0.5, 'rgba(150, 150, 150, 0.25)');
            clockGrad.addColorStop(0.8, 'rgba(150, 150, 150, 0.1)');
            clockGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.2');
            clockGrad.addColorStop(0.88, 'rgba(150, 150, 150, 0.1');
            clockGrad.addColorStop(1, 'rgba(150, 150, 150, 0.6)');

            ctx.strokeStyle = clockGrad;
            ctx.lineWidth = this.clockThickness;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.clockRadius, startRad, this.fullCircle);
            console.log("after drawbackground circles");
            ctx.stroke();

        } catch (error) {
            console.log("couldn't create clock gradient for background circles");
            console.error(error);
        }
    }



    drawMinuteBackgroundCircle (ctx) {
        var startRad = 0;

        ctx.lineWidth = this.minuteThickness;
        ctx.strokeStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.minuteRadius, 0, this.fullCircle);
        ctx.stroke();
    }



    /**
     * draw pretty highlights around the main gauge
     * 
     * @param {CanvasRenderingContext2D} ctx 
     */
    async drawHighlights (ctx) {
        try {
            var highlightGrad = await ctx.createRadialGradient(this.centerX, this.centerY, this.clockRadius - (this.clockThickness / 2), this.centerX, this.centerY, this.clockRadius + (this.clockThickness / 2));

            highlightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            highlightGrad.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
            highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2');
            highlightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } catch (e) {
            console.log("couldn't create highlights gradient");
            console.error(e);
        }


        ctx.strokeStyle = highlightGrad;
        ctx.lineWidth = this.clockThickness;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.clockRadius, 0, this.fullCircle);
        ctx.stroke();
    }



    /**
     * draw clock labels at 12, 3, 6, 9 o'clock
     * 
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawClockLabels (ctx) {
        ctx.font = FONT_CLOCK_LABELS;
        ctx.fontColor = FONT_COLOR_CLOCK_LABELS;
        ctx.fillStyle = 'black';

        let x12 = CANVAS_CENTER_X - (FONT_SIZE_CLOCK_LABELS / 2);
        let y12 = CANVAS_CENTER_Y - this.minuteRadius + (FONT_SIZE_CLOCK_LABELS / 2);

        let x3 = CANVAS_CENTER_X + this.minuteRadius - (FONT_SIZE_CLOCK_LABELS / 2);
        let y3 = CANVAS_CENTER_Y + (FONT_SIZE_CLOCK_LABELS / 2);

        let x6 = CANVAS_CENTER_X - (FONT_SIZE_CLOCK_LABELS / 2);
        let y6 = CANVAS_CENTER_Y + this.minuteRadius ;

        let x9 = CANVAS_CENTER_X - this.minuteRadius ;
        let y9 = CANVAS_CENTER_Y + (FONT_SIZE_CLOCK_LABELS / 2);

        ctx.fillText('12', x12, y12);
        ctx.fillText('3', x3, y3);
        ctx.fillText('6', x6, y6);
        ctx.fillText('9', x9, y9);
    }



    async drawCircleBackground (ctx) {
        var startRad = 0;

        ctx.beginPath();
        ctx.lineWidth = this.clockThickness;
        ctx.arc(this.centerX, this.centerY, this.clockRadius, startRad, this.fullCircle);
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
    }



    async drawCenterIcon (ctx) {
        try {
            ctx.fillStyle = 'white';

            const image = new Image(this.canvas, ICON_SIZE, ICON_SIZE);

            let image_actual = dataIcons["icon_" + this.props.today.icon];
            let imageURI = RNImage.resolveAssetSource(image_actual).uri;

            image.src = imageURI;
            image.addEventListener('load', () => {
                let x = CANVAS_CENTER_X - (ICON_SIZE / 2);
                let y = CANVAS_CENTER_Y - this.clockRadius;
                ctx.drawImage(image, x, y, ICON_SIZE, ICON_SIZE);
            });
    
            image.addEventListener('error', (e) => {
                console.log("! Error loading image in canvas...");
                console.log(e);
                ctx.fillText("error loading image", 20, 20);
                ctx.fillText("error loading " + this.props.today.icon, 20, 40);
            });
        } catch (e) {
            console.error(e);
        }
    }



    /**
     * draw tick marks around the next-60-minute gauge
     * 
     * @param {canvas2dDrawingContext} ctx 
     */
    drawMinuteTicks (ctx) {
        var tickR = this.clockRadius;
        var minuteTick = this.fullCircle / 60;
            
        // draw clock tickmarks
        for (var i = 1; i <= 60; i++) {
            // every 3rd hour (12, 3, 6 & 9)
            if (i % 5 == 0) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#333';
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, tickR, i * minuteTick - 0.005, i * minuteTick + 0.005);
                ctx.stroke();
            } else {
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#444';
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, tickR, i * minuteTick - 0.002, i * minuteTick + 0.002);
                ctx.stroke();
            }
        }
    }



    /**
     * draw tick marks around the next-12-hours gauge
     * 
     * @param {canvs2dDrawingContext} ctx 
     */
    drawHourTicks (ctx) {
        var tickR = this.clockRadius + (this.clockThickness / 2) - 2;
        var hourTick = this.fullCircle / 12;
            
        // draw clock tickmarks
        for (var i = 1; i <= 12; i++) {
            // every 3rd hour (12, 3, 6 & 9)
            if (i % 3 == 0) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#333';
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, tickR, i * hourTick - 0.03, i * hourTick + 0.03);
                ctx.stroke();
            } else {
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#444';
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, tickR, i * hourTick - 0.01, i * hourTick + 0.01);
                ctx.stroke();
            }
        }
    }



    /**
     * for each hour of the next 12 hours in hourlyData, draw an arc representing the predicted precipitation
     * 
     * @param {canvas2dDrawingContext} ctx 
     * @param {Object} hourlyData 
     */
    draw12HourTemperatures (ctx, hourlyData) {
        var hourTick = this.fullCircle / 12;
        var minuteTick = hourTick / 60;
        var startRad = 0;
        let now = new Date(Date.now());
        let currentMinute = now.getMinutes();

        // use only the next 12 hours
        hourlyData = hourlyData.slice(0, 12);

        if (hourlyData[0].date) {
            var startHour = hourlyData[0].date.getHours() % 12;
            startRad = this.clockTop + (startHour * hourTick) + (currentMinute * minuteTick);

            // get the highest and lowest temps for the next 12 hours
            hourlyData.forEach((hour) => {
                if (hour.temp > this.todayHighTemp) {
                    this.todayHighTemp = hour.temp;
                }
                if (hour.temp < this.todayLowTemp) {
                    this.todayLowTemp = hour.temp;
                }
            });

            // draw the temp gauge around the inside of the clock
            for (var i = 0; i < 11; i++) {
                var hour = hourlyData[i];
                var r = (hour.temp - this.todayLowTemp) / (this.todayHighTemp - this.todayLowTemp);
                ctx.strokeStyle = 'rgb(' + (r * 255) + ', 119, 255)';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.clockRadius - this.clockThickness / 2, (i * hourTick) + startRad, (i * hourTick) + hourTick + startRad);
                ctx.stroke();
            }
        }
    }



    /**
     * draw the current temperature in the center of the gauge
     * 
     * this method is async because it calls ctx.measureText and all 2d context calls are async
     * 
     * @param {*} ctx 
     */
    async drawTemperatureText (ctx) {
        
        let tempString = this.props.today.temp + '°';

        try {
            // set the font here so the measurements come out correctly
            ctx.font = FONT_CURRENT_TEMP;
            var currentTempMeasure = await ctx.measureText(tempString);
            var currentTempWidth = currentTempMeasure.width;

            // .... wait for ctx.measureText to return

        } catch (e) {
            console.log("couldn't get text measurements from ctx");
            console.error(e);
        }

        // setup context and calc position
        ctx.fillStyle = FONT_COLOR;
        ctx.font = FONT_CURRENT_TEMP;
        let x = CANVAS_CENTER_X - (currentTempWidth);
        let y = CANVAS_CENTER_Y + (FONT_SIZE_CURRENT_TEMP * 0.8) + VERTICAL_PADDING;

        // draw shadow effect
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillText(tempString, x + 2, y + 2);
        // draw text
        ctx.fillStyle = FONT_COLOR;
        ctx.fillText(tempString, x, y);

    }



    /**
     * draws the current weather description text underneath the weather icon
     * 
     * @param {CanvasDrawingContext2D} ctx 
     */
    async drawDescriptionText (ctx) {
        try {
            let descriptionText = this.props.today.desc.toUpperCase();
            let textMeasure = await ctx.measureText(descriptionText);
            let desc_width = textMeasure.width;

            let x = CANVAS_CENTER_X - (desc_width / 2);
            let y = CANVAS_CENTER_Y + (VERTICAL_PADDING / 2);

            
            ctx.font = FONT_DESC;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillText(descriptionText, x + 1, y + 1);

            ctx.fillStyle = FONT_COLOR;
            ctx.fillText(descriptionText, x, y);

        } catch (e) {
            console.log("Error trying to draw description text");
            console.error(e);
        }
    }



    /**
     * draws the "temperature key" that indicates high and low temp colors
     * 
     * @param {CanvasDrawingContext2D} ctx 
     */
    async drawTemperatureKey (ctx) {

        try {

            var tempGrad = await ctx.createLinearGradient(TEMP_KEY_X, TEMP_KEY_Y + VERTICAL_PADDING, TEMP_KEY_X, TEMP_KEY_Y + TEMP_KEY_HEIGHT + VERTICAL_PADDING);
            tempGrad.addColorStop(0, COLOR_HIGH_TEMP);
            tempGrad.addColorStop(1, COLOR_LOW_TEMP);

            ctx.fillStyle = tempGrad;
            ctx.fillRect(TEMP_KEY_X + HORIZONTAL_PADDING, TEMP_KEY_Y + VERTICAL_PADDING, TEMP_KEY_WIDTH, TEMP_KEY_HEIGHT);
            ctx.beginPath();
            ctx.rect(TEMP_KEY_X + HORIZONTAL_PADDING, TEMP_KEY_Y + VERTICAL_PADDING, TEMP_KEY_WIDTH, TEMP_KEY_HEIGHT);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#000';

            let highString = 'H: ' + String(this.props.today.high) + '°';
            let lowString = 'L: ' + String(this.props.today.low) + '°';

            let high_temp_x = TEMP_KEY_X + (TEMP_KEY_WIDTH * 2) + HORIZONTAL_PADDING;
            let high_temp_y = TEMP_KEY_Y + FONT_SIZE_HL_TEMP + VERTICAL_PADDING;
    
            let low_temp_x = high_temp_x;
            let low_temp_y = high_temp_y + (FONT_SIZE_HL_TEMP * 1.25);
    
            
            ctx.font = FONT_HL_TEMP;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillText(highString, high_temp_x + 1, high_temp_y + 1);
            ctx.fillStyle = COLOR_HIGH_TEMP;
            ctx.fillText(highString, high_temp_x, high_temp_y);
            
           
            ctx.font = FONT_HL_TEMP;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillText(lowString, low_temp_x + 1, low_temp_y + 1);
            ctx.fillStyle = COLOR_LOW_TEMP;
            ctx.fillText(lowString, low_temp_x, low_temp_y);

        } catch (e) {
            console.log("Error drawing temp key");
            console.error(e);
        }
    }



    /**
     * fill in the next-12-hours gauge by drawing an arc to represent predicted precipitation from hourly data
     * 
     * @param {CanvasDrawingContext2D} ctx 
     * @param {Object} hourlyData 
     */
    draw12HourPrecip (ctx, hourlyData) {

        var hourTick = this.fullCircle / 12;
        var minuteTick = hourTick / 60;
        var startRad = 0;
        let now = new Date(Date.now());
        let startMinute = now.getMinutes();

        if (hourlyData[0].date) {
            var startHour = hourlyData[0].date.getHours() % 12;
            startRad = this.clockTop + (startHour * hourTick) + (startMinute * minuteTick);
            
            hourlyData = hourlyData.slice(0, 12);

            for (var i = 0; i < 11; i++) {
                var hour = hourlyData[i];
                var nextHour = hourlyData[i+1];
                var prevHour = hourlyData[i-1];

                // only draw precip bars if the PoP is over 20%
                if (hour.pop > MIN_PRECIP) {

                    ctx.lineWidth = this.clockThickness;
                    let color = this.calcStrokeColor(hour);
                    ctx.strokeStyle = color;
                    ctx.beginPath();
                    ctx.arc(this.centerX, this.centerY, this.clockRadius, (i * hourTick) + startRad, (i * hourTick) + hourTick + startRad);
                    ctx.stroke();
                }
            } // end for
        }
    }



    /**
     * mark the current time with a gold thingie, and fade the clock one hour before that
     *  
     * @param {CanvasDrawingContext2D} ctx 
     */
    async drawCurrentTimeMarker (ctx) {

        try {
            var goldGrad = await ctx.createRadialGradient(this.centerX, this.centerY, this.clockRadius - (this.clockThickness * 0.75), this.centerX, this.centerY, this.clockRadius + (this.clockThickness * 0.75));
            goldGrad.addColorStop(0, 'rgb(209, 164, 40)');
            goldGrad.addColorStop(0.5, 'rgb(255, 235, 82)');
            goldGrad.addColorStop(0, 'rgb(209, 164, 40)');

        } catch (e) {
            console.error(e);
        }

        let now = new Date(Date.now());
        let thisHour = now.getHours();
        let thisMinute = now.getMinutes();

        let hourTick = this.fullCircle / 12;
        let minuteTick = hourTick / 60;
        
        let clockTop = this.fullCircle * 0.75;

        // fade the circle before current time
        let prevHour = thisHour - 1;
        let fadeStart = clockTop + ((prevHour % 12) * hourTick) + (thisMinute * minuteTick);
        for (let i = 0; i < 60; i++) {
            let opacity = Utils.mapRange(i, 0, 60, 0, 1);
            ctx.strokeStyle = `rgba(28, 158, 255, ${opacity * 2})`;
            ctx.lineWidth = this.clockThickness;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.clockRadius, fadeStart + (i * minuteTick), fadeStart + (i * minuteTick) + minuteTick);
            ctx.stroke();
        }

        // draw the gold marker
        let startRad = clockTop + ((thisHour % 12) * hourTick) + (thisMinute * minuteTick);

        ctx.strokeStyle = goldGrad;
        ctx.lineWidth = this.clockThickness * 1.5;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.clockRadius, startRad, startRad + 0.05);
        ctx.stroke();
    }



    /**
     * main drawing func, determines the order in which each piece gets drawn to the canvas
     */
    async drawingOrchestrator () {
        try {
            this.ctx.clearRect(0, 0, this.deviceWidth, this.deviceWidth);
            await this.drawCircleBackground(this.ctx);
            await this.drawBackgroundCircles(this.ctx, this.props.hourly);
            
            this.drawClockLabels(this.ctx);

            this.draw12HourPrecip(this.ctx, this.props.hourly);            
            this.drawHourTicks(this.ctx);
            this.drawMinuteTicks(this.ctx);            
            
            this.draw12HourTemperatures(this.ctx, this.props.hourly);
            
            // functions that use data retrieved from the context object are async
            await this.drawTemperatureText(this.ctx);
            await this.drawTemperatureKey(this.ctx);
            await this.drawDescriptionText(this.ctx);
            await this.drawHighlights(this.ctx);
            
            this.drawCurrentTimeMarker(this.ctx);
            this.drawCenterIcon(this.ctx);

        } catch (e) {
            console.log("ERROR: Error trying to draw gauge");
            console.error(e);
        }
    }



    /**
     * get the context from react-native-canvas and set it's size
     * 
     */
    async initCanvas () {
        try {
            this.canvas.height = this.deviceWidth * 0.95;
            this.canvas.width = this.deviceWidth * 0.95;
            this.ctx = await this.canvas.getContext('2d');

        } catch (err) {
            console.error(err);
        }
        
    }



    /**
     * when the component mounts, fill the new state, setup the canvas, and begin drawing
     */
    async componentDidMount() {
        // once the component is mounted we should be able to draw the canvas
        console.log("INFO: -- WeatherGauge -- componentDidMount");
        await this.initCanvas();
        this.drawingOrchestrator();
    }



    /**
     * keep track of whether this component is going to unmount so we don't try to update the state of an unmounted component
     */
    componentWillUnmount() {
        this._isMounted = false;
    }



    /**
     * check to see if we got new data passed via props and update the canvas if so
     * 
     * @param {props} prevProps 
     */
    componentDidUpdate(prevProps, prevState) {
        console.log("INFO: -- WeatherGauge -- componentDidUpdate");
        this.drawingOrchestrator();
            
    }



    render = () => {
        return (
            <View style={{}}>
                <Canvas ref={(canvas) => {this.canvas = canvas}}/>
            </View>
        )
    }
}

export default WeatherGauge;