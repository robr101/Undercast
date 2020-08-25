import AsyncStorage from '@react-native-community/async-storage';

class KeyStorage {

    constructor () {

    }

    async store (key, value) {
        try {
            if (value) {
                await AsyncStorage.setItem(key, value);
            }
            
        } catch (e) {
            console.error(e);
        }
    }

    async get (key) {
        try {
            const value = await AsyncStorage.getItem(key);
            return value;
        } catch (e) {
            console.error(e);
        }
    }

    
}

const keyStore = new KeyStorage();
Object.freeze(keyStore);

export default keyStore;