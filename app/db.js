
'use strict';

const pg = require('pg');
const Q = require('q');
const pgconnect = Q.nbind(pg.connect, pg);

class ClientPromise {
    constructor(client, done) {
        this._client = client;
        this._done = done;
        this._pgquery = Q.nbind(client.query, client);
    }

    /**
     * @returns {Promise} resolves to the result as returned by pg
     */
    query() {
        return this._pgquery.apply(this._client, arguments);
    }

    done() {
        this._done(this._client);
    }
}

module.exports = {
    connect() {
        return pgconnect(process.env.DATABASE_URL)
            .spread((client, done) => {
                return Q.resolve(new ClientPromise(client, done));
            });
    },
    query() {
        const thatArgs = arguments;
        return this.connect()
            .then(client => {
                return client.query.apply(client, thatArgs)
                    .fin(() => client.done());
            })
    }
};
