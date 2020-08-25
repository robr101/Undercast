// locator component

import React, { Component } from 'react';
import {Text, View, TextInput, TouchableOpacity} from 'react-native';

import { Utils } from './Utils';

class Locator extends Component {



    render () {
        <View>
        
            <TouchableOpacity onPress={this.click}>
                <Text style={{}}>{this.props.location_city + ", " + this.props.location_state}</Text>
            </TouchableOpacity>

            <TextInput style={styles.textLocation} placeholder={location_city + "," + location_state} onSubmitEditing={this.searchCity.bind(this)} />

        </View>
    }
}
