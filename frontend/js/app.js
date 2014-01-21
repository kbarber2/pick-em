//App = Ember.Application.create();
window.Bsc = Ember.Application.createWithMixins(Bootstrap.Register);
Bsc.ApplicationAdapter = DS.FixtureAdapter.extend();

Bsc.Router.map(function() {
    this.resource('bsc', { path: '/' });
});

Bsc.BscRoute = Ember.Route.extend({
    model: function() {
	return this.store.find('matchup');
    }
});

Bsc.BscController = Ember.ArrayController.extend({
    pointsAllocated: function() {
	return this.reduce(function(prev, current) {
	    if (prev == undefined) { prev = 0; }
	    var val = parseInt(current.get("points")) || 0;
	    return prev + val;
	});
    }.property('@each.points')
});

Bsc.Matchup = DS.Model.extend({
    awayTeam: DS.attr('string'),
    homeTeam: DS.attr('string'),
    line: DS.attr('number'),
    points: DS.attr('number', { defaultValue: 0 }),

    teams: function() {
	return [this.get('awayTeam'), this.get('homeTeam')];
    }.property('awayTeam', 'homeTeam'),

    homeIsFavored: function() {
	return this.get('line') < 0;
    }.property('line'),
});

Bsc.Matchup.FIXTURES = [
    {
	id: 1,
	awayTeam: 'MSU',
	homeTeam: 'NW',
	line: 7.5
    },
    {
	id: 2,
	awayTeam: 'Illinois',
	homeTeam: 'Purdue',
	line: 6.5
    },
    {
	id: 3,
	awayTeam: 'Michigan',
	homeTeam: 'Iowa',
	line: -6.5
    },
];
