// locator component

import React, { Component } from 'react';
import {Text, View, TextInput, TouchableOpacity, StyleSheet, Image} from 'react-native';

import { Utils } from './Utils';

export default class Locator extends Component {


    constructor (props) {
        super(props);
        this.textInput = React.createRef();
    }

    state = {
        editing: false,
    }



    /**
     *  Focus on TextInput when we're in edit mode
     * 
     * @param {props} prevProps 
     * @param {state} prevState 
     * @param {*} snapshot 
     */
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.state.editing) {
            this.textInput.current.focus();
        }
    }


    /**
     * When a user presses the search bar, change the state to editing so we can focus on the textinput
     * 
     * @param {event} event : the event object for pressing the location button
     */
    handleSearchPress = (event) => {
        this.setState({
            editing: true,
        });
    }


    /**
     *  Fire's the getLocationCallback from App.js to get weather data for phone's GPS location
     * 
     * @param {event} event : onPress from "current location" TouchableOpacity
     */
    handleLocatorPress = (event) => {
        this.props.getLocationCallback();
    }



    /**
     * Fire's the refreshCallback from App.js to refresh the current location's weather data
     * 
     * @param {event} event : onPress from "refresh" TouchableOpacity
     */
    handleRefreshPress = (event) => {
        this.props.refreshCallback();
    }


    /**
     * 
     * @param {event} event : onBlur event object on the TextInput
     */
    _onSubmitEdit = (event) => {
        this.props.searchCallback(event);
        this.setState({editing: false});
    }

    render () {

        return (

            <View style={styles.container}>
                
                <TouchableOpacity onPress={this.handleLocatorPress}>
                    <Image source={require('./asset/locationIcon.png')} style={styles.buttonLocate}/>
                </TouchableOpacity>

                {!this.state.editing
                    ? <TouchableOpacity onPress={this.handleSearchPress}>
                        <Text style={styles.locationText}>{this.props.city + ", " + this.props.state}</Text>
                      </TouchableOpacity>

                    : <TextInput ref={this.textInput} style={styles.searchInput} placeholder="search" onSubmitEditing={this._onSubmitEdit} onBlur={(e) => this.setState({editing: false})} />
                }

                <TouchableOpacity onPress={this.handleRefreshPress}>
                    <Image source={require('./asset/refreshIcon.png')} style={styles.buttonSearch}/>
                </TouchableOpacity>

            </View>
        
        );

    }
}

const styles = StyleSheet.create({

    container: {
        flexDirection: "row",
        padding: 20,
        margin: 20,
    },

    locationText: {
        fontSize: 20,
        color: '#fff'
    },

    searchInput: {
        paddingLeft: 10,
        paddingRight: 10,
        fontSize: 18,
        color: '#fff',
        borderWidth: 2,
        borderRadius: 5,
        borderColor: '#eee',
        borderStyle: "solid",
        width: 200
    },

    buttonSearch: {
        width: 32,
        height: 32,
        marginLeft: 15
    },

    buttonLocate: {
        width: 32,
        height: 32,
        marginRight: 15
    }
});