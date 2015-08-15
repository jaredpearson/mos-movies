'use strict';

var router = require('express').Router(),
    auth = require('../middlewares/auth'),
    db = require('../db'),
    movieRatingsDataService = require('../data_services/movie_ratings'),
    views = require('../views'),
    Q = require('q');

router.delete('/movie-ratings/:id.json', auth, function(request, response) {
    var movieRatingId = request.params.id,
        contextUserId = request.session.user_id,
        client;

    if (!movieRatingId) {
        response.sendStatus(400);
        return;
    }

    db.connect()
        .then(function(c) {
            client = c;
        })
        .then(function() {
            return movieRatingsDataService.deleteRating(client, movieRatingId, contextUserId);
        })
        .then(function() {
            response.sendStatus(200);
        })
        .fail(function(err) {
            views.showErrorPage(response, err);
        })
        .fin(function() {
            client.done();
        })
        .done();
});

module.exports.router = router;
