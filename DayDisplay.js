import React from 'react';
import {Text, View, Image, KeyboardAvoidingView} from 'react-native';

import { dotw } from './daysoftheweek';

const DayDisplay = (props) => {

    // TODO: move this to it's own file so I can share with weatherGauge
    icons = {
        "01d" : require('./new_icons/01d.png'),
        "01n" : require('./new_icons/01n.png'),
        "02d" : require('./new_icons/02d.png'),
        "02n" : require('./new_icons/02n.png'),
        "03d" : require('./new_icons/03d.png'),
        "03n" : require('./new_icons/03n.png'),
        "04d" : require('./new_icons/04d.png'),
        "04n" : require('./new_icons/04n.png'),
        "09d" : require('./new_icons/09d.png'),
        "09n" : require('./new_icons/09n.png'),
        "10d" : require('./new_icons/10d.png'),
        "10n" : require('./new_icons/10n.png'),
        "11d" : require('./new_icons/11d.png'),
        "11n" : require('./new_icons/11n.png'),
        "13d" : require('./new_icons/13d.png'),
        "13n" : require('./new_icons/13n.png'),
        "50d" : require('./new_icons/50d.png'),
        "50n" : require('./new_icons/50n.png'),
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
        <View
        style={{
            flex: 1,
            padding: 10,
            alignItems: 'center',
            margin: 5,
            borderRadius: 5,
            borderRadius: 5,
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1,
        }}>
            <Text style={{fontSize: 16, color: 'white'}}>{weekdayText}</Text>

            <Text style={{fontSize: 18}}>{props.day.max_temp}°F</Text>
            <Text style={{fontSize: 10, color: 'white'}}>L: {props.day.min_temp}°F {Math.round(props.day.pop * 100)} %</Text>

            <Image style={{width: 100, height: 100}} source={icon} />

            <Text style={{fontSize: 10, color: 'white'}}>
                {props.day.desc}
            </Text>

            <Text style={{fontSize: 10, color: 'white'}}>
                
            </Text>

        </View>
    )
}

export default DayDisplay;