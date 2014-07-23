window.App = Ember.Application.create();

App.ApplicationAdapter = DS.RESTAdapter.extend();

App.TestObject = Em.Object.extend({
    games: null,

    total: function() {
	var sum = '';
	this.games.forEach(function(elem) {
	    sum += elem.score;
	});
	return sum;
    }.property('games.@each.score'),
});

App.BscController = Em.Controller.extend({
    things: [
	App.TestObject.create({ name: 'Keith',
				games: [{ name: 'game1', score: 'a', winner: 'MSU' },
					{ name: 'game2', score: 'b', winner: 'PU' },
					{ name: 'game3', score: 'c', winner: 'Mich' }]
			      }), 
	App.TestObject.create({ name: 'Aaron',
				games: [{ name: 'game1', score: 1, winner: 'MSU' },
					{ name: 'game2', score: 2, winner: 'UI' },
					{ name: 'game3', score: 3, winner: 'Iowa' }]
			      }),
	App.TestObject.create({ name: 'Frank',
				games: [{ name: 'game1', score: 'a1', winner: 'NU' },
					{ name: 'game2', score: 'b2', winner: 'PU' },
					{ name: 'game3', score: 'c3', winner: 'Iowa' }]
			      }),
    ],

    matchups: [
	Em.Object.create({ id: 'game1', name: 'MSU vs. NU' }),
	Em.Object.create({ id: 'game2', name: 'UI vs. PU'}),
	Em.Object.create({ id: 'game3', name: 'Mich vs. Iowa'}),
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
	    for (i = 0; i < context.content.games.length; i++) {
		if (context.content.games[i].name == fieldName) {
		    idx = i;
		    break;
		}
	    }

            source+='<td>{{view Ember.Select content=controller.schools value=content.games.' + idx + '.winner}}&nbsp;{{input type="text" valueBinding="content.games.'+idx+'.score"}}</td>';
	    i++;
        });

	source += '<td>{{content.total}}</td>';
	source += '<td>{{content.games.0.winner}}</td>';
        var template = Em.Handlebars.compile(source);
        return template.call(this,context,data);
    }

});

App.TabularForm  = Em.View.extend({
    templateName: "keith",
});
