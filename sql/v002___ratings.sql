
CREATE TABLE movie_ratings(
    movie_ratings_id serial primary key,
    movie integer references movies(movies_id),
    created_by integer references users(users_id),
    value integer not null
);
