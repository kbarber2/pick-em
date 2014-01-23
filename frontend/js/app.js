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
    itemController: 'matchup',
    
    pointsAllocated: function() {
	return this.reduce(function(prev, current) {
	    if (prev == undefined) { prev = 0; }
	    var val = parseInt(current.get("points")) || 0;
	    return prev + val;
	});
    }.property('@each.points')
});

Bsc.MatchupController = Ember.ObjectController.extend({
    winnerColors: function() {
	var winner = this.get('winner');
	if (winner == null) return "";

	// gross hack for now, I really hope this works when we use RESTAdapter...
	var c = Bsc.School.FIXTURES.filter(function(school) {
	    return school.id == winner.id;
	});
	winner = c[0];
	
	return 'color:' + winner.color1 + ';background-color:' + winner.color2;
    }.property('winner'),
});

Bsc.School = DS.Model.extend({
    name: DS.attr('string'),
    abbrev: DS.attr('string'),
    mascot: DS.attr('string'),
    color1: DS.attr('string'),
    color2: DS.attr('string'),
});

Bsc.Matchup = DS.Model.extend({
    week: DS.attr('number'),
    date: DS.attr('date'),
    awayTeam: DS.belongsTo('school'),
    homeTeam: DS.belongsTo('school'),
    line: DS.attr('number'),
    points: DS.attr('number', { defaultValue: 0 }),
    winner: DS.belongsTo('school'),

    teams: function() {
	return [this.get('awayTeam'), this.get('homeTeam')];
    }.property('awayTeam', 'homeTeam'),

    homeIsFavored: function() {
	return this.get('line') < 0;
    }.property('line'),
});

Bsc.Matchup.FIXTURES = [
    {
	id: '1',
	week: 13,
	date: new Date('2013-11-23'),
	awayTeam: 'Michigan State University',
	homeTeam: 'Northwestern University',
	line: 7.5,
	winner: 'Michigan State University',
	points: '40',
    },
    {
	id: '2',
	week: 13,
	date: new Date('2013-11-23'),
	awayTeam: 'University of Illinois',
	homeTeam: 'Purdue University',
	line: 6.5,
	winner: null,
	points: null,
    },
    {
	id: '3',
	week: 13,
	date: new Date('2013-11-23'),
	awayTeam: 'University of Michigan',
	homeTeam: 'University of Iowa',
	line: -6.5,
	winner: 'University of Michigan',
	points: null,
    },
];

Bsc.School.FIXTURES = [
    {
	id: 'University of Illinois',
	name: 'Illinois',
	abbrev: 'UI',
	mascot: 'Illini',
	color1: '#003C7D',
	color2: '#F47F24',
    },
    {
	id: 'Indiana University',
	name: 'Indiana',
	abbrev: 'IU',
	mascot: 'Hoosiers',
	color1: '#7D110C',
	color2: '#E1D8B7',
    },
    {
	id: 'University of Iowa',
	name: 'Iowa',
	abbrev: 'Iowa',
	mascot: 'Hawkeyes',
	color1: '#FFE100',
	color2: '#000000'
    },
    {
	id: 'University of Michigan',
	name: 'Michigan',
	abbrev: 'UMich',
	mascot: 'Wolverines',
	color1: '#ffcb05',
	color2: '#00274c',
    },
    {
	id: 'Michigan State University',
	name: 'Michigan State',
	abbrev: 'MSU',
	mascot: 'Spartans',
	color2: '#18453B',
	color1: '#FFFFFF',
    },
    {
	id: 'University of Minnesota',
	name: 'Minnesota',
	abbrev: 'UMinn',
	mascot: 'Golden Gopher',
	color1: '#8C1919',
	color2: '#CCFF33'
    },
    {
	id: 'University of Nebraska',
	name: 'Nebraska',
	abbrev: 'NEB',
	mascot: 'Cornhuskers',
	color1: '#CC0000',
	color2: '#F5F3EB',
    },
    {
	id: 'Northwestern University',
	name: 'Northwestern',
	abbrev: 'NW',
	mascot: 'Wildcats',
	color2: '#520063',
	color1: '#FFFFFF',
    },
    {
	id: 'Ohio State University',
	name: 'Ohio State',
	abbrev: 'OSU',
	mascot: 'Buckeyes',
	color1: '#BB0000',
	color2: '#666666',
    },
    {
	id: 'Pennsylvania State University',
	name: 'Penn State',
	abbrev: 'PSU',
	mascot: 'Nittany Lions',
	color1: '#003893',
	color2: '#FFFFFF',
    },
    {
	id: 'Purdue University',
	name: 'Purdue',
	abbrev: 'Purdue',
	mascot: 'Boilermakers',
	color1: '#BF910C',
	color2: '#000000',
    },
    {
	id: 'University of Wisconsin',
	name: 'Wisconsin',
	abbrev: 'WI',
	mascot: 'Badgers',
	color1: '#C41E3A',
	color2: '#FFFFFF',
    },
];
