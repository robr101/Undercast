

export const Utils = {
    /**
     *  Converts Kelvin to (Rounded) Fahrenheit
     *  
     *  @param k (number): degrees Kelvin
     *  @return (number): degrees Fahrenheit rounded
     */
    KtoF: (k) => {
       return (k - 273.15) * (9 / 5) + 32;
    },
    
    KtoC: (k) => {
        return k - 273.15;
    },

    getRoundingConversionFunc: (conversionFunc) => {
        return (temp) => {
            Math.round(conversionFunc(temp));
        }
    },

    componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    },

    rgbToHex(r, g, b) {
        return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    },

    mapRange (val, x1, y1, x2, y2) {
        return (val - x1) * (y2 - x2) / (y1 - x1) + x2;
    },

    getMapRangeFunction (x1, y1, x2, y2) {
        return ((val) => {
            return (val - x1) * (y2 - x2) / (y1 - x1) + x2;
        });
    }

}