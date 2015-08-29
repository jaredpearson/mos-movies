'use strict';

var Q = require('q'),
    db = require('../db');

module.exports = {

    findSimilar: function(client, text) {
        return client
            .query({
                name: 'movies_similar', 
                text: 'SELECT movies_id, title FROM movies WHERE levenshtein(lower(title), lower($1::text)) = 0', 
                values: [text]
            });
    },

    getTotalNumberOfMovies: function(client) {
        return client
            .query({
                name: 'movies_count',
                text: 'SELECT count(*) count FROM movies'
            })
            .then(function(results) {
                return Q(parseInt(results.rows[0].count))
            });
    },

    getAllMoviesPage: function(client, contextUserId, orderBy, limit, offset) {
        var numberOfMovies;
        return this.getTotalNumberOfMovies(client)
            .then(function(movieCount) {
                numberOfMovies = movieCount;
                return client
                    .query({
                        name: 'movies_page',
                        text: 'SELECT movies.movies_id, movies.title, (SELECT avg(rating1.value) FROM movie_ratings rating1 WHERE rating1.movie = movies.movies_id) AS rating, rating.movie_ratings_id, rating.created_by, rating.value FROM movies movies LEFT OUTER JOIN (SELECT * FROM movie_ratings WHERE created_by=$1::integer) rating ON movies.movies_id = rating.movie ORDER BY ' + orderBy + ' LIMIT ' + limit + ' OFFSET ' + offset, 
                        values: [contextUserId]
                    });
            })
            .then(function(result) {
                var processedResults = [];
                result.rows.forEach(function(row) {
                    var movie = {
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
                    processedResults.push(movie);
                });

                return Q({
                    numberOfMovies: numberOfMovies,
                    results: processedResults,
                    limit: limit,
                    offset: offset
                });
            });
    }
};
