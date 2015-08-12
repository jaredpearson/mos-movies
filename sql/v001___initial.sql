
CREATE TABLE users(
    users_id serial primary key,
    username text not null unique
);

CREATE TABLE movies(
    movies_id serial primary key,
    title text not null,
    created_by integer references users(users_id)
);
