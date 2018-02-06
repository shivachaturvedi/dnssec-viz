const geoIp2 = require('geoip2');
const express = require('express');
const router = express.Router();

geoIp2.init();


router.get('/', (req, res, next) => {
    "use strict";
    let ip = req.param('ip');

    console.log(geoIp2.lookupSync(ip));

    geoIp2.lookup(ip, (error, result) => {
        if (error) {
            res.sendStatus(404);
        }
        else if (result) {
            res.json(result);
        }
    });
});

module.exports = router;

