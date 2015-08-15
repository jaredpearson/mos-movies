'use strict';

var express = require('express'),
    router = express.Router(),
    db = require('../db'),
    views = require('../views'),
    Q = require('q');

router.get('/login', function(request, response) {
    response.render('pages/login');
});

router.post('/login', function(request, response) {
    
    if (!request.body.username) {
        response.render('pages/login', {
            error: 'Invalid username'
        });
        return;
    }
    // secure aint it...
    if (request.body.password != '123456') {
        response.render('pages/login', {
            error: 'Invalid password'
        });
        return;
    }
    var client;

    db.connect()
        .then(function(c) {
            client = c;
            return Q(c);
        })
        .then(function() {
            return client.query('SELECT users_id FROM users WHERE username=$1', [request.body.username])
                .then(function(result) {
                    if (result.rowCount > 0) {
                        return Q(result.rows[0].users_id);
                    } else {
                        return Q(undefined);
                    }
                });
        })
        .then(function(userId) {
            if (userId) {
                request.session.user_id = userId;
                response.redirect('/movies');
            } else {
                response.render('pages/login', {
                    error: 'Unknown username'
                });
            }
        })
        .fail(function(err) {
            views.showErrorPage(response, err);
        })
        .fin(function() {
            client.done();
        })
        .done();
});

module.exports.router = router;