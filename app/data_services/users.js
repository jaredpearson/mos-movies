'use strict';

var db = require('../db'),
    Q = require('q');

module.exports = {

    auth: function(username, password) {
        var client;
        return db.connect()
            .then(function(c) {
                client = c;
                return Q(c);
            })
            .then(function() {
                return client.query('SELECT users_id FROM users WHERE username=$1::text AND password=crypt($2::text, password)', [username, password]);
            })
            .then(function(result) {
                if (result.rowCount > 0) {
                    return Q(result.rows[0].users_id);
                } else {
                    return Q(undefined);
                }
            })
            .fin(function() {
                client.done();
            });
    },

    insertUser: function(username, password) {
        var client;
        return db.connect()
            .then(function(c) {
                client = c;
                return Q(c);
            })
            .then(function() {
                return client.query('INSERT INTO users (username, password) VALUES ($1::text, crypt($2::text, gen_salt(\'bf\', 8))) RETURNING users_id', [username, password]);
            })
            .then(function(result) {
                return Q(result.rows[0].users_id);
            })
            .fin(function() {
                client.done();
            });
    }

};