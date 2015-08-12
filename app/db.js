
'use strict';

var pg = require('pg'),
    views = require('./views');

module.exports = {
    connect: function(callback) {
        pg.connect(process.env.DATABASE_URL, callback);
    },

    handleDbError: function(response, client, done, err) {
        // no error occurred, continue with the request
        if(!err) {
            return false;
        }
        if(client){
            done(client);
        }
        views.showErrorPage(response, err);
        return true;
    }
};