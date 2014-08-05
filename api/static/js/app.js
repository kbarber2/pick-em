App = Ember.Application.create();

DS.RESTAdapter.reopen({
    host: 'http://localhost:8080',
    namespace: 'api',
});

App.School = DS.Model.extend({
    name: DS.attr('string'),
    fullName: DS.attr('string'),
    abbreviation: DS.attr('string'),
    mascot: DS.attr('string'),
    primaryColor: DS.attr('string'),
    secondaryColor: DS.attr('string'),
});

App.Matchup = DS.Model.extend({
    homeTeam: DS.belongsTo('school'),
    awayTeam: DS.belongsTo('school'),
    line: DS.attr('number'),
    kickoff: DS.attr('date'),
});

App.Router.map(function() {
    this.resource('schools', function() {
	this.route('edit', { path: '/:school_id/edit' });
    });
    this.resource('matchups', function() {
	this.route('new', { path: 'new' });
    });
});

App.SchoolsEditController = Ember.ObjectController.extend({
    save: function() {
	var name = this.get('name');
	var dirty = this.get('model').serialize();
	var store = this.get('store');
	this.get('model').save();
    },
});

App.SchoolsRoute = Ember.Route.extend({
    model: function() {
	return this.store.findAll('school');
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
    },
});

App.MatchupsNewRoute = Ember.Route.extend({
    model: function() {
	return this.store.createRecord('matchup');
    },

    setupController: function(controller, model) {
	controller.set('model', model);
	this.store.find('school').then(function(schools) {
	    controller.set('schools', schools);
	});
    },

    renderTemplate: function() {
	this.render('matchups.edit', { controller: 'matchupsNew' });
    },
});

App.MatchupsNewController = Ember.ObjectController.extend({
    content: {},

    actions: {
	save: function() {
	    this.get('model').save();
	    this.transitionToRoute('matchups');
	},
    },
});

