window.App = Ember.Application.create();
var attr = DS.attr;

App.PlayerBet = Em.Object.extend({
    bets: null,

    total: function() {
	var sum = 0;
	this.bets.forEach(function(elem) {
	    sum += elem.score;
	});
	return sum;
    }.property('bets.@each.score'),
});

App.BscController = Ember.ArrayController.extend({
    things: [
	App.PlayerBet.create({ name: 'Keith',
			       bets: [{ name: 'game1', score: 10, winner: 'MSU' },
				       { name: 'game2', score: 20, winner: 'PU' },
				       { name: 'game3', score: 30, winner: 'Mich' }]
			      }), 
	App.PlayerBet.create({ name: 'Aaron',
			       bets: [{ name: 'game1', score: 30, winner: 'MSU' },
				       { name: 'game2', score: 20, winner: 'UI' },
				       { name: 'game3', score: 10, winner: 'Iowa' }]
			     }),
	App.PlayerBet.create({ name: 'Frank',
			       bets: [{ name: 'game1', score: 5, winner: 'NU' },
				       { name: 'game2', score: 15, winner: 'PU' },
				       { name: 'game3', score: 25, winner: 'Iowa' }]
			     }),
    ],

    matchups: [
	Em.Object.create({ id: 'game1', name: 'MSU vs. NU', line: 7.5 }),
	Em.Object.create({ id: 'game2', name: 'UI vs. PU', line: 3.5}),
	Em.Object.create({ id: 'game3', name: 'Mich vs. Iowa', line: -4.5}),
    ],

    printNames: function() {
	return this.matchups.map(function(t) {
	    return t.name;
	});
    }.property(),

    fieldNames: function() {
	return ['game1', 'game2', 'game3'];
    }.property(),

    schools: function() {
	return [ 'MSU', 'Mich', 'PU', 'UI', 'Iowa', 'NU' ];
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
        fieldNames.forEach(function(fieldName){
	    var idx = 0;
	    for (i = 0; i < context.content.bets.length; i++) {
		if (context.content.bets[i].name == fieldName) {
		    idx = i;
		    break;
		}
	    }

            source+='<td>{{view Ember.Select content=controller.schools value=content.bets.' + idx + '.winner}}&nbsp;{{input type="text" valueBinding="content.bets.'+idx+'.score"}}</td>';
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
