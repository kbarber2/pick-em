App = Ember.Application.create();

DS.RESTAdapter.reopen({
    host: 'http://localhost:8080',
    namespace: 'api'
});

App.BetAdapter = DS.RESTAdapter.extend({
    buildURL: function() {
	var url = this._super.apply(this, arguments);
//	debugger;
	return url;
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

App.Matchup = DS.Model.extend({
    homeTeam: DS.belongsTo('school'),
    awayTeam: DS.belongsTo('school'),
    line: DS.attr('number'),
    kickoff: DS.attr('date')
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

App.Router.map(function() {
    this.resource('schools', function() {
	this.route('edit', { path: ':school_id/edit' });
    });
    this.resource('matchups', function() {
	this.route('new', { path: 'new' });
	this.route('edit', { path: ':matchup_id/edit' });
    });

    this.resource('bsc', { path: 'bsc' }, function() {
	this.route('submit', { path: 'submit' });
    });
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

App.BscSubmitController = Ember.Controller.extend({
    actions: {
	save: function() {
	    var model = this.get('model');
	    return model.save();
	}
    }
});

App.BscSubmitRoute = Ember.Route.extend({
    beforeModel: function() {
	var self = this;
	return this.store.find('school').then(function(schools) {
	    self.set('schools', schools);
	});
    },

    model: function() {
	// ??? do the matchups have to be returned with the bets?
	// why does it resolve from handlebars but not in JS?
	return this.store.find('bet');
    },

    setupController: function(controller, model) {
	controller.set('model', model);
	
	var schools = this.get('schools');
	controller.set('schools', schools);
    }
});
