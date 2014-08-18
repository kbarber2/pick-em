App = Ember.Application.create();

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

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

App.EpochTransform = DS.Transform.extend({
  deserialize: function(serialized) {
      debugger;
      var d = new Date(0);
      d.setUTCSeconds(serialized);
      return d;
  },

  serialize: function(deserialized) {
      debugger;
      var t = this.deserialize(deserialized)
      var time = deserialized.getTime();
      return time / 1000;
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
    name: DS.attr('string')
});

App.Matchup = DS.Model.extend({
    homeTeam: DS.belongsTo('school'),
    awayTeam: DS.belongsTo('school'),
    line: DS.attr('number'),
    kickoff: DS.attr('date'),
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

App.Week = DS.Model.extend({
    editable: DS.attr('boolean'),
    users: DS.hasMany('user'),
    matchups: DS.hasMany('matchup'),
    bets: DS.hasMany('bet')
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
	this.route('edit', { path: ':school_id/edit' });
    });
    this.resource('matchups', function() {
	this.route('new', { path: 'new' });
	this.route('edit', { path: ':matchup_id/edit' });
    });

    this.route('picks.viewCurrent', { path: 'picks/view' });
    this.route('picks.view', { path: 'picks/:week_id/view' });
    this.route('picks.edit', { path: 'picks/edit' });
});

App.SchoolsEditController = Ember.ObjectController.extend({
    save: function() {
	var name = this.get('name');
	var dirty = this.get('model').serialize();
	var store = this.get('store');
	this.get('model').save();
    }
});

App.SchoolsRoute = Ember.Route.extend({
    model: function() {
	return this.store.find('school');
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
	    var p = self.store.pushPayload('week', week);
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
