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

App.BscController = Ember.ArrayController.extend({
    init: function() {
	var mapped = staticSchools.map(function(school) {
	    return school.abbreviation;
	});
	this.set('schools', mapped);
    },

    things: [
	App.PlayerBet.create({ name: 'Keith',
			       bets: [{ game: 'game1', score: 10, winner: 'MSU' },
				      { game: 'game2', score: 20, winner: 'PSU' },
				      { game: 'game3', score: 30, winner: 'UMich' }]
			      }), 
	App.PlayerBet.create({ name: 'Aaron',
			       bets: [{ game: 'game1', score: 30, winner: 'MSU' },
				      { game: 'game2', score: 20, winner: 'Illinois' },
				      { game: 'game3', score: 10, winner: 'Iowa' }]
			     }),
	App.PlayerBet.create({ name: 'Frank',
			       bets: [{ game: 'game1', score: 5, winner: 'NW' },
				      { game: 'game2', score: 15, winner: 'PSU' },
				      { game: 'game3', score: 25, winner: 'Iowa' }]
			     }),
    ],

    matchups: [
	Em.Object.create({ id: 'game1', line: 7.5, home_team: 'NW', away_team: 'MSU'}),
	Em.Object.create({ id: 'game2', line: 3.5, home_team: 'PSU', away_team: 'Illinois'}),
	Em.Object.create({ id: 'game3', line: -4.5, home_team: 'Iowa', away_team: 'UMich'}),
    ],

    printNames: function() {
	return this.matchups.map(function(t) {
	    return t.name;
	});
    }.property(),

    fieldNames: function() {
	return ['game1', 'game2', 'game3'];
    }.property(),
    
    thingsWithFields: function() {
	var fieldNames = this.get('fieldNames');

	var thingWithFieldsProxy = Em.ObjectProxy.extend({
	    fields: function() {
		var thing = this;

		return fieldNames.map(function(fn) {
		    // FIX: this returns a raw value which is not bindable in a template
		    return thing.get(fn);
		});
	    }.property()
	});

	return this.get('things').map(function(t) {
	    var thingWithFieldProxy =  thingWithFieldsProxy.create({ content: t });
            return thingWithFieldProxy;
	});
    }.property('things.[]', 'fields.[]')
});

App.DynamicInputView = Em.View.extend({
    template:function(context,data){
        var controller = data.data.keywords.controller;
        var fieldNames = controller.get("fieldNames");

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
	    var schools = [matchup.away_team, matchup.home_team];
	    controller.set(matchupSchools, schools);

            source+='<td>{{view Ember.Select content=controller.' + matchupSchools + ' value=content.bets.' + idx + '.winner}}&nbsp;{{input type="text" valueBinding="content.bets.'+idx+'.score"}}</td>';
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
