'use strict';

/**
 * Middleware that checks to see if the request is associated to 
 * a logged in user. If it isn't, then a redirect is sent back to
 * the login page.
 */
module.exports = (req, res, next) => {
    if (!req.session.user_id) {
        res.redirect('/login');
    } else {
        next();
    }
};