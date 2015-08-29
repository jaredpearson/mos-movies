
'use strict';

var pg = require('pg'),
    Q = require('q'),
    pgconnect = Q.nbind(pg.connect, pg);

function ClientPromise(client, done) {
    this._client = client;
    this._done = done;
    this._pgquery = Q.nbind(client.query, client);
}
ClientPromise.prototype.done = function done() {
    this._done(this._client);
};

/**
 * @returns {Promise} resolves to the result as returned by pg
 */
ClientPromise.prototype.query = function query() {
    return this._pgquery.apply(this._client, arguments);
};

module.exports = {
    connect: function() {
        return pgconnect(process.env.DATABASE_URL)
            .spread(function(client, done) {
                return Q.resolve(new ClientPromise(client, done));
            });
    }
};
