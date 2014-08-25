App = Ember.Application.create();

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function parseDate(date) {
    return moment.tz(date, 'MM/DD/YYYY hh:mm a', 'America/New_York');
}

function betCovered(matchup, winner) {
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

Ember.Handlebars.registerBoundHelper('display-datetime', function(value, dateOnly) {
    var m = moment.tz(value, 'MM/DD/YYYY hh:mm a', 'America/New_York');
    var fmt = 'MM/DD/YYYY';
    if (!dateOnly) {
	fmt += ' hh:mm a';
    }
    return m.format(fmt);
});

App.MdateTransform = DS.Transform.extend({
    deserialize: function(serialized) {
	if (serialized) {
	    var m = moment(serialized);
	    m = m.tz('America/New_York');
	    serialized = m.format('MM/DD/YYYY hh:mm a');
	}
	
	return serialized;
    },

    serialize: function(deserialized) {
	if (deserialized) {
	    var m = parseDate(deserialized);
	    var m2 = m.tz('UTC');
	    deserialized = m.tz('UTC').format();
	}

	return deserialized;
    }
});

App.PickSerializer = DS.RESTSerializer.extend({
    serialize: function(record, options) {
	var bets = record.get('bets').map(function(bet) {
	    return { matchup: bet.matchup.get('id'),
		     points: bet.points,
		     winner: bet.winner.get('id')
	    };
	});
	var d = { bets: bets };
	if (record.get('userOverride')) {
	    d.user = record.get('userOverride').get('id');
	}
	return d;
    }
});

DS.RESTAdapter.reopen({
    host: 'http://localhost:8080',
    namespace: 'api'
});

App.School = DS.Model.extend({
    name: DS.attr('string'),
    fullName: DS.attr('string'),
    abbreviation: DS.attr('string'),
    mascot: DS.attr('string'),
    primaryColor: DS.attr('string'),
    secondaryColor: DS.attr('string')
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
    kickoff: DS.attr('mdate'),
    homeScore: DS.attr('number'),
    awayScore: DS.attr('number'),

    coveredColor: function() {
	if (this.get('homeScore') || this.get('awayScore')) {
	    var away = parseInt(this.get('awayScore'), 10);
	    var home = parseInt(this.get('homeScore'), 10);
	    var line = parseFloat(this.get('line'), 10);

	    return home + line > away ? 'success' : 'danger';
	}
	
	return '';
    }.property('homeScore', 'awayScore')
});

App.Week = DS.Model.extend({
    matchups: DS.hasMany('matchup'),
    users: DS.hasMany('user'),
    startDate: DS.attr('mdate'),
    endDate: DS.attr('mdate'),
    season: DS.attr('number'),
    number: DS.attr('number'),
    deadline: DS.attr('mdate')
});

App.Pick = DS.Model.extend({
    users: DS.hasMany('user'),
    matchups: DS.hasMany('matchup'),
    editable: DS.attr('boolean'),
    bets: DS.attr()
});

App.Bet = Ember.Object.extend({
    matchup: null,
    winner: null,
    points: 0,

    teams: function() {
	var matchup = this.get('matchup');
	return [matchup.get('awayTeam'), matchup.get('homeTeam')];
    }.property('matchup'),

    colors: function() {
	var w = this.get('winner');
	var c1 = w.get('primaryColor');
	var c2 = w.get('secondaryColor');
	return 'color:' + c1 + ';background-color:' + c2;
    }.property('winner')
});

App.BetsForUser = Ember.Object.extend({
    user: null,
    bets: null,

    gamesWon: function() {
	return this.bets.reduce(function(prev, cur, idx, array) {
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
    }.property('bets.@each.points', 'bets.@each.winner')
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

    this.route('picks.viewCurrent', { path: 'picks/view' });
    this.route('picks.editCurrent', { path: 'picks/edit' });
    this.route('picks.view', { path: 'picks/:week_id/view' });
    this.route('picks.edit', { path: 'picks/:week_id/edit' });

    this.route('scores.editCurrent', { path: 'scores/edit' });
    this.route('scores.edit', { path: 'scores/:week_id/edit' });    

    this.resource('users', { path: 'users' });
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

App.ApplicationController = Ember.ObjectController.extend({
    isAdmin: function() {
	return true;
    }.property()
});

App.SchoolsIndexController = Ember.ArrayController.extend({
    actions: {
	newSchool: function() {
	    this.transitionToRoute('schools.new');
	}
    }
});

App.SchoolsEditController = Ember.ObjectController.extend({
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

App.PicksBaseRoute = Ember.Route.extend({
    afterModel: function(picks, transition) {
	var self = this;
	if (picks.get('bets')) {
	    var mapped = picks.get('bets').map(function(bet) {
		bet.matchup = self.store.getById('matchup', bet.matchup);
		bet.user = self.store.getById('user', bet.user);
		bet.winner = self.store.getById('school', bet.winner);
		return App.Bet.create(bet);
	    });
	    picks.set('bets', mapped);
	}
    }
});

App.PicksViewCurrentRoute = App.PicksBaseRoute.extend({
    controllerName: 'picksView',
    templateName: 'picks.view',

    model: function() {
	return this.store.find('pick', 'current');
    },

    setupController: function(controller, model) {
	controller = this.controllerFor('picksView');
	controller.set('model', model);
    }
});

App.PicksViewRoute = App.PicksBaseRoute.extend({
    model: function(params) {
	return this.store.find('pick', params.week_id);
    }
});

App.PicksEditRoute = App.PicksViewRoute.extend({
    beforeModel: function() {
	var self = this;
	var promises = new Array;

	if (this.controllerFor('picksEdit').get('isAdmin')) {
	    var users = this.store.find('user');
	    users.then(function(users) {
		self.set('users', users);
	    });
	    promises.push(users);
	}

	return Ember.RSVP.all(promises);
    },

    setupController: function(controller, model) {
	controller.set('week', model);
	controller.set('users', this.get('users'));
	var bets = model.get('bets');

	if (model.get('editable')) {
	    bets = model.get('matchups').map(function(matchup) {
		var lastBets = model.get('bets').filter(function(bet) {
		    return bet.matchup === matchup;
		});

		var bet = App.Bet.create({ matchup: matchup, winner: null, points: 0 });

		if (lastBets.length > 0) {
		    bet.set('winner', lastBets[0].winner);
		    bet.set('points', lastBets[0].points);
		}

		return bet;
	    });
	}

	model.set('bets', bets);
	controller.set('model', bets);
    }
});

App.PicksEditCurrentRoute = App.PicksEditRoute.extend({
    controllerName: 'picksEdit',
    templateName: 'picks.edit',
    
    model: function() {
	return this.store.find('pick', 'current');
    }
});

App.PicksEditController = Ember.ArrayController.extend({
    needs: ['application'],
    isAdmin: Ember.computed.alias('controllers.application.isAdmin'),
    _userOverride: null,
    _showSaved: false,

    showSavedDialog: function(key, value, previous) {
	if (value) {
	    this._showSaved = value;
	} else {
	    return this._showSaved;
	}
    }.property(),
    
    totalPoints: function() {
	return this.get('model').reduce(function(prev, cur, idx, array) {
	    var points = cur.points;
	    return prev + (isNumber(points) ? parseInt(points, 10) : 0);
	}, 0);
    }.property('@each.points'),

    userOverride: function(key, value, previous) {
	if (value) {
	    this._userOverride = value;
	} else {
	    return this._userOverride;
	}
    }.property(),
    
    actions: {
	save: function() {
	    var model = this.get('week');
	    if (this._userOverride) {
		model.set('userOverride', this._userOverride);
	    }

	    var self = this;
	    self.set('showSavedDialog', true);
	    var p = model.save();
	    p.then(function(args) {
		self.set('showSavedDialog', true);

		Ember.run.later(function() {
		    self.set('showSavedDialog', false);
		}, 5000);
	    });
	}
    }
});

App.PicksViewController = Ember.ObjectController.extend({
    userBets: function() {
	var self = this;
	var users = this.get('users').toArray();
	var current = 'Keith'; 	// TODO

	users.sort(function(u1, u2) {
	    if (u1.get('name') === current) return -1;
	    if (u2.get('name') === current) return 1;
	    
	    var o1 = u1.get('order'),
	        o2 = u2.get('order');
	    if (o1 < o2) return -1;
	    if (o1 > o2) return 1;
	    return 0;
	});

	return users.map(function(user) {
	    var d = { name: user.get('name'), bets: self.orderedBets(user) };
	    return App.BetsForUser.create(d);
	});
    }.property('model.bets.@each'),

    orderedBets: function(user) {
	var bets = this.get('bets');
	var uname = user.get('name');
	return this.get('matchups').map(function(matchup) {
	    var f = bets.filter(function(bet) {
		return (bet.user === user && bet.matchup === matchup);
	    });

	    return f.length > 0 ? f.objectAt(0) : null;
	});
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

	controller.set('schools', this.get('schools'));
	controller.set('allUsers', this.get('users'));
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
	    var kickoff = '';
	    
	    if (this.get('startDate')) {
		var m = parseDate(this.get('startDate') + " 12:00 pm");
		m.day(6);
		kickoff = m.format('MM/DD/YYYY hh:mm a');
	    }

	    var newM = this.store.createRecord('matchup', { kickoff: kickoff });
	    var m = this.get('matchups');
	    m.pushObject(newM);
	},

	removeMatchup: function(arg) {
	    var m = this.get('matchups');
	    m.removeObject(arg);
	},

	save: function() {
	    var self = this;
	    var model = this.get('model');

	    // default the deadline to the first kickoff time
	    if (!model.get('deadline')) {
		var first = model.get('matchups').reduce(function(prev, cur, idx, array) {
		    var kickoff = parseDate(cur.get('kickoff'));
		    if (!prev) return kickoff;
		    return kickoff.isBefore(prev) ? kickoff : prev;
		});

		if (first) {
		    model.set('deadline', first.format('MM/DD/YYYY hh:mm a'));
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
	}
    }
});

App.MatchupEditor = Ember.View.extend({
    templateName: 'matchup-editor',
    tagName: 'tr',

    didInsertElement: function() {

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
