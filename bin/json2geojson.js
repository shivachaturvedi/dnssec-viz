const geoIp2 = require('geoip2');
const jsonFile = require('./20171003.json');
const fs = require('fs');

geoIp2.init();

let geoJsonArr = {
    type: 'FeatureCollection',
    features: []
};
let promises = [];
Object.entries(jsonFile).forEach(([key, value]) => {
    let geoJson = {
        type: 'Feature',
        geometry: {
            type: 'Point'
        }
    };
    geoJson['properties'] = value;

    let locationPromise = new Promise((reject, resolve) => {
        geoIp2.lookup(key, (error, result) => {
            if (error) {
                reject(error);
            }
            if (result && result.location) {
                geoJson.ip = key;
                geoJson.geometry['coordinates'] = [result.location.latitude, result.location.longitude];
                resolve(geoJson);
                if (result.subdivisions) {
                    geoJson.properties['subdivision_code'] = `${result.country['iso_code']}-${result.subdivisions[0]['iso_code']}`;
                }
            } else {
                reject('No location');
            }
        });
    });
    promises.push(locationPromise);
});

Promise.all(promises.map(promise => promise.catch(e => e)))
    .then(results => {
        results = results.filter(value => Object.keys(value).length !== 0);
        results = results.filter(value =>
            value.geometry &&
            value.geometry.coordinates &&
            value.geometry.coordinates.length == 2);
        console.log(results);
        geoJsonArr.features = results;
        fs.writeFile('geojson.json', JSON.stringify(geoJsonArr), err => {
            "use strict";
            if (err) {
                console.error(err);
            }
        });
    })
    .catch(e => console.error(e));
