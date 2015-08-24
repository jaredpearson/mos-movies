'use strict';

var Q = require('q'),
    db = require('../db');

module.exports = {
    findSimilar: function(client, text) {
        return client.query('SELECT movies_id, title FROM movies WHERE levenshtein(lower(title), lower($1)) = 0', [text])
            .then(function(result) {
                return Q(result);
            });
    }
};
