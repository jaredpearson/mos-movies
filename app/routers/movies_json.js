'use strict';

var express = require('express'),
    router = express.Router(),
    auth = require('../middlewares/auth'),
    db = require('../db'),
    movieRatingsDataService = require('../data_services/movie_ratings'),
    views = require('../views'), 
    Q = require('q');

router.get('/movies.json', auth, function(request, response) {
    var contextUserId = request.session.user_id,
        client;

    db.connect()
        .then(function(c) {
            client = c;
            return Q(c);
        })
        .then(function() {
            return client.query('SELECT movies.movies_id, movies.title, (SELECT avg(rating1.value) FROM movie_ratings rating1 WHERE rating1.movie = movies.movies_id) AS rating, rating.movie_ratings_id, rating.created_by, rating.value FROM movies movies LEFT OUTER JOIN (SELECT * FROM movie_ratings WHERE created_by=$1) rating ON movies.movies_id = rating.movie ORDER BY movies.title', [contextUserId]);
        })
        .then(function(result) {
            var processedResults = [];
            result.rows.forEach(function(row) {
                var movie = {
                    movies_id: row.movies_id,
                    title: row.title,
                    rating: row.rating
                };
                if (row.movie_ratings_id) {
                    movie.myRating = {
                        movie_ratings_id: row.movie_ratings_id,
                        movie: row.movies_id,
                        created_by: row.created_by,
                        value: row.value
                    };
                }
                processedResults.push(movie);
            });

            response.json({
                results: processedResults
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

router.post('/movies.json', auth, function(request, response) {
    var title = request.body.title,
        rating = request.body.rating,
        contextUserId = request.session.user_id,
        client;

    if (!title) {
        response.status(400).json({
            error: 'Title is required'
        });
        return;
    }
    if (title.length > 100) {
        response.status(400).json({
            error: 'Title too long'
        });
        return;
    }

    var validationErrors = movieRatingsDataService.validateMovieRatingValue(rating);
    if (validationErrors.length > 0) {
        response.status(400).json({
            error: validationErrors[0] // TODO allow for multiple error messages
        });
    }


    if (!contextUserId) {
        response.status(500).send();
        return;
    }
    console.log('Begin connection');

    function rollback(client, done) {
        client.query('ROLLBACK', function(err) {
            return done(err);
        });
    };

    var movieId,
        movieRatingId;

    db.connect()
        .then(function(c) {
            client = c;
            return Q(c);
        })
        .then(function() {

            return client.query('BEGIN')
                .then(function() {
                    console.log('Transaction started');
                    return client.query('INSERT INTO movies (title, created_by) VALUES ($1, $2) RETURNING movies_id', [title, contextUserId]);
                })
                .then(function(result) {
                    movieId = result.rows[0].movies_id;
                    console.log('Inserted movie', movieId);

                    if (rating) {
                        return movieRatingsDataService.insert(client, movieId, contextUserId, rating);
                    } else {
                        return Q(undefined);
                    }
                })
                .then(function(newMovieRatingId) {
                    if (!newMovieRatingId) {
                        return Q(undefined);
                    }
                    console.log('Inserted movie rating', newMovieRatingId);
                    movieRatingId = newMovieRatingId;
                    return Q(newMovieRatingId);
                })
                .then(function() {
                    return client.query('COMMIT');
                }, function(err) {
                    console.log('Insert failed, rolling back transaction');
                    return client.query('ROLLBACK')
                        .then(function() {
                            return Q.reject(err);
                        });
                });
        })
        .then(function() {
            response.json({
                movies_id: movieId,
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