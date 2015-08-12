'use strict';

var express = require('express'),
    router = express.Router(),
    db = require('../db');

router.get('/login', function(request, response) {
    response.render('pages/login');
});

router.post('/login', function(request, response) {
    
    // secure aint it...
    if (request.body.password != '123456') {
        response.render('pages/login', {
            error: 'Invalid password'
        });
        return;
    }
    if (!request.body.username) {
        response.render('pages/login', {
            error: 'Invalid username'
        });
        return;
    }

    db.connect(function(err, client, done) {
        if (db.handleDbError(response, client, done, err)) {
            return;
        }

        client.query('SELECT users_id FROM users WHERE username=$1', [request.body.username], function(err, result) {
            if (db.handleDbError(response, client, done, err)) {
                return;
            }

            done();
            if (result.rowCount === 1) {
                request.session.user_id = result.rows[0].users_id;
                response.redirect('/movies');
            } else {
                response.render('pages/login', {
                    error: 'Unknown username'
                });
            }
        });
    });
});

module.exports.router = router;