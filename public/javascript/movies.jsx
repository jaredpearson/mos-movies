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

var Pagination = React.createClass({
    handlePreviousClick: function(e) {
        e.preventDefault();
        if (!this.hasPrevious()) {
            return;
        }

        if (this.props.onChange) {
            this.props.onChange({
                offset: Math.max(this.props.offset - this.props.limit, 0)
            });
        }
    },
    handleNextClick: function(e) {
        e.preventDefault();
        if (!this.hasNext()) {
            return;
        }

        if (this.props.onChange) {
            this.props.onChange({
                offset: Math.min(this.props.offset + this.props.limit, this.props.total)
            });
        }
    },
    hasNext: function() {
        return this.props.offset + this.props.limit < this.props.total;
    },
    hasPrevious: function() {
        return this.props.offset > 0;
    },
    render: function() {
        var previousButton,
            nextButton;

        previousButton = (
            <li className={(this.hasPrevious()) ? '' : 'disabled'}>
                <a href="#" aria-label="Previous" onClick={this.handlePreviousClick}><span aria-hidden="true">&laquo;</span></a>
            </li>
        );

        nextButton = (
            <li className={(this.hasNext()) ? '' : 'disabled'}>
                <a href="#" aria-label="Next" onClick={this.handleNextClick}><span aria-hidden="true">&raquo;</span></a>
            </li>
        );

        return (
            <div className={this.props.className}>
                <ul className="pagination">
                    {previousButton}
                    {nextButton}
                </ul>
            </div>
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

var ColumnHeader = React.createClass({
    handleClick: function(e) {
        e.preventDefault();
        if (this.props.onClick) {
            this.props.onClick(this.props.sortKey);
        }
    },
    render: function() {
        var chevronEl;

        if (this.props.selected) {
            if (this.props.selectedDirection === 'asc') {
                chevronEl = (<i className="fa fa-sort-asc"></i>);
            } else {
                chevronEl = (<i className="fa fa-sort-desc"></i>);
            }
        }

        return (
            <a href="#" onClick={this.handleClick}>{this.props.label} {chevronEl}</a>
        );
    }
});

var MovieList = React.createClass({
    handleMovieChanged: function(movie) {
        if (this.props.onMovieChanged) {
            this.props.onMovieChanged(movie);
        }
    },
    handleSortChanged: function(sortKey) {
        if (this.props.onSortChanged) {
            this.props.onSortChanged(sortKey);
        }
    },
    handlePageChange: function(e) {
        if (this.props.onPageChange) {
            this.props.onPageChange(e);
        }
    },
    render: function() {
        var rows;

        rows = this.props.movies.map(function(movie) {
            return (
                <MovieRow key={movie.movies_id} movie={movie} onMovieChanged={this.handleMovieChanged} />
            );
        }.bind(this));

        return (
            <div>
                <Pagination
                    className="text-right"
                    onChange={this.handlePageChange}
                    offset={this.props.offset}
                    total={this.props.numberOfMovies}
                    limit={this.props.limit} />
                <table className="table table-striped movieList">
                    <thead>
                        <th><ColumnHeader sortKey="title" label="Title" selected={this.props.sortKey === 'title'} selectedDirection={this.props.sortDirection} onClick={this.handleSortChanged} /></th>
                        <th><ColumnHeader sortKey="rating" label="Rating" selected={this.props.sortKey === 'rating'} selectedDirection={this.props.sortDirection} onClick={this.handleSortChanged} /></th>
                        <th><ColumnHeader sortKey="myRating" label="My Rating" selected={this.props.sortKey === 'myRating'} selectedDirection={this.props.sortDirection} onClick={this.handleSortChanged} /></th>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
                <Pagination
                    className="text-center"
                    onChange={this.handlePageChange}
                    offset={this.props.offset}
                    total={this.props.numberOfMovies}
                    limit={this.props.limit} />
            </div>
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
                <div className="alert alert-danger">
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

                if (xhr.status === 400) {
                    this.setState({
                        errorMessages: [xhr.responseJSON.error]
                    });
                } else {
                    this.setState({
                        errorMessage: ['Unexpected error occurred']
                    });
                }
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
    handleSortChanged: function(sortKey) {
        console.log('Sort changed; updating list');
        var stateObj = {
            sortKey: sortKey
        };

        if (this.state.sortKey === sortKey) {
            if (this.state.sortDirection === 'asc') {
                stateObj.sortDirection = 'desc';
            } else {
                stateObj.sortDirection = 'asc';
            }
        } 

        this.setState(stateObj, function() {
            this.loadMoviesFromServer();
        }.bind(this));
    },
    handlePageChange: function(options) {
        var stateObj = {
            offset: options.offset || 0
        };
        this.setState(stateObj, function() {
            this.loadMoviesFromServer();
        }.bind(this));
    },
    getInitialState: function() {
        return {
            movies: [],
            sortKey: 'title',
            sortDirection: 'asc',
            offset: 0,
            limit: 100,
            numberOfMovies: 0
        };
    },
    componentDidMount: function() {
        this.loadMoviesFromServer();
    },
    render: function() {
        return (
            <div>
                <AddMovieForm onMovieSaved={this.handleMovieSaved} />
                <MovieList
                    movies={this.state.movies}
                    sortKey="title"
                    onMovieChanged={this.handleMovieChanged}
                    onSortChanged={this.handleSortChanged}
                    sortKey={this.state.sortKey}
                    sortDirection={this.state.sortDirection}
                    offset={this.state.offset}
                    limit={this.state.limit}
                    numberOfMovies={this.state.numberOfMovies}
                    onPageChange={this.handlePageChange} />
            </div>
        );
    },
    loadMoviesFromServer: function() {
        $.ajax({
            url: '/movies.json',
            dataType: 'json',
            cache: false,
            data: {
                sortKey: this.state.sortKey,
                sortDirection: this.state.sortDirection,
                offset: this.state.offset,
                limit: this.state.limit
            },
            method: 'GET',
            success: function(data) {
                this.setState({
                    movies: data.results,
                    numberOfMovies: data.numberOfMovies,
                    offset: data.offset,
                    limit: data.limit
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
