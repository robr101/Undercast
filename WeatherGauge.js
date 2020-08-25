import React, { Component } from 'react';
import {Text, View, Dimensions} from 'react-native';

import { Utils } from './Utils';

import Canvas from 'react-native-canvas';

// scaled positional metrics
const FULL_CIRCLE = Math.PI * 2;
const DEVICE_WIDTH = Dimensions.get('window').width;
const CANVAS_CENTER_X = DEVICE_WIDTH / 2;
const CANVAS_CENTER_Y = DEVICE_WIDTH / 2;
const DEVICE_SCALE = DEVICE_WIDTH / 500; // interface was designed with 500px wide device
const NEXT_60_MIN_RAD = 175 * DEVICE_SCALE;   // next-60 gauge radius
const NEXT_12_HOUR_RAD = 200 * DEVICE_SCALE;    // outside gauge radius

// fonts
const FONT_SIZE_CURRENT_TEMP = 48;
const FONT_SIZE_HL_TEMP = 12;
const FONT_SIZE_CLOCK_LABELS = 16;

const FONT_CURRENT_TEMP = 'bold '+ FONT_SIZE_CURRENT_TEMP + 'px sans-serif';
const FONT_HL_TEMP = 'bold ' + FONT_SIZE_HL_TEMP + 'px sans-serif';
const FONT_DEBUG = '10px sans-serif';
const FONT_CLOCK_LABELS = 'bold ' + FONT_SIZE_CLOCK_LABELS + 'px serif';

const FONT_COLOR_CLOCK_LABELS = 'black';

// only draw precip lines if the PoP is greater than MIN_PRECIP
const MIN_PRECIP = 0.2;

const mapPopToAlpha = Utils.getMapRangeFunction(MIN_PRECIP, 1, 0.5, 1);

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
          }
    }



    /**
     * called after componentDidUpdate with new props, starts the drawing process
     */
    initGauge () {
        if (this._isMounted) {
            this.setState({
                hourly: this.props.data.hourly,
                minutely: this.props.data.minutely,
                today: this.props.data.today
            }, () => {
                // console.log("initGuage this.state: ")
                // console.log(this.state);
                this.drawGauge(this.ctx);
                console.log("initGauge()");
            });
            
        }
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

            } else if (hour.visiblity < 1000 && hour.visibility > 500) {
                // moderate snowfall

            } else if (hour.visibility < 500) {
                // heavy snowfall

            }
        }

        return 'rgba(0, 0, 0, 0)'
    }


    /**
     * 
     * draw the background of the gauges
     * 
     *  NOTE: this method is async because calls returning things from ctx are async
     * 
     * @param {canvas2dDrawingContext} ctx 
     * @param {Object} hourlyData 
     */
    async drawBackgroundCircles (ctx, hourlyData) {
        var hourTick = this.fullCircle / 12;
        var minuteTick = hourTick / 60;
        // var startRad = this.clockTop + (hourlyData[0].date.getHours() % 12) * hourTick;

        var startRad = 0;

        try {
            var clockGrad = await ctx.createRadialGradient(this.centerX, this.centerY, this.clockRadius - (this.clockThickness / 2), this.centerX, this.centerY, this.clockRadius + (this.clockThickness / 2));

            clockGrad.addColorStop(0, 'rgba(150, 150, 150, 0.6)');
    
            clockGrad.addColorStop(0.2, 'rgba(150, 150, 150, 0.1)');
            clockGrad.addColorStop(0.5, 'rgba(150, 150, 150, 0.25)');
            clockGrad.addColorStop(0.8, 'rgba(150, 150, 150, 0.1)');
            clockGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.2');
            clockGrad.addColorStop(0.88, 'rgba(150, 150, 150, 0.1');
            clockGrad.addColorStop(1, 'rgba(150, 150, 150, 0.6)');
        } catch (error) {
            console.log("couldn't create clock gradient for background circles");
            console.error(error);
        }


        ctx.strokeStyle = clockGrad;
        ctx.lineWidth = this.clockThickness;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.clockRadius, startRad, this.fullCircle);
        console.log("after drawbackground circles");
        ctx.stroke();
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



    /**
     * draw tick marks around the next-60-minute gauge
     * 
     * @param {canvas2dDrawingContext} ctx 
     */
    drawMinuteTicks (ctx) {
        var tickR = this.minuteRadius;
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

        hourlyData = hourlyData.slice(0, 12);
        if (hourlyData[0].date) {
            var startHour = hourlyData[0].date.getHours() % 12;
            var startMinute = hourlyData[0].date.getMinutes();
            startRad = this.clockTop + (startHour * hourTick) + (startMinute * minuteTick);

            // use only the next 12 hours
            hourlyData = hourlyData.slice(0, 12);

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
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.clockRadius - this.clockThickness / 2, (i * hourTick) + startRad, (i * hourTick) + hourTick + startRad);
                ctx.stroke();
            }

            // DEBUG stuff
            // ctx.font = FONT_DEBUG;
            // ctx.fillStyle = 'black';
            // ctx.fillText("High: " + this.todasyHighTemp, 10, 30);
            // ctx.fillText("Low: " + this.todayLowTemp, 10, 40);
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
        
        let tempString = this.state.today.currentTemp + '°F';
        let highString = 'H: ' + String(this.todayHighTemp) + '°' + this.tempUnit;
        let lowString = 'L: ' + String(this.todayLowTemp) + '°' + this.tempUnit;
        ctx.font = FONT_CURRENT_TEMP;

        try {
        
            // all ctx responses are promises
            var currentTempMeasure = await ctx.measureText(tempString);
            ctx.font = FONT_HL_TEMP;
            var highTempMeasure = await ctx.measureText(highString);
            var lowTempMeasure = await ctx.measureText(lowString);

            var currentTempWidth = currentTempMeasure.width;
            var highTempWidth = highTempMeasure.width;
            var lowTempWidth = lowTempMeasure.width;
            // .... wait for ctx.measureText to return
        } catch (e) {
            console.log("couldn't get text measurements from ctx");
            console.error(e);
        }

        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.font = FONT_CURRENT_TEMP;
        ctx.fillText(tempString, this.centerX - (currentTempWidth / 2), this.centerY);
        // console.log(dimens);

        let high_temp_x = this.centerX - (currentTempWidth / 2);
        let high_temp_y = this.centerY + FONT_SIZE_HL_TEMP;

        let low_temp_x = this.centerX + (currentTempWidth / 2) - lowTempWidth;
        let low_temp_y = this.centerY + FONT_SIZE_HL_TEMP;

        ctx.fillStyle = 'rgb(255, 119, 255)';
        ctx.font = FONT_HL_TEMP;
        ctx.fillText(highString, high_temp_x, high_temp_y);
        
        ctx.fillStyle = 'rgb(0, 119, 255)';
        ctx.font = FONT_HL_TEMP;
        ctx.fillText(lowString, low_temp_x, low_temp_y);
    }



    /**
     * fill in the next-60-minutes gauge by drawing an arc to represent predicted precipitation from minutely data
     * 
     * @param {canvas2dDrawingContext} ctx 
     * @param {Object} minutelyData 
     */
    drawNextHourPrecip (ctx, minutelyData) {
        
        var eachMinute = this.fullCircle / 60;

        ctx.lineWidth = this.minuteThickness;

        minutelyData.forEach((minute, i) => {
            if (minute.precipitation > 0) {
                // console.log("Drawing minute " + i);
                ctx.strokeStyle = '#00f';
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.minuteRadius, i * eachMinute, (i * eachMinute) + eachMinute);
                ctx.stroke();
            }
        });

    }



    /**
     * fill in the next-12-hours gauge by drawing an arc to represent predicted precipitation from hourly data
     * 
     * @param {canvas2dDrawingContext} ctx 
     * @param {Object} hourlyData 
     */
    draw12HourPrecip (ctx, hourlyData) {

        var hourTick = this.fullCircle / 12;
        var minuteTick = hourTick / 60;
        var startRad = 0;

        if (hourlyData[0].date) {
            var startHour = hourlyData[0].date.getHours() % 12;
            var startMinute = hourlyData[0].date.getMinutes();
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
            }
            
        }

    }



    /**
     * draw a little mark where the current time is on the next-12-hours gauge
     * 
     * @param {canvas2dDrawingContext} ctx 
     */
    drawCurrentTimeMarker = (ctx) => {
        var now = new Date(Date.now());
        var thisHour = now.getHours();
        var thisMinute = now.getMinutes();

        var hourTick = this.fullCircle / 12;
        var minuteTick = hourTick / 60;
        
        var clockTop = this.fullCircle * 0.75;
        var startRad = clockTop + ((thisHour % 12) * hourTick) + (thisMinute * minuteTick);

        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = this.clockThickness;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.clockRadius, startRad, startRad + 0.01);
        ctx.stroke();
    }

    /**
     * main drawing func, determines the order in which each piece gets drawn to the canvas
     */
    async drawGauge () {
        console.log("drawGauge");

        try {
            this.ctx.clearRect(0, 0, this.deviceWidth, this.deviceWidth);
        
            await this.drawBackgroundCircles(this.ctx, this.state.hourly);
            
            this.drawClockLabels(this.ctx);
            this.drawNextHourPrecip(this.ctx, this.state.minutely);
            this.draw12HourPrecip(this.ctx, this.state.hourly);            
            this.drawHourTicks(this.ctx);

            // this.drawMinuteTicks(this.ctx);
            
            this.drawCurrentTimeMarker(this.ctx);
            this.draw12HourTemperatures(this.ctx, this.state.hourly);
            
            await this.drawTemperatureText(this.ctx);
            // this.drawTemperatureText(this.ctx);
            await this.drawHighlights(this.ctx);
        } catch (e) {
            console.log("Error trying to draw gauge");
            console.error(e);
        }
        

    }



    /**
     * draws a yellow square, use to debug if canvas isn't updating
     * 
     * @param {canvas2dDrawingContext} ctx 
     */
    drawYellowBox(ctx) {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 0, 500, 500);
    }



    /**
     * get the context from react-native-canvas and set it's size
     * 
     * @param {canvas2dDrawingContext} canvas 
     */
    async initCanvas (canvas) {

        if (!canvas)
            return;
        
        try {
            canvas.height = this.deviceWidth * 0.95;
            canvas.width = this.deviceWidth * 0.95;
            this.ctx = await canvas.getContext('2d');

            // this.drawGauge(this.ctx);
        } catch (err) {
            console.error(err);
        }
        
    }
    


    /**
     * keep track of whether this component is going to unmount so we don't try to update the state of an unmounted component
     */
    componentDidMount() {
        this._isMounted = true;
    }



    /**
     * keep track of whether this component is going to unmount so we don't try to update the state of an unmounted component
     */
    componentWillUnmount() {
        // this._isMounted = false;
    }



    /**
     * check to see if we got new data passed via props and update the canvas if so
     * 
     * @param {props} nextProps 
     */
    componentDidUpdate(nextProps) {
        if (nextProps.data.hourly !== this.state.hourly)
            this.initGauge(this.ctx);
    }



    /**
     * 
     */
    render = () => {
        return (
            <View style={{}}>
                <Canvas ref={this.initCanvas.bind(this)}/>
            </View>
        )
    }
}

export default WeatherGauge;