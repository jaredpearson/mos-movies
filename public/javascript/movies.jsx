function isNumber(value) {
    return typeof value === "number" && 
       isFinite(value) && 
       Math.floor(value) === value;
}

var StarRatingInput = React.createClass({
    handleClickRating: function(value, e) {
        e.preventDefault();

        if (this.props.onRatingChange) {
            this.props.onRatingChange(value);
        }
    },
    handleClickRemove: function(e) {
        e.preventDefault();

        if (this.props.onRatingCleared) {
            this.props.onRatingCleared();
        }
    },
    render: function() {
        var maxValue = this.props.maxValue || 5,
            value = this.props.value,
            starEls = [],
            index = -1,
            starClassName,
            removeRatingEl;

        // build the element for the remove rating only when a rating has been added
        if (this.props.showClear && value > 0) {
            removeRatingEl = (
                <a href="#" className="ratingRemoveButton" onClick={this.handleClickRemove} alt="Remove" style={{'paddingLeft': '10px'}}>
                    <span style={{display: 'none'}}>Remove</span>
                    <i className={'fa fa-ban'}></i>
                </a>
            );
        } else {
            removeRatingEl = null;
        }

        for (index = 0; index < maxValue; index++) {
            if (value >= index + 1) {
                starClassName = 'fa-star';
            } else {
                starClassName = 'fa-star-o';
            }

            starEls.push(
                <a key={index} href="#" onClick={this.handleClickRating.bind(this, index + 1)}>
                    <span style={{display: 'none'}}>1</span>
                    <i className={'fa ' + starClassName}></i>
                </a>
            );
        }

        return (
            <span className={this.props.className}>
                {starEls}
                {removeRatingEl}
            </span>
        );
    }
});

var MovieRow = React.createClass({
    handleClickRating: function(value) {
        $.ajax({
            url: '/movies/' + this.props.movie.movies_id + '.json',
            dataType: 'json',
            type: 'PATCH',
            data: {
                myRating: value
            },
            success: function(data) {
                if (this.props.onRatingSaved) {
                    this.props.onRatingSaved(data, this.props.movie);
                }
                if (this.props.onMovieChanged) {
                    this.props.onMovieChanged(this.props.movie);
                }
            }.bind(this),
            error: function(xhr, status, err) {
                console.log(status, err);
            }.bind(this)
        });

    },
    handleClickRemove: function() {
        var myRating = this.props.movie.myRating;

        if (!myRating) {
            return;
        }

        $.ajax({
            url: '/movie-ratings/' + myRating.movie_ratings_id + '.json',
            type: 'DELETE',
            success: function(data) {
                if (this.props.onRatingRemoved) {
                    this.props.onRatingRemoved(this.props.movie);
                }
                if (this.props.onMovieChanged) {
                    this.props.onMovieChanged(this.props.movie);
                }
            }.bind(this),
            error: function(xhr, status, err) {
                console.log(status, err);
            }.bind(this)
        });
    },
    render: function() {
        var rating = (this.props.movie.rating ? this.props.movie.rating : -1);
        var myRating = (this.props.movie.myRating ? this.props.movie.myRating.value : -1);

        function buildStarClassNamesArray(rating) {
            var index = -1,
                value = -1,
                starClassNames = [];
            for (index = 0; index < 5; index++) {
                value = index + 1;
                if (rating >= value) {
                    starClassNames.push('fa-star');
                } else {
                    starClassNames.push('fa-star-o');
                }
            }
            return starClassNames;
        }
        var ratingStarClassNames = buildStarClassNamesArray(rating);

        return (
            <tr className="movieRow">
                <td>{this.props.movie.title}</td>
                <td className="ratingCell">
                    <i className={'fa ' + ratingStarClassNames[0]}></i>
                    <i className={'fa ' + ratingStarClassNames[1]}></i>
                    <i className={'fa ' + ratingStarClassNames[2]}></i>
                    <i className={'fa ' + ratingStarClassNames[3]}></i>
                    <i className={'fa ' + ratingStarClassNames[4]}></i>
                </td>
                <td className="myRatingCell">
                    <StarRatingInput maxValue={5} value={myRating} onRatingChange={this.handleClickRating} showClear={true} onRatingCleared={this.handleClickRemove} />
                </td>
            </tr>
        );
    }
});

var MovieList = React.createClass({
    handleMovieChanged: function(movie) {
        if (this.props.onMovieChanged) {
            this.props.onMovieChanged(movie);
        }
    },
    render: function() {
        var rows = this.props.movies.map(function(movie) {
            return (
                <MovieRow key={movie.movies_id} movie={movie} onMovieChanged={this.handleMovieChanged} />
            );
        }.bind(this));
        return (
            <table className="table table-striped">
                <thead>
                    <th>Title</th>
                    <th>Rating</th>
                    <th>My Rating</th>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        );
    }
});

var ErrorMessageItem = React.createClass({
    render: function() {
        return (
            <div>{this.props.errorMessage}</div>
        );
    }
});

var ErrorMessages = React.createClass({
    render: function() {
        if (this.props.errorMessages && this.props.errorMessages.length > 0) {
            var items = this.props.errorMessages.map(function(errorMessage, i) {
                return (
                    <ErrorMessageItem key={i} errorMessage={errorMessage} />
                );
            });
            return (
                <div>
                    {items}
                </div>
            );
        } else {
            return null;
        }
    }
});

var AddMovieForm = React.createClass({
    getInitialState: function() {
        return {
            errorMessages: [],
            rating: 0
        };
    },
    handleSubmit: function(e) {
        e.preventDefault();

        var title = React.findDOMNode(this.refs.title).value.trim(),
            rating = this.state.rating;
        var newMovie;

        // TODO add validation for title and rating
        var validationErrorMessages = [];
        if (!title) {
            validationErrorMessages.push('Title is a required field');
        }
        if (title && title.length > 100) {
            validationErrorMessages.push('Title must be less than 100 characters');
        }
        if (rating < 0 || rating > 5) {
            validationErrorMessages.push('Rating must be a a number between 1 and 5');
        }
        this.setState({
            errorMessages: validationErrorMessages
        });
        if (validationErrorMessages.length > 0) {
            return;
        }

        newMovie = {
            title: title
        };

        if (rating > 0) {
            newMovie.rating = rating;
        }

        $.ajax({
            url: '/movies.json',
            dataType: 'json',
            type: 'POST',
            data: newMovie,
            success: function(data) {
                if (this.props.onMovieSaved) {
                    this.props.onMovieSaved(data);
                }

                // clear the form fields
                React.findDOMNode(this.refs.title).value = '';
                this.setState({
                    errorMessages: [],
                    rating: 0
                });
            }.bind(this),
            error: function(xhr, status, err) {
                console.log(status, err);
            }.bind(this)
        });

        return;
    },
    handleRatingChange: function(value) {
        this.setState({
            rating: value
        });
    },
    handleRatingCleared: function(value) {
        // set the rating back to 0 when the rating is cleared
        this.setState({
            rating: 0
        });
    },
    render: function() {
        var showClear = this.state.rating > 0;

        return (
            <div>
                <ErrorMessages errorMessages={this.state.errorMessages} />
                <form className="form-horizontal" onSubmit={this.handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title" className="col-sm-2 control-label">Title</label>
                        <div className="col-sm-10">
                            <input type="text" className="form-control" id="title" name="title" ref="title" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="rating" className="col-sm-2 control-label">Rating</label>
                        <div className="col-sm-10">
                            <div style={{height: '34px', padding: '6px 12px'}}>
                                <StarRatingInput maxValue={5} value={this.state.rating} onRatingChange={this.handleRatingChange} showClear={showClear} onRatingCleared={this.handleRatingCleared} />
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="col-sm-offset-2 col-sm-10">
                            <button type="submit" className="btn btn-default">Add</button>
                        </div>
                    </div>
                </form>
            </div>
        );
    }
});

var MoviesPageView = React.createClass({
    handleMovieSaved: function(data) {
        this.loadMoviesFromServer();
    },
    handleMovieChanged: function(movie) {
        console.log('Movie changed; updating list');
        this.loadMoviesFromServer();
    },
    getInitialState: function() {
        return {
            movies: []
        };
    },
    componentDidMount: function() {
        this.loadMoviesFromServer();
    },
    render: function() {
        return (
            <div>
                <AddMovieForm onMovieSaved={this.handleMovieSaved} />
                <MovieList movies={this.state.movies} onMovieChanged={this.handleMovieChanged} />
            </div>
        );
    },
    loadMoviesFromServer: function() {
        $.ajax({
            url: '/movies.json',
            dataType: 'json',
            cache: false,
            success: function(data) {
                this.setState({
                    movies: data.results
                });
            }.bind(this),
            error: function(xhr, status, err) {
                console.err(status, err);
            }.bind(this)
        });
    }
});

React.render(
    <div>
        <h1>{"Mo's Movies"}</h1>
        <MoviesPageView />
    </div>,
    document.getElementById('c')
);