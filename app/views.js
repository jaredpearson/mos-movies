'use strict';

module.exports = {
    showErrorPage(response, err) {
        console.log('Error occurred', err);
        // TODO: add a pretty error page
        response.writeHead(500, {'content-type': 'text/plain'});
        response.end('An error occurred');
    },

    /**
     * Returns a function that will call {@link #showErrorPage} function with 
     * the error argument. This is useful for handling the fail on a 
     * promise within an Express handle function.
     * 
     * @example
     * router.get('/foo', (req, res) => {
     *     return this.doSomething() 
     *         .then(() => res.send('Hello World'))
     *         .fail(showErrorPageOnFailCurry(res))
     *         .done();
     * })
     * 
     */
    showErrorPageOnFailCurry(response) {
        return err => this.showErrorPage(response, err);
    }
};
