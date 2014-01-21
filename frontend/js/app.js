//App = Ember.Application.create();
window.Bsc = Ember.Application.createWithMixins(Bootstrap.Register);
Bsc.ApplicationAdapter = DS.FixtureAdapter.extend();

Bsc.Router.map(function() {
    this.resource('bsc', { path: '/' });
});

Bsc.BscRoute = Ember.Route.extend({
    model: function() {
	var records = this.store.find('matchup');
	console.log(records);
	return records;
    }
});

Bsc.Matchup = DS.Model.extend({
    awayTeam: DS.attr('string'),
    homeTeam: DS.attr('string'),
    line: DS.attr('number'),

    teams: function() {
	return [this.get('awayTeam'), this.get('homeTeam')];
    }.property('awayTeam', 'homeTeam')
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
