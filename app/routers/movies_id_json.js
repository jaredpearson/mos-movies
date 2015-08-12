'use strict';

var express = require('express'),
    router = express.Router(),
    auth = require('../middlewares/auth'),
    db = require('../db'),
    movieRatingsDataService = require('../data_services/movie_ratings');

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

    db.connect(function(err, client, done) {
        if (db.handleDbError(response, client, done, err)) {
            return;
        }

        function finished(movieRatingId) {
            client.query('COMMIT', function(err) {
                if (db.handleDbError(response, client, done, err)) {
                    return;
                }

                done();
                response.json({
                    movie_ratings_id: movieRatingId
                });

            });
        };

        console.log('Checking if movie rating already exists');
        client.query('SELECT count(*) FROM movie_ratings WHERE movie = $1 AND created_by = $2', [movieId, contextUserId], function(err, result) {
            if (db.handleDbError(response, client, done, err)) {
                return;
            }

            function handleMovieRatingInsertFinished(err, result) {
                if (db.handleDbError(response, client, done, err)) {
                    return;
                }
                var movieRatingId = result.rows[0].movie_ratings_id;
                console.log('Inserted movie rating', movieRatingId);

                finished(movieRatingId);
            };

            if (result.rowCount > 0 && result.rows[0].count > 0) {
                console.log('Updating rating');
                client.query('UPDATE movie_ratings SET value = $3 WHERE movie = $1 AND created_by = $2', [movieId, contextUserId, myRating], function(err) {
                    if (db.handleDbError(response, client, done, err)) {
                        return;
                    }

                    finished();
                });
            } else {
                console.log('Inserting new rating');
                movieRatingsDataService.insert(client, handleMovieRatingInsertFinished, movieId, contextUserId, myRating);
            }
        });
    });

});

module.exports.router = router;