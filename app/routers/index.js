'use strict';

var express = require('express'),
    router = express.Router();

router.use('/', require('./default').router);
router.use('/', require('./login').router);
router.use('/', require('./movies').router);
router.use('/', require('./movies_json').router);
router.use('/', require('./movies_id_json').router);
router.use('/', require('./movie_ratings_id_json').router);

module.exports.router = router;
