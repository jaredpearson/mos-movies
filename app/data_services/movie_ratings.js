'use strict';

module.exports = {
    insert: function(client, done, movieId, contextUserId, rating) {
        client.query('INSERT INTO movie_ratings (movie, created_by, value) VALUES ($1, $2, $3) RETURNING movie_ratings_id', [movieId, contextUserId, rating], done);
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