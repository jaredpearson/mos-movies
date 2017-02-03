'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const db = require('../db');
const movieRatingsDataService = require('../data_services/movie_ratings');
const views = require('../views');

router.param('id', (request, response, next, value) => {
    if (!request.params) {
        request.params = {};
    }
    request.params.id = value;
    return next();
});
router.patch('/movies/:id.json', auth, (request, response) => {
    const myRating = request.body.myRating;
    const movieId = request.params.id;
    const contextUserId = request.session.user_id;

    if (!myRating) {
        return response.status(400).json({
            error: 'myRating was not defined'
        });
    }

    const  validationErrors = movieRatingsDataService.validateMovieRatingValue(myRating);
    if (validationErrors.length > 0) {
        return response.status(400).json({
            error: validationErrors[0] // TODO allow for multiple error messages
        });
    }

    return db.connect()
        .then(client => {
            return movieRatingsDataService.hasUserRatedMovie(client, movieId, contextUserId)
            .then(hasUserRatedMovie => {
                if (hasUserRatedMovie) {
                    console.log('Updating rating');
                    return movieRatingsDataService.updateMovieRating(client, movieId, contextUserId, myRating);
                } else {
                    console.log('Inserting new rating');
                    return movieRatingsDataService.insert(client, movieId, contextUserId, myRating);
                }
            })
            .then(movieRatingId => {
                response.json({
                    movie_ratings_id: movieRatingId
                });
            })
            .fin(() => client.done());
        })
        .fail(views.showErrorPageOnFailCurry(response))
        .done();
});

module.exports.router = router;