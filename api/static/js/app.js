App = Ember.Application.create();

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
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
	    var m = moment.tz(deserialized, 'MM/DD/YYYY hh:mm a', 'America/New_York');
	    var m2 = m.tz('UTC');
	    deserialized = m.tz('UTC').format();
	}

	return deserialized;
    }
});

DS.RESTAdapter.reopen({
    host: 'http://localhost:8080',
    namespace: 'api'
});

App.WeekAdapter = DS.RESTAdapter.extend({
    buildURL: function() {
	var url = this._super.apply(this, arguments);
	return url + "/bets";
    }
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
    active: DS.attr('boolean'),
    admin: DS.attr('boolean'),
    order: DS.attr('number')
});

App.Matchup = DS.Model.extend({
    homeTeam: DS.belongsTo('school'),
    awayTeam: DS.belongsTo('school'),
    line: DS.attr('number'),
    kickoff: DS.attr('mdate'),
    winner: DS.belongsTo('school'),
    homeScore: DS.attr('number'),
    awayScore: DS.attr('number')
});

App.Bet = DS.Model.extend({
    person: DS.attr('string'),
    matchup: DS.belongsTo('matchup'),
    winner: DS.belongsTo('school'),
    points: DS.attr('number'),

    teams: function() {
	var matchup = this.get('matchup');
	var a = matchup.get('awayTeam');
	return [matchup.get('awayTeam'), matchup.get('homeTeam')];
    }.property('matchup')
});

App.WeekBase = DS.Model.extend({
    users: DS.hasMany('user'),
    matchups: DS.hasMany('matchup'),
});

App.Week = App.WeekBase.extend({
    editable: DS.attr('boolean'),
    bets: DS.hasMany('bet')
});

App.WeekEdit = App.WeekBase.extend({
    startDate: DS.attr('mdate'),
    endDate: DS.attr('mdate'),
    season: DS.attr('number'),
    number: DS.attr('number'),
    deadline: DS.attr('mdate')
});

App.BetsForUser = Ember.Object.extend({
    user: null,
    bets: null,

    totalPoints: function() {
	return this.bets.reduce(function(prev, cur, idx, array) {
	    if (!cur) return prev;
	    
	    var pointsStr = cur.get('points');
	    var points = isNumber(pointsStr) ? parseInt(pointsStr, 10) : 0;
	    var matchup = cur.get('matchup');
	    
	    if (matchup.get('winner')) {
		var line = matchup.get('line');
		var covered = matchup.get('homeScore') + line;
		if (covered > matchup.get('awayScore')) {
		    return prev + points;
		}
	    }	    

	    return prev;
	}, 0);
    }.property('@each.points')
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
    this.route('picks.view', { path: 'picks/:week_id/view' });
    this.route('picks.edit', { path: 'picks/edit' });

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

App.PicksViewCurrentRoute = Ember.Route.extend({
    model: function() {
	var self = this;
	return Ember.$.getJSON('/api/weeks/current/bets').then(function(week) {
	    self.store.pushPayload('week', week);
	    self.transitionTo('picks.view', week.week.id);
	});
    }
});

App.PicksViewRoute = Ember.Route.extend({
    beforeModel: function() {
	var self = this;
	return this.store.find('school').then(function(schools) {
	    self.set('schools', schools);
	});
    },

    model: function(params) {
	return this.store.find('week', params.week_id);
    },

    setupController: function(controller, model) {
	controller.set('model', model);
	
	var schools = this.get('schools');
	controller.set('schools', schools);
    }
});

App.PicksEditRoute = App.PicksViewRoute.extend({
    model: function() {
	var self = this;
	return Ember.$.getJSON('/api/weeks/current/bets').then(function(week) {
	    self.store.pushPayload('week', week);
	    return self.store.find('week', week.week.id);
	});
    },
    
    setupController: function(controller, model) {
	controller.set('week', model);
	controller.set('model', model.get('bets'));
    }
});

App.PicksEditController = Ember.ArrayController.extend({
    totalPoints: function() {
	return this.get('model').reduce(function(prev, cur, idx, array) {
	    var points = cur.get('points');
	    return prev + (isNumber(points) ? parseInt(points, 10) : 0);
	}, 0);
    }.property('@each.points'),
    
    actions: {
	save: function() {
	    var model = this.get('model');
	    return model.save();
	}
    }
});

App.PicksViewController = Ember.ObjectController.extend({
    userBets: function() {
	var self = this;
	return this.get('users').map(function(user) {
	    var d = { name: user.get('name'), bets: self.orderedBets(user) };
	    return App.BetsForUser.create(d);
	});
    }.property('model.bets.@each'),

    orderedBets: function(user) {
	var bets = this.get('bets');
	var uname = user.get('name');
	return this.get('matchups').map(function(matchup) {
	    var f = bets.filter(function(bet) {
		return (bet.get('person') === uname && bet.get('matchup') === matchup);
	    });

	    return f.length > 0 ? f.objectAt(0) : null;
	});
    }
});

App.WeeksNewRoute = Ember.Route.extend({
    beforeModel: function() {
	var self = this;
	return this.store.find('school').then(function(schools) {
	    self.set('schools', schools);
	});
    },

    model: function() {
	var w = this.store.createRecord('weekEdit');
	w.set('season', moment().year());
	return w;
    },

    setupController: function(controller, model) {
	controller = this.controllerFor('weeksEdit');
	controller.set('model', model);
	
	var schools = this.get('schools');
	controller.set('schools', schools);
    },

    renderTemplate: function() {
	this.render('weeks._form', { controller: 'weeksEdit' });
    }
});

App.WeeksEditRoute = App.WeeksNewRoute.extend({
    model: function(params) {
	return this.store.find('weekEdit', params.week_id);
    },
    
    renderTemplate: function() {
	this.render('weeks._form', { controller: 'weeksEdit' });
    }
});

App.WeeksEditController = Ember.ObjectController.extend({
    actions: {
	newMatchup: function() {
	    var newM = this.store.createRecord('matchup');
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
	return this.store.find('weekEdit');
    }
});

App.WeeksIndexController = Ember.ArrayController.extend({
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
    sortProperties: ['order'],
    sortAscending: true,

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
