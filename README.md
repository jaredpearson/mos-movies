# Mo's Movies
Application to track movie ratings.

## Setup
To use the app, you will need to have the DB setup. See the Database instructions below. The following steps will install dependencies and compile the application. Compilation will transpile JSX files for use in the browser.

    npm install
    npm compile

## Running

    npm start 

## Database
The app uses PostgreSQL. The database can be rebuilt by executing each of the files in the `sql` folder in order.

    psql -f v001___initial.sql