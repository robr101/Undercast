import React from 'react';
import {Text, View, Image} from 'react-native';

import { dotw } from './daysoftheweek';

const DayDisplay = (props) => {

    // TODO: move this to it's own file so I can share with weatherGauge
    icons = {
        "01d" : require('./icons/01d.png'),
        "01n" : require('./icons/01n.png'),
        "02d" : require('./icons/02d.png'),
        "02n" : require('./icons/02n.png'),
        "03d" : require('./icons/03d.png'),
        "03n" : require('./icons/03n.png'),
        "04d" : require('./icons/04d.png'),
        "04n" : require('./icons/04n.png'),
        "09d" : require('./icons/09d.png'),
        "09n" : require('./icons/09n.png'),
        "10d" : require('./icons/10d.png'),
        "10n" : require('./icons/10n.png'),
        "11d" : require('./icons/11d.png'),
        "11n" : require('./icons/11n.png'),
        "13d" : require('./icons/13d.png'),
        "13n" : require('./icons/13n.png'),
        "50d" : require('./icons/50d.png'),
        "50n" : require('./icons/50n.png'),
    };

    // console.log("DayDisplay props:");
    // console.log(props);
    let date = new Date(props.day.dt * 1000);
    let weekdayText = dotw[date.getDay()];
    if (weekdayText) {
        weekdayText = weekdayText.toUpperCase();
    }

    let icon = icons[props.day.icon];

    return (
        <View style={{
            flex: 1,
            backgroundColor: '#fafafa',
            padding: 10,
            alignItems: 'center',
            margin: 5,
            borderRadius: 5,
        }}>
            <Text style={{fontSize: 16, color: '#888'}}>{weekdayText}</Text>

            <Text style={{fontSize: 18}}>{props.day.max_temp}°F</Text>
            <Text style={{fontSize: 10, color: '#888'}}>L: {props.day.min_temp}°F {Math.round(props.day.pop * 100)} %</Text>

            <Image source={icon} />

            <Text style={{fontSize: 10, color: '#888'}}>
                {props.day.desc}
            </Text>

            <Text style={{fontSize: 10, color: '#888'}}>
                
            </Text>

        </View>
    )
}

export default DayDisplay;