'use strict';

var express = require('express'),
    router = express.Router(),
    auth = require('../middlewares/auth'),
    db = require('../db'),
    movieRatingsDataService = require('../data_services/movie_ratings'),
    moviesDataService = require('../data_services/movies'),
    views = require('../views'), 
    Q = require('q');

function strictParseInt(value) {
    if(/^(\-|\+)?([0-9]+)$/.test(value)) {
        return Number(value);
    }
    return NaN;
}
function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

router.get('/movies.json', auth, function(request, response) {
    var contextUserId = request.session.user_id,
        offset,
        client,
        orderBy,
        sortKey,
        sortDirection,
        limit;

    if (!request.query.sortDirection) {
        sortDirection = 'ASC';
    } else {
        // make sure sortDirection is one of the allowed values
        switch ((request.query.sortDirection || '').toLowerCase()) {
            case 'desc':
                sortDirection = 'DESC';
                break;
            case 'asc':
                sortDirection = 'ASC';
                break;
            default:
                response.status(400).send('Value of sortDirection is not known.');
                return;
        }
    }

    if (!request.query.sortKey) {
        orderBy = 'title';
    } else {
        sortKey = request.query.sortKey;
    }
    // convert sortKey to one of the allowed values
    switch ((request.query.sortKey || '').toLowerCase()) {
        case 'title':
            orderBy = 'movies.title ' + sortDirection + ' NULLS LAST, movies.movies_id ASC';
            break;
        case 'rating':
            orderBy = 'rating ' + sortDirection + ' NULLS LAST, movies.title ASC, movies.movies_id ASC';
            break;
        case 'myrating':
            orderBy = 'rating.value ' + sortDirection + ' NULLS LAST, movies.title ASC, movies.movies_id ASC';
            break;
        default: 
            response.status(400).send('Value of sortKey is not known.');
            return;
    }

    if (!request.query.offset) {
        offset = 0;
    } else {
        offset = strictParseInt(request.query.offset);
        if (!isNumeric(offset)) {
            response.setStatus(400).send('Value of offset is not a number.');
            return;
        }
    }

    if (!request.query.limit) {
        limit = 100;
    } else {
        limit = strictParseInt(request.query.limit);
        if (!isNumeric(limit)) {
            response.setStatus(400).send('Value of limit is not a number.');
        }
    }

    db.connect()
        .then(function(c) {
            client = c;
            return Q(c);
        })
        .then(function() {
            return moviesDataService.getAllMoviesPage(client, contextUserId, orderBy, limit, offset);
        })
        .then(function(result) {
            response.json(result);
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

    if (!contextUserId) {
        response.status(500).send();
        return;
    }
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

    var movieId,
        movieRatingId;

    console.log('Begin connection');

    db.connect()
        .then(function(c) {
            client = c;
            return Q(c);
        })
        .then(function() {
            // check for movies with the same title
            return moviesDataService.findSimilar(client, title)
                .then(function(result) {
                    if (result.rowCount > 0) {
                        return Q.reject({
                            error: 'Duplicate found',
                            duplicateMovies: result.rows
                        });
                    } else {
                        return Q();
                    }
                });
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
            if (err.error) {
                response.status(400).json(err);
            } else {
                views.showErrorPage(response, err);
            }
        })
        .fin(function() {
            if (client) {
                client.done();
            }
        })
        .done();
});

module.exports.router = router;