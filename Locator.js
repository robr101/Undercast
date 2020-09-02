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

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.state.editing) {
            this.textInput.current.focus();
        }
    }

    handleSearchPress = (event) => {
        this.setState({
            editing: true,
        });
    }

    handleLocatorPress = (event) => {
        this.props.getLocationCallback();
    }

    handleRefreshPress = (event) => {
        this.props.refreshCallback();
    }

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
        color: '#000',
        borderWidth: 2,
        borderRadius: 5,
        borderColor: '#eee',
        borderStyle: "solid",
        backgroundColor: "#fff"
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