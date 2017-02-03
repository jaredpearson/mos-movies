/**
 * Router for /movie-ratings/:id.json urls
 * 
 * URL: /movie-ratings/:id.json
 */

'use strict';

const router = require('express').Router();
const auth = require('../middlewares/auth');
const db = require('../db');
const movieRatingsDataService = require('../data_services/movie_ratings');
const views = require('../views');

router.delete('/movie-ratings/:id.json', auth, (request, response) => {
    const movieRatingId = request.params.id;
    const contextUserId = request.session.user_id;

    if (!movieRatingId) {
        response.sendStatus(400);
        return;
    }

    db.connect()
        .then(client => {
            return movieRatingsDataService.deleteRating(client, movieRatingId, contextUserId)
                .then(() => response.sendStatus(200))
                .then(() => client.done());
        })
        .fail(views.showErrorPageOnFailCurry(response))
        .done();
});

module.exports.router = router;
