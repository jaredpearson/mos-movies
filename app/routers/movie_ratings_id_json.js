'use strict';

var router = require('express').Router(),
    auth = require('../middlewares/auth'),
    db = require('../db'),
    movieRatingsDataService = require('../data_services/movie_ratings');

router.delete('/movie-ratings/:id.json', auth, function(request, response) {
    var movieRatingId = request.params.id,
        contextUserId = request.session.user_id;

    if (!movieRatingId) {
        response.sendStatus(400);
        return;
    }

    db.connect(function(err, client, done){
        if (db.handleDbError(response, client, done, err)) {
            return;
        }

        movieRatingsDataService.delete(client, movieRatingId, contextUserId, function(err) {
            if (db.handleDbError(response, client, done, err)) {
                return;
            }
            response.sendStatus(200);
        });
    });
});

module.exports.router = router;
