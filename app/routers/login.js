/**
 * Router for login urls
 * 
 * URL: /login
 */

'use strict';

const express = require('express');
const router = express.Router();
const views = require('../views');
const usersDataService = require('../data_services/users');

router.get('/login', (request, response) => {
    response.render('pages/login');
});

router.post('/login', (request, response) => {
    
    if (!request.body.username) {
        response.render('pages/login', {
            error: 'Invalid username'
        });
        return;
    }

    usersDataService.auth(request.body.username, request.body.password)
        .then(userId => {
            if (userId) {
                request.session.user_id = userId;
                response.redirect('/movies');
            } else {
                response.render('pages/login', {
                    error: 'Unknown username or invalid password'
                });
            }
        })
        .fail(views.showErrorPageOnFailCurry(response))
        .done();
});

module.exports.router = router;