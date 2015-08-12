'use strict';

module.exports = {
    showErrorPage: function(response, err) {
        console.log(err);
        response.writeHead(500, {'content-type': 'text/plain'});
        response.end('An error occurred');
    }
};
