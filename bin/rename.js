const dir = require('node-dir');
const loadJsonFile = require('load-json-file');
const fs = require('fs');

dir.paths('./data', function(err, paths) {
    if (err) throw err;
    //console.log('subdirs:\n', paths.dirs);
    paths.dirs.forEach((path) => {
        let file = path + '/admin_level_4.geojson';

        let json = loadJsonFile.sync(file);

        if(json.features[2]){
            if(json.features[2].properties['ISO3166-2']){
                let countryCode = json.features[2].properties['ISO3166-2'];
                countryCode = countryCode.split('-')[0];
                //console.log(countryCode.split('-')[0]);

                let newPath = './renamed/' + countryCode +'_level_4.geojson';

                fs.writeFileSync(newPath, JSON.stringify(json));
            }

        }else{
            console.log('Not found:', file);
        }


        //console.log(json.features);
        //console.log(file);
    });
});
//console.log(files);