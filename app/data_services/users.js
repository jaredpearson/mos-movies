'use strict';

const db = require('../db');

module.exports = {

    /**
     * Authenticates a user against the db
     * @param {String} username the username
     * @param {String} password the password
     * @returns {Promise<Number>} the ID of the user or undefined if the user is not valid
     */
    auth(username, password) {
        return db.query('SELECT users_id FROM users WHERE username=$1::text AND password=crypt($2::text, password)', [username, password])
            .then(result => {
                if (result.rowCount > 0) {
                    return result.rows[0].users_id;
                } else {
                    return undefined;
                }
            });
    },

    /**
     * Inserts a new user into the database
     * @param {String} username the username
     * @param {String} password the password
     * @returns {Promise<Number>} the ID of the new user
     */
    insertUser(username, password) {
        return db.query('INSERT INTO users (username, password) VALUES ($1::text, crypt($2::text, gen_salt(\'bf\', 8))) RETURNING users_id', [username, password])
            .then((result) => result.rows[0].users_id);
    }

};