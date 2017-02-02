
/**
 * Script executed by Heroku during the post deploy step after the DB
 * has been setup.
 */

'use strict';

var usersDataSource = require('./app/data_services/users');

// main function
function run() {

    // add a default user account
    // it's a good idea to change this when in a prod env :)
    return usersDataSource.insertUser('admin', 'flick')
        .done();

}

if (!module.parent) {
    run();
} else {
    module.exports = run;
}