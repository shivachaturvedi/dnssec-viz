const loadJsonFile = require('load-json-file');
const fs = require('fs');

const path = '../public/javascripts/';
let json = loadJsonFile.sync(path + 'countries_osm.geojson');
json.features = json.features
    .filter(feature => feature.properties["ISO3166-1:alpha2"] && feature.properties["name:en"])
    .map(feature => {
        return {
            id: feature.id,
            osm_type: feature.osm_type,
            type: feature.type,
            name: feature.name,
            properties: {iso_a2: feature.properties["ISO3166-1:alpha2"], name: feature.properties["name:en"]},
            geometry: feature.geometry
        }
    });

fs.appendFileSync(path+'countries_osm_min.geojson', JSON.stringify(json));
console.log('done');
/*
.then(json => {
    let tempJson = {};
    tempJson.id = json.features


    let extracted = json.features
        .filter(feature => feature.properties["ISO3166-1:alpha2"] && feature.properties["name:en"])
        .map(feature => {
            return {
                id: feature.id,
                osm_type: feature.osm_type,
                type: feature.type,
                name: feature.name,
                properties: {iso_a2: feature.properties["ISO3166-1:alpha2"], name: feature.properties["name:en"]},
                geometry: feature.geometry
            }
        });
    console.log(extracted);
//=> {foo: true}
});*/
