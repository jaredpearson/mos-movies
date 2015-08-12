'use strict';

var express = require('express'),
    pg = require('pg'),
    bodyParser = require('body-parser'),
    session = require('express-session');

var db = {

    connect: function(callback) {
        pg.connect(process.env.DATABASE_URL, callback);
    }
};

// middleware for authentication
function auth(req, res, next) {
    if (!req.session.user_id) {
        res.redirect('/login');
    } else {
        next();
    }
};

function showErrorPage(response, err) {
    console.log(err);
    response.writeHead(500, {'content-type': 'text/plain'});
    response.end('An error occurred');
};

var handleDbError = function(response, client, done, err) {
    // no error occurred, continue with the request
    if(!err) {
        return false;
    }
    if(client){
        done(client);
    }
    showErrorPage(response, err);
    return true;
};

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'whisperwhisper',
    saveUninitialized: false
}));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/login', function(request, response) {
    response.render('pages/login');
});
app.post('/login', function(request, response) {
    
    // secure aint it...
    if (request.body.password != '123456') {
        response.render('pages/login', {
            error: 'Invalid password'
        });
        return;
    }
    if (!request.body.username) {
        response.render('pages/login', {
            error: 'Invalid username'
        });
        return;
    }

    db.connect(function(err, client, done) {
        if (handleDbError(response, client, done, err)) {
            return;
        }

        client.query('SELECT users_id FROM users WHERE username=$1', [request.body.username], function(err, result) {
            if (handleDbError(response, client, done, err)) {
                return;
            }

            done();
            if (result.rowCount === 1) {
                request.session.user_id = result.rows[0].users_id;
                response.redirect('/movies');
            } else {
                response.render('pages/login', {
                    error: 'Unknown username'
                });
            }
        });
    });
});

app.get('/movies', auth, function(request, response) {
    response.render('pages/movies');
});

app.get('/movies.json', auth, function(request, response) {
    db.connect(function(err, client, done) {
        if (handleDbError(response, client, done, err)) {
            return;
        }

        client.query('SELECT movies_id, title FROM movies', function(err, result) {
            if (handleDbError(response, client, done, err)) {
                return;
            }
            done();
            response.json({
                results: result.rows
            });
        });
    });
});

app.post('/movies.json', auth, function(request, response) {
    var title = request.body.title,
        rating = request.body.rating,
        contextUserId = request.session.user_id;

    if (!title) {
        response.status(400).json({
            error: 'Title is required'
        });
        return;
    }
    if (title.length > 100) {
        response.status(400).json({
            error: 'Title too long'
        });
        return;
    }

    if (!contextUserId) {
        response.status(500).send();
        return;
    }
    console.log('Begin connection');

    function rollback(client, done) {
        client.query('ROLLBACK', function(err) {
            return done(err);
        });
    };

    db.connect(function(err, client, done) {
        if (handleDbError(response, client, done, err)) {
            return;
        }
        client.query('BEGIN', function(err){
            if (err) {
                rollback(client, done);
            }
            console.log('Transaction started');

            client.query('INSERT INTO movies (title, created_by) VALUES ($1, $2) RETURNING movies_id', [title, contextUserId], function(err, result) {
                if (handleDbError(response, client, done, err)) {
                    return;
                }
                var movieId = result.rows[0].movies_id;
                console.log('Inserted movie', movieId);

                function finished(movieRatingId) {
                    client.query('COMMIT', function(err) {
                        if (handleDbError(response, client, done, err)) {
                            return;
                        }

                        done();
                        response.json({
                            movies_id: movieId,
                            movie_ratings_id: movieRatingId
                        });

                    });
                };

                if (rating) {
                    client.query('INSERT INTO movie_ratings (movie, created_by, value) VALUES ($1, $2, $3) RETURNING movie_ratings_id', [movieId, contextUserId, rating], function(err, result) {
                        if (handleDbError(response, client, done, err)) {
                            return;
                        }
                        var movieRatingId = result.rows[0].movie_ratings_id;
                        console.log('Inserted movie rating', movieRatingId);

                        finished(movieRatingId);
                    });
                } else {
                    finished(undefined);
                }

            });

        });
    });
});

app.get('/', function(request, response) {
    response.redirect('/movies');
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});


