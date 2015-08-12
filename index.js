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

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use( bodyParser.json() );
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

        var handleError = function(err) {
            // no error occurred, continue with the request
            if(!err) {
                return false;
            }
            if(client){
                done(client);
            }
            console.log(err);
            response.writeHead(500, {'content-type': 'text/plain'});
            response.end('An error occurred');
            return true;
        };

        if (handleError(err)) {
            return;
        }

        client.query('SELECT users_id FROM users WHERE username=$1', [request.body.username], function(err, result) {
            if (handleError(err)) {
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
    db.connect(function(err, client, done) {
        client.query('SELECT title FROM movies', function(err, result) {
            done();
            if (err) {
                console.error(err);
                response.sendStatus(500);
            } else {
                response.render('pages/movies', {
                    movies: result.rows
                });
            }
        });
    });
});

app.post('/movies/new', auth, function(request, response) {
    var title = request.body.title;

    if (!title) {
        response.render('pages/movies', {
            error: 'Title is required'
        });
        return;
    }
    if (title.length > 100) {
        response.render('pages/movies', {
            error: 'Title too long'
        });
        return;
    }

    db.connect(function(err, client, done) {

        var handleError = function(err) {
            // no error occurred, continue with the request
            if(!err) {
                return false;
            }
            if(client){
                done(client);
            }
            console.log(err);
            response.writeHead(500, {'content-type': 'text/plain'});
            response.end('An error occurred');
            return true;
        };

        if (handleError(err)) {
            return;
        }

        client.query('INSERT INTO movies (title) VALUES ($1)', [title], function(err) {
            if (handleError(err)) {
                return;
            }

            done();
            response.redirect('/movies');
        });
    });
});

app.get('/', function(request, response) {
    response.redirect('/movies');
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});


