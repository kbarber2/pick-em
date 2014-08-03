window.App = Ember.Application.create();
var attr = DS.attr;

App.PlayerBet = Em.Object.extend({
    bets: null,

    total: function() {
	var sum = 0;
	this.bets.forEach(function(elem) {
	    sum += Number(elem.score);
	});
	return sum;
    }.property('bets.@each.score'),
});

App.Router.map(function() {
    this.resource('bsc', { path: '/'} );
});

App.BscRoute = Ember.Route.extend({
    model: function() {
	return { schools: staticSchools,
		 
		 bets: [{ name: 'Keith',
			  bets: [{ game: 'game1', score: 10, winner: 'MSU' },
				 { game: 'game2', score: 20, winner: 'PSU' },
				 { game: 'game3', score: 30, winner: 'UMich' }]
			},
			{ name: 'Aaron',
			  bets: [{ game: 'game1', score: 30, winner: 'MSU' },
				 { game: 'game2', score: 20, winner: 'Illinois' },
				 { game: 'game3', score: 10, winner: 'Iowa' }]
			},
			{ name: 'Frank',
			  bets: [{ game: 'game1', score: 5, winner: 'NW' },
				 { game: 'game2', score: 15, winner: 'PSU' },
				 { game: 'game3', score: 25, winner: 'Iowa' }]
			}],
		 
		 matchups: [
		     Em.Object.create({ id: 'game1', line: 7.5, homeTeam: 'NW', awayTeam: 'MSU'}),
		     Em.Object.create({ id: 'game2', line: 3.5, homeTeam: 'PSU', awayTeam: 'Illinois'}),
		     Em.Object.create({ id: 'game3', line: -4.5, homeTeam: 'Iowa', awayTeam: 'UMich'}),
		 ]
	       };
    },

    setupController: function(controller, model) {
	controller.set('schools', model.schools);
	controller.set('matchups', model.matchups);
	controller.set('bets', model.bets.map(function(bet) {
	    return App.PlayerBet.create(bet);
	}));
    }
});

/*
App.ApplicationAdapter = DS.RESTAdapter.extend({
    host: 'http://localhost:8080'
});

App.BetSetSerializer = DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
  attrs: {
    bets: {embedded: 'always'},
  }
});
*/

App.School = DS.Model.extend({
    name: attr('string')
});

App.BetSet = DS.Model.extend({
    name: attr('string'),
    bets: DS.hasMany('bet', {embedded: 'load'}),
});

App.Bet = DS.Model.extend({
    matchup: DS.belongsTo('matchup'),
    score: attr('number'),
    winner: DS.belongsTo('school'),
});

App.Matchup = DS.Model.extend({
    line: attr('number'),
    awayTeam: DS.belongsTo('school'),
    homeTeam: DS.belongsTo('school', {async:true}),
});

App.BscController = Ember.ArrayController.extend({
    printNames: function() {
	return this.matchups.map(function(t) {
	    return t.name;
	});
    }.property(),

    userBets: function() {
	return this.get('bets').map(function(t) {
	    return Em.ObjectProxy.create({ content: t });
	});
    }.property('bets.[]', 'fields.[]'),

    getSchool: function(id) {
	var foundSchool = null;
	this.get('schools').forEach(function(school) {
	    if (school.abbreviation == id) {
		foundSchool = school;
	    }
	});
	return foundSchool;
    }
});

App.DynamicInputView = Em.View.extend( {
    template: function(context, data) {
        var controller = data.data.keywords.controller;

        var source="";
        controller.get('matchups').forEach(function(matchup){
	    var fieldName = matchup.id;
	    var idx = 0;
	    for (i = 0; i < context.content.bets.length; i++) {
		if (context.content.bets[i].game == fieldName) {
		    idx = i;
		    break;
		}
	    }

	    var matchupSchools = matchup.id + 'Schools';
	    var schools = [controller.getSchool(matchup.awayTeam),
			   controller.getSchool(matchup.homeTeam)];
	    controller.set(matchupSchools, schools);

            source+='<td>{{view Ember.Select content=controller.' + matchupSchools + ' optionValuePath="content.abbreviation" optionLabelPath="content.abbreviation" value=content.bets.' + idx + '.winner}}&nbsp;{{input type="text" valueBinding="content.bets.'+idx+'.score"}}</td>';
	    i++;
        });

	source += '<td>{{content.total}}</td>';
	source += '<td>{{content.bets.0.winner}}</td>';
        var template = Em.Handlebars.compile(source);
        return template.call(this,context,data);
    }

});

App.TabularForm  = Em.View.extend({
    templateName: "keith",
});
