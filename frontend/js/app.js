window.Bsc = Ember.Application.create();
Bsc.ApplicationAdapter = DS.FixtureAdapter.extend();

Bsc.Router.map(function() {
    this.resource('bsc', { path: '/' }, function() {
	this.resource('week', { path: '/week/:week_id' });
    });
});

Bsc.BscRoute = Ember.Route.extend({
    model: function() {
	// need to do this to force the fixture to load for some reason
	this.store.find('matchup');
	return this.store.find('week');
    }
});

Bsc.BscIndexRoute = Ember.Route.extend({
    model: function() {
	return Bsc.Week.FIXTURES[0];
    }
});

Bsc.WeekRoute = Ember.Route.extend({
    model: function(params) {
	//return this.store.find('matchup', { week: params.week_id });
	var weeks = Bsc.Week.FIXTURES.filter(function(week) {
	    return week.id == parseInt(params.week_id);
	});
	return weeks.length > 0 ? weeks[0] : null;
    },
});

Bsc.WeekController = Ember.ObjectController.extend({
    pointsAllocated: function() {
	var total = this.calculateTotal();
	return total.value;
    }.property('matchups.@each.points'),

    // TODO: implement a version of this at the matchup controller level too
    allocatedColor: function() {
	var total = this.calculateTotal();
	if (total.isValid && total.value == 100) return "background-color:rgba(0,255,0,0.2)";
	else if (!total.isValid) return "background-color:red";
	else return "background-color:white";
	return "background-color:" + (total.isValid ? "white" : "red");
    }.property('matchups.@each.points'),

    pointsValid: function() {
	var total = this.calculateTotal();
	return total.isValid;
    }.property('matchups.@each.points'),
    
    calculateTotal: function() {
	var valid = true;
	var matchups = this.get('matchups');
	var total = matchups.reduce(function(prev, current) {
	    if (!current.pointsValid()) {
		valid = false;
		return prev;
	    }

	    var val = parseInt(current.get('points'), 10);
	    if (val < 0) {
		val = 0;
		valid = false;
	    }
	    return prev + val;
	}, 0);

	if (total > 100 || total < 0)
	    valid = false;

	return { isValid: valid, value: total };
    },

    canEdit: function() {
	var now = Date.now();
	var cutoff = false;

	this.get('matchups').forEach(function(matchup) {
	    if (now >= matchup.get('kickoff')) {
		cutoff = true;
	    }
	});

	return !cutoff;
    }.property('matchups.@each.kickoff'),
});

Bsc.MatchupController = Ember.ObjectController.extend({
    needs: "week",
    
    winnerColors: function() {
	var winner = this.get('winner');
	if (winner == null) return "";

	// gross hack for now, I really hope this works when we use RESTAdapter...
	var c = Bsc.School.FIXTURES.filterBy('id', winner.id);
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
    kickoff: DS.attr('date'),
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

    // TODO: need to put a check in the controller if the points exceed
    // (100 - matchups.length)
    pointsValid: function() {
	var raw = this.get('points');
	if (isNaN(raw)) return false;
	if (raw == null || raw.length == 0) return false;
	if (parseInt(raw, 10) <= 0) return false;
	return true;
    },
});

Bsc.Week = DS.Model.extend({
    number: DS.attr('number'),
    year: DS.attr('year'),
    matchups: DS.hasMany('matchup'),
});

Bsc.Matchup.FIXTURES = [
    {
	id: '1',
	week: 13,
	kickoff: new Date(2013, 11, 23, 15, 30, 0),
	awayTeam: 'Michigan State University',
	homeTeam: 'Northwestern University',
	line: 7.5,
	winner: 'Michigan State University',
	points: '40',
    },
    {
	id: '2',
	week: 13,
	kickoff: new Date(2013, 11, 23, 12, 0, 0),
	awayTeam: 'University of Illinois',
	homeTeam: 'Purdue University',
	line: 6.5,
	winner: null,
	points: null,
    },
    {
	id: '3',
	week: 13,
	kickoff: new Date(2013, 11, 23, 20, 0, 0),
	awayTeam: 'University of Michigan',
	homeTeam: 'University of Iowa',
	line: -6.5,
	winner: 'University of Michigan',
	points: null,
    },
    {
	id: '4',
	week: 12,
	kickoff: new Date(2013, 11, 16, 12, 0, 0),
	awayTeam: 'Indiana University',
	homeTeam: 'University of Wisconsin',
	line: -20.5,
	winner: null,
	points: 25,
    },
    {
	id: '5',
	week: 12,
	kickoff: new Date(2013, 11, 16, 15, 30, 0),
	awayTeam: 'Ohio State University',
	homeTeam: 'University of Illinois',
	line: 32.5,
	winner: 'Ohio State University',
	points: null,
    },
];

Bsc.Week.FIXTURES = [
    {
	id: '1',
	number: 13,
	year: 2013,
	matchups: ['1', '2', '3'],
    },
    {
	id: '2',
	number: 12,
	year: 2013,
	matchups: ['4', '5'],
    }
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
	color2: '#7D110C',
	color1: '#E1D8B7',
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
	color2: 'rgba(102,102,102, 0.5)'
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
	color2: '#C41E3A',
	color1: '#FFFFFF',
    },
];
