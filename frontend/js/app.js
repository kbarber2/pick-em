window.App = Ember.Application.create();


App.BscController = Em.Controller.extend({
    things: [
	Em.Object.create({ name: 'Keith', game1: 'a', game2: 'b', game3: 'c' }), 
	Em.Object.create({ name: 'Aaron', game1: 1, game2: 2, game3: 3 }),
	Em.Object.create({ name: 'Frank', game1: 'a1', game2: 'b1', game3: 'c1' }),
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

  thingsWithFields: function() {
      var fieldNames = this.get('fieldNames');

    var thingWithFieldsProxy = Em.ObjectProxy.extend({
      fields: function() {
        var thing = this;

        return names.map(function(fn) {
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
            source+='<td>{{input type="text" valueBinding="content.'+fieldName+'"}}</td>';
        });
        var template = Em.Handlebars.compile(source);
        return template.call(this,context,data);
    }

});

App.TabularForm  = Em.View.extend({
  templateName: "keith",
});
