window.App = Ember.Application.create();

App.BscController = Em.Controller.extend({
    things: [
    Em.Object.create({ foo: 'a', bar: 'b' }), 
    Em.Object.create({ foo: 1, bar: 2 })
  ],
  fieldNames: ['foo', 'bar'],

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
            source+='<td>{{input type="text" valueBinding="content.'+fieldName+'"}}</td>';
        });
        var template = Em.Handlebars.compile(source);
        return template.call(this,context,data);
    }

});

App.TabularForm  = Em.View.extend({
  templateName: "keith",
});
