
'use strict';

var pg = require('pg'),
    Q = require('q');

function ClientPromise(client, done) {
    this._client = client;
    this._done = done;
}
ClientPromise.prototype.done = function done() {
    this._done(this._client);
};

/**
 * @returns {Promise} resolves to the result as returned by pg
 */
ClientPromise.prototype.query = function query() {
    var queryArgs = Array.prototype.slice.call(arguments),
        deferred = Q.defer();

    queryArgs.push(function handleQuery(err, result) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(result);
        }
    }.bind(this));

    this._client.query.apply(this._client, queryArgs);

    return deferred.promise;
};

module.exports = {
    connect: function() {
        var deferred = Q.defer();

        pg.connect(process.env.DATABASE_URL, function connect(err, client, done) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(new ClientPromise(client, done));
            }
        });

        return deferred.promise;
    }
};