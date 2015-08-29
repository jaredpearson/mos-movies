'use strict';

var express = require('express'),
    router = express.Router(),
    db = require('../db'),
    views = require('../views'),
    Q = require('q'),
    usersDataService = require('../data_services/users');

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

    usersDataService.auth(request.body.username, request.body.password)
        .then(function(userId) {
            if (userId) {
                request.session.user_id = userId;
                response.redirect('/movies');
            } else {
                response.render('pages/login', {
                    error: 'Unknown username or invalid password'
                });
            }
        })
        .fail(function(err) {
            views.showErrorPage(response, err);
        })
        .done();
});

module.exports.router = router;