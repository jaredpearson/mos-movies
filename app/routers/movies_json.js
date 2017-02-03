'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const db = require('../db');
const movieRatingsDataService = require('../data_services/movie_ratings');
const moviesDataService = require('../data_services/movies');
const views = require('../views');
const Q = require('q');

function strictParseInt(value) {
    if(/^(\-|\+)?([0-9]+)$/.test(value)) {
        return Number(value);
    }
    return NaN;
}
function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Starts the transaction
 * @param {Q.Promise} clientPromise the DB client
 * @returns {Q.Promise} the promise that resolves to DB client
 */
function startTransaction(clientPromise) {
    return clientPromise
        .then(client => client.query('BEGIN'))
        .then(() => {
            console.log('Transaction started')
            return clientPromise;
        });
}

/**
 * Rollsback the transaction
 * @param {Q.Promise} clientPromise the DB client
 * @returns {Q.Promise} the promise that resolves to DB client
 */
function rollbackTransaction(clientPromise) {
    return clientPromise
        .then(client => client.query('ROLLBACK'))
        .then(() => {
            console.log('Transaction rollback')
            return clientPromise;
        });
}

/**
 * Commits the transaction
 * @param {Q.Promise} clientPromise the DB client
 * @returns {Q.Promise} the promise that resolves to DB client
 */
function commitTransaction(clientPromise) {
    return clientPromise
        .then(client => client.query('COMMIT'))
        .then(() => {
            console.log('Transaction commit')
            return clientPromise;
        });
}

function rejectOnSimilar(clientPromise, title) {
    return clientPromise
        .then(client => moviesDataService.findSimilar(client, title))
        .then(result => {
            if (result.rowCount > 0) {
                return Q.reject({
                    error: 'Duplicate found',
                    duplicateMovies: result.rows
                });
            } else {
                return;
            }
        });
}

/**
 * Inserts a movie into the DB
 * @returns {Q.Promise<Number>}
 */
function insertMovie(clientPromise, title, contextUserId) {
    return clientPromise
        .then(client => {
            return client.query('INSERT INTO movies (title, created_by) VALUES ($1::text, $2::integer) RETURNING movies_id', [title, contextUserId]);
        })
        .then(result => {
            const movieId = result.rows[0].movies_id;
            console.log('Inserted movie', movieId);
            return movieId;
        });
}

/**
 * Inserts a movie rating into the DB
 * @returns {Q.Promise<Number>}
 */
function insertMovieRating(clientPromise, movieIdPromise, contextUserId, rating) {
    return Q.spread([clientPromise, movieIdPromise], (client, movieId) => {
        if (!movieId) {
            throw new Error('movieId is not a valid number');
        }

        if (rating) {
            return movieRatingsDataService.insert(client, movieId, contextUserId, rating)
                .then(newMovieRatingId => {
                    if (newMovieRatingId) {
                        console.log('Inserted movie rating', newMovieRatingId);
                    }
                    return newMovieRatingId;
                })
        } else {
            return undefined;
        }
    });
}

router.get('/movies.json', auth, (request, response) => {
    const contextUserId = request.session.user_id;

    let orderBy = 'title';
    if (request.query.sortKey) {

        let sortDirection = 'ASC';
        if (request.query.sortDirection) {
            // make sure sortDirection is one of the allowed values
            switch (request.query.sortDirection.toLowerCase()) {
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

        // convert sortKey to one of the allowed values
        switch (request.query.sortKey.toLowerCase()) {
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
    }

    let offset = 0;
    if (request.query.offset) {
        offset = strictParseInt(request.query.offset);
        if (!isNumeric(offset)) {
            return response.setStatus(400).send('Value of offset is not a number.');
        }
    }

    let limit = 100;
    if (request.query.limit) {
        limit = strictParseInt(request.query.limit);
        if (!isNumeric(limit)) {
            return response.setStatus(400).send('Value of limit is not a number.');
        }
    }

    return db.connect()
        .then(client => {
            return moviesDataService.getAllMoviesPage(client, contextUserId, orderBy, limit, offset)
                .then(result => {
                    response.json(result);
                })
                .fin(() => client.done());
        })
        .fail(views.showErrorPageOnFailCurry(response))
        .done();
});

router.post('/movies.json', auth, function(request, response) {
    const rating = request.body.rating;
    const contextUserId = request.session.user_id;
    if (!contextUserId) {
        response.status(500).send();
        return;
    }
    
    const title = request.body.title;
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

    const validationErrors = movieRatingsDataService.validateMovieRatingValue(rating);
    if (validationErrors.length > 0) {
        return response.status(400).json({
            error: validationErrors[0] // TODO allow for multiple error messages
        });
    }

    const clientPromise = db.connect();
    return rejectOnSimilar(clientPromise, title)
        .then(()=> {
            const transactionStartPromise = startTransaction(clientPromise);
            const movieIdPromise = insertMovie(transactionStartPromise, title, contextUserId);
            const movieRatingPromise = insertMovieRating(transactionStartPromise, movieIdPromise, contextUserId, rating);
            
            return movieRatingPromise
                .then(() => {
                    return commitTransaction(clientPromise)
                }, err => {
                    console.log('Insert failed, rolling back transaction');
                    return rollbackTransaction(clientPromise)
                        .then(() => Q.reject(err));
                })
                .then(() => {
                    return Q.spread([movieIdPromise, movieRatingPromise], (movieId, movieRatingId) => {
                        response.json({
                            movies_id: movieId,
                            movie_ratings_id: movieRatingId
                        });
                    })
                });
        })
        .fail(err => {
            if (err.error) {
                response.status(400).json(err);
            } else {
                views.showErrorPage(response, err);
            }
        })
        .fin(() => clientPromise.then(c => c.done()))
        .done();
});

module.exports.router = router;