'use strict';

var Q = require('q');

module.exports = {
    insert: function(client, movieId, contextUserId, rating) {
        return client.query('INSERT INTO movie_ratings (movie, created_by, value) VALUES ($1, $2, $3) RETURNING movie_ratings_id', [movieId, contextUserId, rating])
            .then(function(result) {
                if (result.rowCount == 0) {
                    console.log('Inserting rating failed. Expected at least one rating ID to be returned.');
                    return Q(undefined);
                }
                return Q(result.rows[0].movie_ratings_id);
            });
    },

    hasUserRatedMovie: function(client, movieId, contextUserId) {
        return client.query('SELECT count(*) FROM movie_ratings WHERE movie = $1 AND created_by = $2', [movieId, contextUserId])
            .then(function(result) {
                return Q(result.rowCount > 0 && result.rows[0].count > 0);
            });
    },

    updateMovieRating: function(client, movieId, contextUserId, myRating) {
        return client.query('UPDATE movie_ratings SET value = $3 WHERE movie = $1 AND created_by = $2 RETURNING movie_ratings_id', [movieId, contextUserId, myRating])
            .then(function(result) {
                if (result.rowCount == 0) {
                    console.log('Updating rating failed. Expected at least one rating ID to be returned.');
                    return Q(undefined);
                }
                return Q(result.rows[0].movie_ratings_id);
            });
    },

    deleteRating: function(client, movieRatingId, contextUserId) {
        return client.query('DELETE FROM movie_ratings WHERE movie_ratings_id = $1 AND created_by = $2', [movieRatingId, contextUserId]);
    },

    validateMovieRatingValue: function(value) {
        var valueAsNumber;
        if (typeof value != 'number') {
            value = parseInt(value);
            if (typeof value != "number") {
                return ['Rating should be a number'];
            }
        }
        return [];
    }
};