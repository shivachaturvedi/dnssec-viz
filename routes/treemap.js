var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/treemap', function(req, res, next) {
    res.render('treemap', {});
});

module.exports = router;
