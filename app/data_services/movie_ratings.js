'use strict';

const Q = require('q');

/**
 * Returns a function that will retrieve the movie_ratings_id from the first row or will
 * return undefined (and write a message to log).
 * @param {String} messageWhenNoRows the message to log when no rows are found
 * @returns {Function}
 */
function getFirstMovieRatingIdFromRow(messageWhenNoRows) {
    return result => {
        if (result.rowCount == 0) {
            if (messageWhenNoRows) {
                console.log(messageWhenNoRows);
            }
            return undefined;
        }
        return result.rows[0].movie_ratings_id;
    };
}

module.exports = {
    /**
     * Inserts a new movie rating into the DB
     * @param {PgClient} client the PostgreSQL db client
     * @param {Number} movieId the ID of the movie
     * @param {Number} contextUserId the ID of the user adding the rating
     * @param {Number} rating the rating
     * @returns {Promise<Number>} the ID of the new rating or undefined if the rating wasn't able to be added
     */
    insert(client, movieId, contextUserId, rating) {
        return client.query('INSERT INTO movie_ratings (movie, created_by, value) VALUES ($1::integer, $2::integer, $3::integer) RETURNING movie_ratings_id', [movieId, contextUserId, rating])
            .then(getFirstMovieRatingIdFromRow('Inserting rating failed. Expected at least one rating ID to be returned.'));
    },

    /**
     * Determines if the user has already rated the given movie
     * @param {PgClient} client the PostgreSQL db client
     * @param {Number} movieId the ID of the movie
     * @param {Number} contextUserId the ID of the user
     * @returns {Promise<Boolean>} true if the user has already rated the movie
     */
    hasUserRatedMovie(client, movieId, contextUserId) {
        return client.query('SELECT count(*) FROM movie_ratings WHERE movie = $1::integer AND created_by = $2::integer', [movieId, contextUserId])
            .then(result => result.rowCount > 0 && result.rows[0].count > 0);
    },

    /**
     * Updates a movie rating
     * @param {PgClient} client the PostgreSQL db client
     * @param {Number} movieId the ID of the movie
     * @param {Number} contextUserId the ID of the user updating the rating
     * @param {Number} myRating the rating
     * @returns {Promise<Number>} the ID of the updated rating or undefined if the rating wasn't able to be updated
     */
    updateMovieRating(client, movieId, contextUserId, myRating) {
        return client.query('UPDATE movie_ratings SET value = $3::integer WHERE movie = $1::integer AND created_by = $2::integer RETURNING movie_ratings_id', [movieId, contextUserId, myRating])
            .then(getFirstMovieRatingIdFromRow('Updating rating failed. Expected at least one rating ID to be returned.'));
    },

    /**
     * Deletes a movie rating
     * @param {PgClient} client the PostgreSQL db client
     * @param {Number} movieRatingId the ID of the rating to delete
     * @param {Number} contextUserId the ID of the user updating the rating
     * @returns {Promise<Number>} the ID of the updated rating or undefined if the rating wasn't able to be updated
     */
    deleteRating(client, movieRatingId, contextUserId) {
        return client.query('DELETE FROM movie_ratings WHERE movie_ratings_id = $1::integer AND created_by = $2::integer', [movieRatingId, contextUserId]);
    },

    /**
     * Determines if the movie rating is a valid value. This checks if the value is a 
     * number (or converts Strings to numbers) and then verifies.
     * @param {any} value any value
     * @return {[String]} list of error messages (or empty if there are no errors)
     */
    validateMovieRatingValue(value) {
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