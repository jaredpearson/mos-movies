'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');

router.get('/movies', auth, (request, response) => {
    response.render('pages/movies');
});

module.exports.router = router;
