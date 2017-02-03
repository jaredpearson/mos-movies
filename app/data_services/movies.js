'use strict';

const Q = require('q');
const db = require('../db');

module.exports = {

    /**
     * Finds a movie title that is similar to the given text
     * @param {PgClient} client the PostgreSQL db client
     * @param {String} text the text value to search against the movie titles
     * @returns {Promise<{count:Number}>} the query result of the number of movies that are similar
     */
    findSimilar(client, text) {
        return client
            .query({
                name: 'movies_similar', 
                text: 'SELECT movies_id, title FROM movies WHERE levenshtein(lower(title), lower($1::text)) = 0', 
                values: [text]
            });
    },

    /**
     * Gets the total number of movies in the DB
     * @param {PgClient} client the PostgreSQL db client
     * @returns {Promise<Number>} the number of movies that are currently in the DB
     */
    getTotalNumberOfMovies(client) {
        return client
            .query({
                name: 'movies_count',
                text: 'SELECT count(*) count FROM movies'
            })
            .then(results => parseInt(results.rows[0].count));
    },

    /**
     * Gets a page of movies from the database
     * @param {PgClient} client the PostgreSQL db client
     * @param {Number} contextUserId the ID of the user to load the movies for
     * @param {String} orderBy the column to order the columns by
     * @param {Number} limit the number of movies to load
     * @param {Number} offset the index of the movie to start the page from
     * @returns {Promise<{numberOfMovies:Number,results:[],limit:Number,offset:Number}>} the page loaded
     */
    getAllMoviesPage(client, contextUserId, orderBy, limit, offset = 0) {
        var numberOfMovies;
        const numberOfMoviesPromise = this.getTotalNumberOfMovies(client);
        const moviesPromise = client.query({
                name: 'movies_page',
                text: `SELECT
                    movies.movies_id,
                    movies.title,
                    (SELECT avg(rating1.value) FROM movie_ratings rating1 WHERE rating1.movie = movies.movies_id) AS rating,
                    rating.movie_ratings_id,
                    rating.created_by,
                    rating.value
                    FROM movies movies
                    LEFT OUTER JOIN (SELECT * FROM movie_ratings WHERE created_by=$1::integer) rating ON movies.movies_id = rating.movie
                    ORDER BY $2::text
                    LIMIT $3::integer
                    OFFSET $4::integer`, 
                values: [contextUserId, orderBy, limit, offset]
            })
            .then(result => {
                return result.rows.map(row => {
                    const movie = {
                        movies_id: row.movies_id,
                        title: row.title,
                        rating: parseFloat(row.rating)
                    };
                    if (row.movie_ratings_id) {
                        movie.myRating = {
                            movie_ratings_id: row.movie_ratings_id,
                            movie: row.movies_id,
                            created_by: row.created_by,
                            value: row.value
                        };
                    }
                    return movie;
                });
            });

        return Q.spread([numberOfMoviesPromise, moviesPromise], (numberOfMovies, movies) => {
            return {
                numberOfMovies,
                results: movies,
                limit,
                offset
            };
        });
    }
};
