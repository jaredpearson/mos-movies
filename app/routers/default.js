/**
 * Router for the homepage
 * URL: /
 */

'use strict';

var router = require('express').Router();

router.get('/', (request, response) => {
    response.redirect('/movies');
});

module.exports.router = router;
