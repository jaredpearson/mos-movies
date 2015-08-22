'use strict';

var express = require('express'),
    router = express.Router(),
    auth = require('../middlewares/auth'),
    db = require('../db'),
    movieRatingsDataService = require('../data_services/movie_ratings'),
    views = require('../views'),
    Q = require('q');

router.param('id', function(request, response, next, value) {
    if (!request.params) {
        request.params = {};
    }
    request.params.id = value;
    return next();
});
router.patch('/movies/:id.json', auth, function(request, response) {
    var myRating = request.body.myRating,
        movieId = request.params.id,
        contextUserId = request.session.user_id;

    if (!myRating) {
        response.status(400).json({
            error: 'myRating was not defined'
        });
        return;
    }
    var validationErrors = movieRatingsDataService.validateMovieRatingValue(myRating);
    if (validationErrors.length > 0) {
        response.status(400).json({
            error: validationErrors[0] // TODO allow for multiple error messages
        });
    }

    var client;
    db.connect()
        .then(function(c) {
            client = c;
            return Q(c);
        })
        .then(function() {
            return movieRatingsDataService.hasUserRatedMovie(client, movieId, contextUserId);
        })
        .then(function(hasUserRatedMovie) {
            if (hasUserRatedMovie) {
                console.log('Updating rating');
                return movieRatingsDataService.updateMovieRating(client, movieId, contextUserId, myRating);
            } else {
                console.log('Inserting new rating');
                return movieRatingsDataService.insert(client, movieId, contextUserId, myRating);
            }
        })
        .then(function(movieRatingId) {
            response.json({
                movie_ratings_id: movieRatingId
            });
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