'use strict';

var express = require('express'),
    router = express.Router(),
    auth = require('../middlewares/auth');

router.get('/movies', auth, function(request, response) {
    response.render('pages/movies');
});

module.exports.router = router;
