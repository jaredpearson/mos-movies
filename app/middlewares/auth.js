'use strict';

// middleware for authentication
module.exports = function auth(req, res, next) {
    if (!req.session.user_id) {
        res.redirect('/login');
    } else {
        next();
    }
};