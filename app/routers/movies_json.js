'use strict';

var express = require('express'),
    router = express.Router(),
    auth = require('../middlewares/auth'),
    db = require('../db'),
    movieRatingsDataService = require('../data_services/movie_ratings');


router.get('/movies.json', auth, function(request, response) {
    var contextUserId = request.session.user_id;

    db.connect(function(err, client, done) {
        if (db.handleDbError(response, client, done, err)) {
            return;
        }

        client.query('SELECT movies.movies_id, movies.title, (SELECT avg(rating1.value) FROM movie_ratings rating1 WHERE rating1.movie = movies.movies_id) AS rating, rating.movie_ratings_id, rating.created_by, rating.value FROM movies movies LEFT OUTER JOIN (SELECT * FROM movie_ratings WHERE created_by=$1) rating ON movies.movies_id = rating.movie ORDER BY movies.title', [contextUserId], function(err, result) {
            if (db.handleDbError(response, client, done, err)) {
                return;
            }
            done();

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
        });
    });
});

router.post('/movies.json', auth, function(request, response) {
    var title = request.body.title,
        rating = request.body.rating,
        contextUserId = request.session.user_id;

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

    db.connect(function(err, client, done) {
        if (db.handleDbError(response, client, done, err)) {
            return;
        }
        client.query('BEGIN', function(err){
            if (err) {
                rollback(client, done);
            }
            console.log('Transaction started');

            client.query('INSERT INTO movies (title, created_by) VALUES ($1, $2) RETURNING movies_id', [title, contextUserId], function(err, result) {
                if (db.handleDbError(response, client, done, err)) {
                    return;
                }
                var movieId = result.rows[0].movies_id;
                console.log('Inserted movie', movieId);

                function finished(movieRatingId) {
                    client.query('COMMIT', function(err) {
                        if (db.handleDbError(response, client, done, err)) {
                            return;
                        }

                        done();
                        response.json({
                            movies_id: movieId,
                            movie_ratings_id: movieRatingId
                        });

                    });
                };
                function handleMovieRatingInsertFinished() {
                    if (db.handleDbError(response, client, done, err)) {
                        return;
                    }
                    var movieRatingId = result.rows[0].movie_ratings_id;
                    console.log('Inserted movie rating', movieRatingId);

                    finished(movieRatingId);
                };

                if (rating) {
                    movieRatingsDataService.insert(client, handleMovieRatingInsertFinished, movieId, contextUserId, rating);
                } else {
                    finished(undefined);
                }

            });

        });
    });
});

module.exports.router = router;