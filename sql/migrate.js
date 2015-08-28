
var Q = require('q'),
    path = require('path'),
    fs = require('fs'),
    pg = require('pg');

var readdir = Q.nfbind(fs.readdir),
    readFile = Q.nfbind(fs.readFile),
    pgconnect = Q.nbind(pg.connect, pg),

    // look for migration files in the current directory
    defaultMigrationDir = __dirname,

    // look only for files named v000___foo.sql
    migrationFilenamePattern = /v([0-9]*)___(.*)/;

// Represents a migration that exists as a file
function FileMigration(options) {
    this.index = options.index;
    this.path = options.path;
    this.filename = options.filename;
}

// Represents a migration that has already been executed against the database
function DbMigration(options) {
    var filenameMatch = migrationFilenamePattern.exec(options.filename);
    this.index = parseInt(filenameMatch[1]);
    this.filename = options.filename;
}

// rollback the current transaction. this should be executed when a failure occurs
function rollback(client, done) {
    return client.query('ROLLBACK', function(err) {
        if (err) {
            return done(err);
        } else {
            return done(client);
        }
    });
}

function runMigrationAgainstDb(client, migration) {
    var pgquery = Q.nbind(client.query, client),
        readFileOptions = {
            encoding: 'UTF8'
        };

    return readFile(migration.path, readFileOptions)
        .then(function(text) {
            return pgquery(text);
        });
}

// runs the specified migrations against the database
function runMigrationsAgainstDb(client, migrations) {
    var pgquery = Q.nbind(client.query, client);

    // create a chain of functions that execute the migrations against the DB so 
    // that only the next migration is run after the previous one successfully 
    // finishes.
    // 
    // given a set of migrations like ['1.sql', '2.sql', '3.sql']
    // the result of the reduceRight operation will be 
    // function() {
    //   return runMigrationAgainstDb('1.sql')
    //       .then(function() {
    //           return runMigrationAgainstDb('2.sql')
    //               .then(function() {
    //                   return runMigrationAgainstDb('3.sql')
    //                       .then(function() {
    //                           // last function
    //                       })
    //               })
    //       })
    // }
    return (migrations.reduceRight(function(next, migration) {
        return function(numberOfMigrationsExecuted) {
            console.log('executing migration: ', migration.filename);

            return runMigrationAgainstDb(client, migration)
                .then(function() {
                    return pgquery('INSERT INTO migrations (filename) VALUES ($1)', [migration.filename]);
                })
                .then(function() {
                    return next(numberOfMigrationsExecuted + 1);
                });
        };
    }, function(numberOfMigrationsExecuted) {
        // this is the last function to be executed in the chain
        return Q.resolve(numberOfMigrationsExecuted);
    }))(0);
}

// Creates the table to store the migration metadata
function createMigrationTable(client) {
    var pgquery = Q.nbind(client.query, client);
    return pgquery('CREATE TABLE IF NOT EXISTS migrations (migration_id serial primary key, filename text, executed_on timestamp default now())');
}

// Gets an array of migrations already executed against the database
function getMigrationsFromDb(client) {
    var pgquery = Q.nbind(client.query, client);
    return pgquery('SELECT filename FROM migrations ORDER BY executed_on')
        .then(function(result) {
            var migrations = [];
            result.rows.forEach(function(row) {
                migrations.push(new DbMigration({
                    filename: row.filename
                }));
            });

            return Q(migrations);
        });
}

// returns a new array of migrations sorted by their index property
function sortMigrationsByIndex(migrations) {
    return migrations.sort(function(migration1, migration2) {
        if (migration1.index < migration2.index) {
            return -1;
        } else if (migration1.index > migration2.index) {
            return 1;
        } else {
            // ewww, the migrations are run in the order as determined by the readdir
            return 0;
        }
    });
}

// loads the migrations from the specified directory
function getMigrationsFromDisk(migrationDir) {
    return readdir(migrationDir)
        .then(function(files) {
            var migrations = [],
                sortedMigrations;

            files.forEach(function(file) {
                var filenameMatch = migrationFilenamePattern.exec(file),
                    migrationPath;
                if (filenameMatch) {
                    migrationPath = path.join(migrationDir, file);
                    migrations.push(new FileMigration({
                        index: parseInt(filenameMatch[1]),
                        filename: file,
                        path: migrationPath
                    }));
                }
            });

            // sort the migrations so that they are in order by filename
            sortedMigrations = sortMigrationsByIndex(migrations);

            return Q(sortedMigrations);
        });
}

// given the arrays of migrations from the directory and the database, this method resolves 
// to a list of migrations that need to be executed against the database.
function determineMigrationsToRun(fileMigrations, dbMigrations) {
    var deferred = Q.defer(),
        index = -1;

    if (fileMigrations.length === 0) {
        return Q.resolve([]);
    }

    if (dbMigrations.length > fileMigrations.length) {
        return Q.reject('DB is at a newer version than on disk');
    }

    // expect to have all of the file migrations to be exactly like the DB migrations
    for (index = 0; index < dbMigrations.length; index++) {

        if (fileMigrations[index].index !== dbMigrations[index].index) {
            return Q.reject('Expected migration on disk to match those of the DB. disk: ' + fileMigrations[index].filename + ', db: ' + dbMigrations[index].filename);
        }

    }

    return Q.resolve(fileMigrations.slice(dbMigrations.length));
}

// main function that updates the database with all of the scripts from the migration folder
function run(migrationDir) {
    migrationDir = migrationDir || defaultMigrationDir;

    getMigrationsFromDisk(migrationDir)
        .then(function(migrations) {
            if (migrations.length === 0) {
                return Q(false);
            }

            return pgconnect(process.env.DATABASE_URL)
                .spread(function(client, done) {
                    var pgquery = Q.nbind(client.query, client);

                    return pgquery('BEGIN')
                        .then(function() {
                            return createMigrationTable(client)
                        })
                        .then(function() {
                            return getMigrationsFromDb(client);
                        })
                        .then(function(dbMigrations) {
                            return determineMigrationsToRun(migrations, dbMigrations);
                        })
                        .then(function(migrations) {
                            return runMigrationsAgainstDb(client, migrations);
                        })
                        .then(function(numberOfMigrationsExecuted) {
                            return pgquery('COMMIT')
                                .then(function() {
                                    return Q(numberOfMigrationsExecuted);
                                });
                        })
                        .then(function(numberOfMigrationsExecuted) {
                            done(client);
                            return Q(numberOfMigrationsExecuted);
                        });

                }, function(err) {
                    console.log(err);
                    process.exit(1);
                });
        })
        .then(function(numberOfMigrationsExecuted) {
            if (numberOfMigrationsExecuted === 0) {
                console.log('Database is at latest version.');
            } else {
                console.log('Migration completed successfully.\n\t' + numberOfMigrationsExecuted + ' migrations executed');
            }
            return Q.resolve();
        })
        .fin(function() {
            pg.end();
        })
        .done();
}

if (!module.parent) {
    run();
} else {
    module.export = run;
}