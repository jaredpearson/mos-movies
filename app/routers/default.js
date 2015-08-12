'use strict';

var router = require('express').Router();

router.get('/', function(request, response) {
    response.redirect('/movies');
});

module.exports.router = router;
