// TODO
// - Endpoint security, especially token
// - Reload/server push for score updates
// - Automatic score updates
// - Importer
// - Leaderboard
// - Mobile testing
// - Sort matchups by kickoff time

App = Ember.Application.create();

var API_URI = '/api/';

var DEFAULT_DATE_FORMAT = 'MM/DD/YYYY';
var DEFAULT_DATETIME_FORMAT = 'MM/DD/YYYY hh:mm a';

var CONFERENCES = [ 'Big Ten', 'Mid-American', 'USA', 'Pac-12', 'ACC', 'SEC',
		    'Big East', 'American Athletic', 'Sun Belt' ];

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function parseDate(date) {
    return moment.tz(date, 'MM/DD/YYYY hh:mm a', 'America/New_York');
}

function betCovered(matchup, winner) {
    if (!matchup || !winner) return false;

    var awayScore = matchup.get('awayScore');
    var homeScore = matchup.get('homeScore');
	    
    if (homeScore || awayScore) {
	var line = matchup.get('line');
	var covered = homeScore + line > awayScore;

	if ((covered && winner === matchup.get('homeTeam')) ||
	    (!covered && winner === matchup.get('awayTeam'))) {
	    return true;
	}
    }

    return false;
}

App.DatePickerView = Ember.TextField.extend({
    didInsertElement: function() {
	this.$().datetimepicker({
	    format: 'm/d/Y',
	    timepicker: false
	});
    }
});

App.DateTimePickerView = Ember.TextField.extend({
    didInsertElement: function() {
	this.$().datetimepicker({
	    format: 'm/d/Y h:i a',
	    hours12: false
	});
    }
});

App.MomentTransform = DS.Transform.extend({
    deserialize: function(serialized) {
	if (serialized) {
	    var m = moment(serialized);
	    m = m.tz('America/New_York');
	    return m;
	}
	
	return serialized;
    },

    serialize: function(deserialized) {
	if (deserialized) {
	    var utc = deserialized.tz('UTC');
	    var e = utc.valueOf();
	    return e;
	}

	return deserialized;
    }
});

App.MomentDateTransform = DS.Transform.extend({
    deserialize: function(serialized) {
	if (serialized) {
	    var m = moment(serialized).tz('UTC');
	    return m;
	}
	
	return serialized;
    },

    serialize: function(deserialized) {
	if (deserialized) {
	    var e = deserialized.valueOf();
	    return e;
	}

	return deserialized;
    }
});

// http://discuss.emberjs.com/t/bootstrap-active-links-and-lis/5018
App.LinkLiComponent = Em.Component.extend({
    tagName: 'li',
    classNameBindings: ['active'],
    active: function() {
	return this.get('childViews').anyBy('active');
    }.property('childViews.@each.active')
});

function momentProperty(property, format) {
    if (typeof(format) === 'undefined') format = DEFAULT_DATETIME_FORMAT;
    
    return function(key, value, previous) {
	if (typeof(value) === 'undefined') {
	    var m = this.get(property);
	    if (!moment.isMoment(m)) return '';
	    var f = m.format(format);
	    return f;
	} else {
	    if (!value) {
		this.set(property, null);
	    } else {
		var m = moment.tz(value, format, "America/New_York");
		this.set(property, m);
	    }
	    return value;
	}
    }.property(property);
}

App.PickSerializer = DS.RESTSerializer.extend({
    extractSingle: function(store, type, payload, id) {
	if (payload.school) store.pushMany('school', payload.school);
	if (payload.matchup) store.pushMany('matchup', payload.matchup);
	if (payload.user) store.pushMany('user', payload.user);

	if (payload.picks) {
	    payload.picks.bets = payload.picks.bets.map(function(bet) {
		var m = store.getById('matchup', bet.matchup);

		return App.Bet.create({
		    user: store.getById('user', bet.user),
		    matchup: store.getById('matchup', bet.matchup),
		    winner: store.getById('school', bet.winner),
		    points: bet.points
		});
	    });
	}

	return this._super(store, type, payload, id);
    },

    serialize: function(record, options) {
	var bets = record.get('bets').map(function(bet) {
	    return { matchup: bet.matchup.get('id'),
		     user: bet.user.get('id'),
		     points: bet.points,
		     winner: bet.winner.get('id')
	    };
	});

	return { bets: bets };
    }
});

App.LeaderboardSerializer = DS.RESTSerializer.extend({
    extractSingle: function(store, type, payload, id) {
	if (payload.user) store.pushMany('user', payload.user);

	if (payload.leaderboard && payload.leaderboard.rankings) {
	    l = payload.leaderboard;
	    l.rankings = l.rankings.map(function(ranking) {
		ranking.user = store.getById('user', ranking.user);
		return Ember.Object.create(ranking);
	    });
	}

	return this._super(store, type, payload, id);
    }
});

App.ApplicationAdapter = DS.RESTAdapter.extend({
    namespace: 'api',

    headers: function() {
	return {
	    "X-BSC-Auth-Key": this.get("session.authToken")
	};
    }.property("session.authToken")
});

App.School = DS.Model.extend({
    name: DS.attr('string'),
    fullName: DS.attr('string'),
    abbreviation: DS.attr('string'),
    mascot: DS.attr('string'),
    conference: DS.attr('string'),
    primaryColor: DS.attr('string'),
    secondaryColor: DS.attr('string'),

    colors: function() {
	var c1 = this.get('primaryColor');
	var c2 = this.get('secondaryColor');
	return 'color:' + c1 + ';background-color:' + c2 + ';';
    }.property('primaryColor', 'secondaryColor'),

    invertedColors: function() {
	var c2 = this.get('primaryColor');
	var c1 = this.get('secondaryColor');
	return 'color:' + c1 + ';background-color:' + c2 + ';';
    }.property('primaryColor', 'secondaryColor')
});

App.User = DS.Model.extend({
    name: DS.attr('string'),
    email: DS.attr('string'),
    active: DS.attr('boolean'),
    admin: DS.attr('boolean'),
    order: DS.attr('number')
});

App.Matchup = DS.Model.extend({
    homeTeam: DS.belongsTo('school'),
    awayTeam: DS.belongsTo('school'),
    line: DS.attr('number'),
    kickoff: DS.attr('moment'),
    homeScore: DS.attr('number'),
    awayScore: DS.attr('number'),

    kickoffString: momentProperty('kickoff', DEFAULT_DATETIME_FORMAT),

    coveredColor: function() {
	var away = this.get('awayScore');
	var home = this.get('homeScore');

	if (away || home) {
	    var covered = home + this.get('line') > away;
	    return this.get((covered ? 'homeTeam' : 'awayTeam') + '.colors');
	}

	return '';
    }.property('homeScore', 'awayScore', 'homeTeam', 'awayTeam'),

    lineSign: function() {
	return (parseInt(this.get('line'), 10) > 0) ? '+' : '';
    }.property('line'),

    abbreviated: function() {
	return this.get('awayTeam.abbreviation') + ' vs. ' + this.get('homeTeam.abbreviation');
    }.property('awayTeam', 'homeTeam'),    
    
    unabbreviated: function() {
	return this.get('awayTeam.name') + ' vs. ' + this.get('homeTeam.name');
    }.property('awayTeam', 'homeTeam')
});

App.Week = DS.Model.extend({
    matchups: DS.hasMany('matchup'),
    users: DS.hasMany('user'),
    startDate: DS.attr('moment_date'),
    endDate: DS.attr('moment_date'),
    season: DS.attr('number'),
    number: DS.attr('number'),
    deadline: DS.attr('moment'),
    active: DS.attr('boolean'),

    startDateString: momentProperty('startDate', DEFAULT_DATE_FORMAT),
    endDateString: momentProperty('endDate', DEFAULT_DATE_FORMAT),
    deadlineString: momentProperty('deadline')
});

App.Pick = DS.Model.extend({
    users: DS.hasMany('user'),
    matchups: DS.hasMany('matchup'),
    editable: DS.attr('boolean'),
    weekNumber: DS.attr('number'),
    weekSeason: DS.attr('string'),
    weekStart: DS.attr('moment_date'),
    weekEnd: DS.attr('moment_date'),
    bets: DS.attr(),

    weekStartString: momentProperty('weekStart', DEFAULT_DATE_FORMAT),
    weekEndString: momentProperty('weekEnd', DEFAULT_DATE_FORMAT)
});

App.Leaderboard = DS.Model.extend({
    weekNumber: DS.attr('number'),
    weekSeason: DS.attr('string'),
    weekStart: DS.attr('moment_date'),
    weekEnd: DS.attr('moment_date'),
    totalPoints: DS.attr('number'),
    totalGames: DS.attr('number'),
    rankings: DS.attr(),

    weekStartString: momentProperty('weekStart', DEFAULT_DATE_FORMAT),
    weekEndString: momentProperty('weekEnd', DEFAULT_DATE_FORMAT)
});

App.Bet = Ember.Object.extend({
    matchup: null,
    winner: null,
    points: 0,

    teams: function() {
	var matchup = this.get('matchup');
	return [matchup.get('awayTeam'), matchup.get('homeTeam')];
    }.property('matchup'),

    isGoodPick: function() {
	var awayScore = this.get('matchup.awayScore');
	var homeScore = this.get('matchup.homeScore');
	if (awayScore || homeScore) {
	    if (betCovered(this.get('matchup'), this.get('winner'))) {
		return 'success';
	    } else {
		return 'danger';
	    }
	}
	return '';
    }.property('winner')
});

App.BetsForUser = Ember.Object.extend({
    user: null,
    bets: null,
    name: null,
    isCurrentUser: false,
    
    gamesWon: function() {
	return this.bets.reduce(function(prev, cur, idx, array) {
	    if (!cur) return prev;
	    return betCovered(cur.matchup, cur.winner) ? prev + 1 : prev;
	}, 0);
    }.property('bets.@each.points', 'bets.@each.winner'),

    totalPoints: function() {
	return this.bets.reduce(function(prev, cur, idx, array) {
	    if (!cur) return prev;

	    var pointsStr = cur.points;
	    var points = isNumber(pointsStr) ? parseInt(pointsStr, 10) : 0;
	    
	    return betCovered(cur.matchup, cur.winner) ? prev + points : prev;
	}, 0);
    }.property('bets.@each.points', 'bets.@each.winner'),

    totalPointsBet: function() {
	return this.bets.reduce(function(prev, cur, idx, array) {
	    if (!cur) return prev;

	    var pointsStr = cur.points;
	    var points = isNumber(pointsStr) ? parseInt(pointsStr, 10) : 0;
	    
	    return prev + points;
	}, 0);
    }.property('bets.@each.points', 'bets.@each.winner')
});

// TODO: the <div> wrapper should be part of this component
App.PointsInputComponent = Ember.TextField.extend({
    valueCheck: function() {
	var eid = this.get('elementId');
	var j = Ember.$("#" + eid);
	var p = j.closest('div');
	p.removeClass('has-error');

	if (!isNumber(this.get('value'))) {
	    p.addClass('has-error');
	    return;
	}

	var n = parseInt(this.get('value'), 10);
	if (n < 1 || n > 100) {
	    p.addClass('has-error');
	    return;
	}
    }.observes('value')
});

App.Router.map(function() {
    this.resource('schools', function() {
	this.route('new', { path: 'new' });
	this.route('edit', { path: ':school_id/edit' });
    });

    this.resource('matchups', function() {
	this.route('new', { path: 'new' });
	this.route('edit', { path: ':matchup_id/edit' });
    });

    this.resource('weeks', function() {
	this.route('new', { path: 'new' });
	this.route('edit', { path: ':week_id/edit' });
    });

    this.route('picks', { path: 'picks' });
    this.route('picks.view', { path: 'picks/:week_id/view' });
    this.route('picks.edit', { path: 'picks/:week_id/edit' });
    this.route('picks.summary', { path: 'picks/:week_id/summary' });
    this.route('picks.leader', { path: 'picks/:week_id/leaderboard' });

    this.route('scores.editCurrent', { path: 'scores/edit' });
    this.route('scores.edit', { path: 'scores/:week_id/edit' });    

    this.resource('users', { path: 'users' });

    this.route('tokens', { path: 'tokens/:week_id' });

    this.route('login', { path: 'login' });
    this.route('loginToken', { path: 'login/:token' });
    this.route('loginError', { path: 'login/error' });
    this.route('logout', { path: 'logout' });
});

App.Router.reopen({
    location: 'history'
});

App.ApplicationRoute = Ember.Route.extend({
    model: function() {
	var self = this;
	
	return $.get(API_URI + 'current').then(function(resp) {
	    var model = {user: null, weeks: [], schools: []};

	    model.user = resp.user ? self.store.push('user', resp.user) : null;
	    
	    var current = resp.current;
	    model.currentSeason = current.season
	    model.currentWeek = current.week

	    model.weeks = resp.week;

	    return model;
	});
    },

    setupController: function(c, m) {
	// for some reason, we get the following interleaving when loading the page
	// for the fist time from a login URL:
	// 1) AppRoute.model
	// 2) AppRoute.model callback
	// 3) LoginTokenRoute.model
	// 4) LoginTokenRoute.model callback
	// 5) AppRoute.setupController
	// this interleaving causes us to lose the "user" attribute when we set the
	// model here
	var loggedIn = c.get('user');
	if (loggedIn) m.user = loggedIn;
	c.set('model', m);
    }
});

App.ApplicationController = Ember.ObjectController.extend({
    content: {},
    adminOn: false,
    
    isAdmin: function() {
	if (!this.get('user')) return false;
	return this.get('user.admin') && this.get('adminOn');
    }.property('user', 'adminOn'),
    
    isLoggedIn: function() {
	var u = this.get('user');
	return !Ember.isEmpty(this.get('user'));
    }.property('user')
});

App.SchoolsRoute = Ember.Route.extend({
    model: function() {
	return this.store.find('school');
    }
});

App.SchoolsEditRoute = Ember.Route.extend({
    model: function(params) {
	return this.store.find('school', params.school_id);
    },

    renderTemplate: function() {
	this.render('schools._form', { controller: 'schoolsEdit' });
    }    
});

App.SchoolsNewRoute = Ember.Route.extend({
    model: function(params) {
	return this.store.createRecord('school');
    },

    setupController: function(controller, model) {
	var edit = this.controllerFor('schoolsEdit');
	edit.set('model', model);
    },
    
    renderTemplate: function() {
	this.render('schools._form', { controller: 'schoolsEdit' });
    }    
});

App.SchoolsIndexController = Ember.ArrayController.extend({
    actions: {
	newSchool: function() {
	    this.transitionToRoute('schools.new');
	}
    }
});

App.SchoolsEditController = Ember.ObjectController.extend({
    conferences: function() {
	return CONFERENCES;
    }.property(),
    
    actions: {
	save: function() {
	    var self = this;
	    var m = this.get('model');
	    this.get('model').save().then(function() {
		self.transitionToRoute('schools');
	    });
	}
    }
});

App.MatchupsRoute = Ember.Route.extend({
    model: function() {
	return this.store.find('matchup');
    }
});

App.MatchupsIndexController = Ember.ObjectController.extend({
    actions: {
	newMatchup: function() {
	    this.transitionToRoute('matchups.new');
	},
    }
});

App.MatchupsNewRoute = Ember.Route.extend({
    beforeModel: function() {
	var self = this;
	return this.store.find('school').then(function(schools) {
	    self.set('schools', schools);
	});
    },

    model: function() {
	return {};
    },

    setupController: function(controller, model) {
	controller.set('model', model);
	
	var schools = this.get('schools');
	controller.set('schools', schools);
    },

    renderTemplate: function() {
	this.render('matchups._form', { controller: 'matchupsNew' });
    }
});

App.MatchupsEditRoute = App.MatchupsNewRoute.extend({
    model: function(params) {
	return this.store.find('matchup', params.matchup_id);
    },
    
    renderTemplate: function() {
	this.render('matchups._form', { controller: 'matchupsEdit' });
    }
});

App.MatchupsEditController = Ember.ObjectController.extend({
    actions: {
	save: function() {
	    this.get('model').save();
	    this.transitionToRoute('matchups');
	}
    }
});

App.MatchupsNewController = App.MatchupsEditController.extend({
    content: {},

    actions: {
	save: function() {
	    var model = this.get('model');
	    var record = this.store.createRecord('matchup', model);
	    return record.save();
	}
    }
});

App.ScoresEditCurrentRoute = Ember.Route.extend({
    controllerName: 'scoresEdit',
    templateName: 'scores.edit',

    model: function(params) {
	return this.store.find('pick', 'current');
    },

    setupController: function(controller, model) {
	controller.set('model', model.get('matchups'));
    }
});

App.ScoresEditRoute = Ember.Route.extend({
    model: function(params) {
	return this.store.find('pick', params.week_id);
    },

    setupController: function(controller, model) {
	controller.set('model', model.get('matchups'));
    }
});

App.ScoresEditController = Ember.ArrayController.extend({
    actions: {
	save: function() {
	    this.get('model').save();
	}
    }
});

App.PicksRoute = Ember.Route.extend({
    model: function() {
	return this.store.find('pick', 'current');
    },

    afterModel: function(model, transition) {
	if (model.get('editable')) {
	    this.replaceWith('picks.edit', model);
	} else {
	    this.replaceWith('picks.view', model);
	}
    }
});

App.PicksViewRoute = Ember.Route.extend({
    model: function(params) {
	return this.store.find('pick', params.week_id);
    },

    setupController: function(controller, model) {
	controller.set('model', model);

	controller.set('sortedMatchups', Ember.ArrayProxy.createWithMixins(
	    Ember.SortableMixin, {
		content: model.get('matchups'),
		sortProperties: ['kickoff', 'line'],
	        sortAscending: true,
		sortFunction: function(l, r) {
		    if (l < r) return -1;
		    if (l > r) return 1;
		    return 0;
		}
	    }));
    }
});

App.PicksEditRoute = App.PicksViewRoute.extend({
    afterModel: function(model, transition) {
	var user = this.controllerFor('application').get('user');

	if (!model.get('bets.length')) {
	    model.set('bets', model.get('matchups').map(function(matchup) {
		return App.Bet.create({ matchup: matchup, points: 0,
					winner: null, user: user });
	    }));
	}
    },

    setupController: function(controller, model) {
	controller.set('week', model);

	var current = this.controllerFor('application').get('user');
	controller.set('user', current);
	controller.set('model', model.get('bets'));
    }
});

App.PicksEditController = Ember.ArrayController.extend({
    needs: ['application'],

    sortProperties: ['matchup.kickoff', 'matchup.line'],
    sortAscending: true,
    sortFunction: function(l, r) {
	if (l < r) return -1;
	if (l > r) return 1;
	return 0;
    },

    isAdmin: Ember.computed.alias('controllers.application.isAdmin'),
    isLoggedIn: Ember.computed.alias('controllers.application.isLoggedIn'),
    user: null,
    users: Ember.ArrayProxy.create({ content: [] }),

    canEdit: function() {
	var e = this.get('week').get('editable');
	var a = this.get('isAdmin');
	var user = this.get('user');

	if (a && this.get('users.length') === 0) {
	    var self = this;
	    this.store.find('user').then(function(users) {
		self.get('users').set('content', users);

		var select = Ember.$("#userOverride");
		var emberId = select.closest('.ember-view').attr('id');
		var view = Ember.View.views[emberId];
		view.set('value', user);
	    });
	}
	
	return e || a;
    }.property('week.editable', 'isAdmin'),
    
    totalPoints: function() {
	return this.get('model').reduce(function(prev, cur, idx, array) {
	    var points = cur.points;
	    return prev + (isNumber(points) ? parseInt(points, 10) : 0);
	}, 0);
    }.property('@each.points'),

    userChanged: function() {
	var user = this.get('user');

	var bets = this.get('week.bets').filter(function(bet, idx, enumerable) {
	    return bet.get('user') === user;
	});

	if (bets.length === 0) {
	    bets = this.get('week.matchups').map(function(matchup) {
		return App.Bet.create({
		    user: user, matchup: matchup,
		    winner: null, points: 0
		});
	    });
	}

	this.set('model', bets);
    }.observes("user"),
    
    actions: {
	save: function() {
	    var total = 0;
	    var error = '';
	    var max = 101 - this.get('model.length');
	    var self = this;

	    this.get('model').forEach(function(bet) {
		if (error.length != 0) return;

		// we should be able to rely on setupController() for this, but
		// we can't since ApplicationController might not be fully
		// configured yet
		if (!bet.get('user')) bet.set('user', self.get('user'));
		
		var m = bet.get('matchup');
		var matchup = m.get('awayTeam.name') + ' vs ' + m.get('homeTeam.name');

		if (!isNumber(bet.get('points'))) {
		    error = matchup + ': only numbers are allowed';
		    return;
		}

		var p = parseInt(bet.get('points'), 10);

		if (p < 1 || p > max) {
		    error = matchup + ': points must be between 1 and ' + max;
		    return;
		}

		if (!bet.get('winner')) {
		    error = matchup + ': missing winner';
		    return;
		}

		total += p;
	    });

	    if (error.length == 0 && total > 100) {
		error = 'Total points cannot exceed 100';
	    }

	    if (error.length != 0) {
		alert(error);
		return;
	    }

	    var model = this.get('week');

	    var self = this;
	    var p = model.save();
	    p.then(function(args) {
		self.transitionToRoute('picks.view', self.get('week'));
	    });
	}
    }
});

App.PicksViewController = Ember.ObjectController.extend({
    needs: ['application'],
    isAdmin: Ember.computed.alias('controllers.application.isAdmin'),
    
    userBets: function() {
	var self = this;
	var users = this.get('users').toArray();

	users.sort(function(u1, u2) {
	    var o1 = u1.get('order'),
	        o2 = u2.get('order');
	    if (o1 < o2) return -1;
	    if (o1 > o2) return 1;
	    return 0;
	});

	return users.map(function(user) {
	    return App.BetsForUser.create({
		name: user.get('name'),
		user: user,
		bets: self.orderedBets(user),
		isCurrentUser: user === self.get('controllers.application.user')
	    });
	});
    }.property('model.bets.@each'),

    orderedBets: function(user) {
	var bets = this.get('bets');
	var uname = user.get('name');
	return this.get('sortedMatchups').map(function(matchup) {
	    var f = bets.filter(function(bet) {
		return (bet.user === user && bet.matchup === matchup);
	    });

	    return f.length > 0 ? f.objectAt(0) : Ember.Object.create();
	});
    },

    isPicksActive: function() {
	var p = this.get('currentPath');
	debugger;
	return this.get('currentPath').indexOf('/view') > -1;
    }.property('currentPath'),

    isLeaderboardActive: function() {
	return false;
    }.property('currentPath'),

    actions: {
	editPicks: function(userBets) {
	    // TODO: need to make a more specific route like
	    // /picks/:week_id/:user_id
	    this.transitionToRoute('picks.edit', this.get('model'));
	}
    }
});

App.PicksSummary = Ember.Object.extend({
    week: null,
    user: null,
    picks: null,

    isComplete: function() {
	return this.picks === this.week.get('matchups.length');
    }.property('week.matchups.length', 'picks')
});

App.PicksSummaryRoute = Ember.Route.extend({
    model: function(params) {
	var self = this;
	return Ember.$.get(API_URI + 'picks/' + params.week_id + '/summary')
	    .then(function(response) {
		// TODO: why doesn't pushPayload work?
		self.store.push('week', response.week);
		self.store.pushMany('user', response.user);
		self.store.pushMany('matchup', response.matchup);
		return response;
	    });
    },

    setupController: function(controller, model) {
	var self = this;
	var week = this.store.getById('week', model.week.id);

	controller.set('week', week);
	controller.set('model', model.submissions.map(function(entry) {
	    return App.PicksSummary.create({
		user: self.store.getById('user', entry.user),
		picks: entry.picks,
		week: week });
	}));
    }
});

App.PicksSummaryController = Ember.ArrayController.extend({
    sortProperties: ['user.order'],
    sortAscending: true,
});

App.PicksLeaderRoute = Ember.Route.extend({
    model: function(params) {
	return this.store.find('leaderboard', params.week_id);
    },

    setupController: function(c, m) {
	c.set('week', m);
	c.set('model', m.get('rankings'));
    }
});

App.PicksLeaderController = Ember.ArrayController.extend({
    sortAscending: false,
    sortProperties: [ 'points' ],
    
    actions: {
	sortBy: function(arg) {
	    var current = this.get('sortProperties');
	    if (current.objectAt(0) === arg) {
		this.set('sortAscending', !this.get('sortAscending'));
	    } else {
		this.set('sortAscending', arg === 'user.name');
		this.set('sortProperties', [arg]);
	    }
	}
    }
});

App.WeeksRoute = Ember.Route.extend({
    actions: {
	search: function(args) {
	    var self = this;
	    var child = this.controllerFor('weeksIndex');
	    var season = this.controllerFor('weeks')._season;
	    this.store.find('week', { season: season }).then(function(weeks) {
		child.set('model', weeks);
	    });
	}
    }
});

App.WeeksNewRoute = Ember.Route.extend({
    beforeModel: function() {
	var self = this;
	var schools = this.store.find('school').then(function(schools) {
	    self.set('schools', schools);
	});
	var users = this.store.find('user').then(function(users) {
	    self.set('users', users);
	});
	return Ember.RSVP.all([schools, users]);
    },

    model: function() {
	var w = this.store.createRecord('week');
	w.set('season', moment().year());
	return w;
    },

    setupController: function(controller, model) {
	controller = this.controllerFor('weeksEdit');
	controller.set('model', model);

	var schools = Ember.ArrayProxy.createWithMixins(Ember.SortableMixin, {
	    content: this.get('schools'),
	    sortProperties: ['conference', 'name']
	});

	var users = Ember.ArrayProxy.createWithMixins(Ember.SortableMixin, {
	    content: this.get('users'),
	    sortProperties: ['name']
	});

	controller.set('schools', schools);
	controller.set('allUsers', users);
    },

    renderTemplate: function() {
	this.render('weeks._form', { controller: 'weeksEdit' });
    }
});

App.WeeksController = Ember.Controller.extend({
    _season: '',

    query: function(key, value, previous) {
	if (value) {
	    this._season = parseInt(value, 10);
	} else {
	    return this._season;
	}
    }.property(),

});

App.WeeksEditRoute = App.WeeksNewRoute.extend({
    model: function(params) {
	return this.store.find('week', params.week_id);
    },
    
    renderTemplate: function() {
	this.render('weeks._form', { controller: 'weeksEdit' });
    }
});

App.ToggleableUser = Ember.Object.extend({
    user: null,
    list: null,
    name: Ember.computed.alias('user.name'),

    active: function(key, value, previous) {
	if (value == undefined) {
	    return this.list.indexOf(this.user) >= 0;
	} else {
	    if (value && this.list.indexOf(this.user) < 0) {
		this.list.addObject(this.user);
	    } else if (!value) {
		this.list.removeObject(this.user);
	    }
	}
    }.property(),
});

App.MatchupEditorController = Ember.ObjectController.extend({
    needs: ['weeksEdit'],
    schools: Ember.computed.alias('controllers.weeksEdit.schools'),

    kickoffTime: function(key, value, previous) {
	var kickoff = this.get('kickoff');

	if (typeof(value) != 'undefined') {
	    debugger;
	    var m = moment(value, "h:mm a");
	    if (m.isValid()) {
		kickoff.hour(m.hour()).minute(m.minute())
	    }
	}
	
	return kickoff.format('h:mm a');
    }.property('kickoff'),

    kickoffDate: function(key, value, previous) {
	var kickoff = this.get('kickoff');

	if (typeof(value) != 'undefined') {
	    debugger;
	    var m = moment(value, "MM/DD/YYYY");
	    if (m.isValid()) {
		kickoff.month(m.month()).date(m.date()).year(m.year());
	    }
	}

	return kickoff.format('MM/DD/YYYY');
    }.property('kickoff')
});

App.WeeksEditController = Ember.ObjectController.extend({
    toggleableUsers: function() {
	var active = this.get('users');

	return this.get('allUsers').map(function(user) {
	    return App.ToggleableUser.create({ user: user, list: active });
	});
    }.property('users.[]'),

    isNotNew: function() {
	var n = this.get('isNew');
	return !n;
    }.property('isNew'),

    actions: {
	newMatchup: function() {
	    var kickoff = this.get('startDate');
	    if (!kickoff) kickoff = moment.tz('America/New_York');

	    kickoff.day(6);
	    kickoff.hour(12);
	    kickoff.minute(0);

	    var newM = this.store.createRecord('matchup', { kickoff: kickoff });
	    var m = this.get('matchups');
	    m.pushObject(newM);
	},

	removeMatchup: function(arg) {
	    arg.rollback();
	    var m = this.get('matchups');
	    m.removeObject(arg);
	},

	save: function() {
	    var self = this;
	    var model = this.get('model');

	    // default the deadline to the first kickoff time
	    if (!model.get('deadline')) {
		var first = model.get('matchups').reduce(function(prev, cur, idx, array) {
		    var kickoff = cur.get('kickoff');
		    if (!prev) return kickoff;
		    return kickoff.isBefore(prev) ? kickoff : prev;
		});

		if (first) {
		    model.set('deadline', first);
		}
	    }
	    
	    var promises = model.get('matchups').map(function(matchup) {
		return matchup.save();
	    });

	    var after = Ember.RSVP.all(promises);
	    after.then(function(results) {
		model.save().then(function(result) {
		    self.transitionToRoute('weeks.index');
		});
	    });
	},

	activate: function() {
	    var self = this;

	    $.ajax({ url: API_URI + 'weeks/' + this.get('id') + '/activate',
		     type: 'PUT' }).then(function(response) {
			 alert('Emails sent to ' + response.recipients.length + ' users');
			 self.transitionToRoute('picks');
		     }, function(response) {
			 alert('Error: ' + response.responseText);
		     });
	},

	clearPicks: function() {
	    var self = this;

	    if (confirm("Are you sure want to clear all picks for this week?")) {
		$.ajax({ url: API_URI + 'picks/' + this.get('id'),
			 type: 'DELETE' })
		    .then(function(response) {
			self.transitionToRoute('picks.view', self.get('id'));
		    }, function(response) {
			alert('Error: ' + response.responseText);
		    });
	    }
	}
    }
});

App.WeeksIndexRoute = Ember.Route.extend({
    model: function() {
	var now = moment();
	var currentYear = moment().year();
	if (now.month() === 1) {
	    currentYear -= 1;
	}
	return this.store.find('week', { season: currentYear });
    }
});

App.WeeksIndexController = Ember.ArrayController.extend({
    sortProperties: ['number'],
    sortAscending: false,
    
    actions: {
	editWeek: function(week) {
	    this.transitionToRoute('weeks.edit', week);
	},

	newWeek: function() {
	    this.transitionToRoute('weeks.new');
	},

	editPicks: function(week) {
	    this.transitionToRoute('picks.edit', week.get('id'));
	}
    }
});

App.UsersRoute = Ember.Route.extend({
    model: function() {
	return this.store.find('user');
    }
});

App.UserController = Ember.ObjectController.extend({
    _isEditing: true,
    
    isEditing: function() {
	/*if (this.get('name').length === 0 ||
	    this.get('order').toString().length === 0)
	    this._isEditing = true;
	*/
	return this._isEditing;
    }.property(),

    actions: {
	editUser: function() {
	    this.set('isEditing', true);
	},

	doneEditing: function() {
	    //this.set('isEditing', false);
	}
    }
});

App.UsersController = Ember.ArrayController.extend({
    itemController: 'user',
    //sortProperties: ['order'],
    //sortAscending: true,

    actions: {
	save: function() {
	    var promises = this.get('model').map(function(user) {
		return user.save();
	    });
	    var after = Ember.RSVP.all(promises);
	    after.then(function(results) {
		
	    });
	},

	newUser: function() {
	    this.store.createRecord('user', {active: true});
	}
    }
});

App.TokensRoute = Ember.Route.extend({
    model: function(params) {
	return this.store.find('week', params.week_id);
    }
});

App.TokensController = Ember.ObjectController.extend({
    needs: ['application'],
    isAdmin: Ember.computed.alias('controllers.application.isAdmin'),

    actions: {
	fetchTokens: function() {
	    var self = this;
	    var users = this.get('users');
	    var callback = function(tokens) {
		tokens.forEach(function(token) {
		    var user = users.filter(function(user) {
			return user.get('id') == token.user;
		    });
		    if (user.length > 0) {
			user[0].set('token', token.token);
		    }
		});
	    };
	    var p = Ember.$.get(API_URI + 'tokens/' + this.get('id'), '', callback);
	},

	sendEmails: function() {
	    var addr = API_URI + 'tokens/' + this.get('id') + '/email';
	    $.post(addr, '').then(function(response) {
		alert('Emails sent to ' + response.recipients.length + ' users');
	    }, function(response) {
		alert('Error: ' + response.responseText);
	    });
	}
    }
});

App.LoginTokenRoute = Ember.Route.extend({
    model: function(params) {
	var self = this;

	var post = { token: params.token };
	return $.post(API_URI + 'login', post).then(function(response) {
	    var user = self.store.push('user', response.user);
	    var controller = self.controllerFor('application');

	    controller.set('user', user);
	    self.replaceWith('picks');
	}, function(response) {
	    self.controllerFor('loginError').set('message', response.responseJSON.error);
	    self.replaceWith('loginError');
	});
    }
});

App.LoginController = Ember.ObjectController.extend({
    needs: ['application'],
    loginFailed: false,
    userId: null,
    password: null,
    
    actions: {
	login: function() {
	    this.set('loginFailed', false);
	    
	    var data = { userId: this.get('userId'),
			 password: this.get('password') };

	    var self = this;

	    $.post(API_URI + 'login', data).then(function(response) {
		var user = self.store.push('user', response.user);
		self.set('controllers.application.user', user);
		self.transitionToRoute('picks');
	    }, function(response) {
		self.set('loginFailed', true);
	    });
	}
    }
});

App.LoginErrorController = Ember.ObjectController.extend({
    message: null
});

App.LogoutRoute = Ember.Route.extend({
    model: function(params) {
	var self = this;

	return new Ember.RSVP.Promise(function(resolve, reject) {
	    $.post(API_URI + 'logout', '', resolve).fail(reject);
	}).then(function() {
	    self.controllerFor('application').set('user', null);
	    self.transitionTo('logout');
	});
    }
});
