//App = Ember.Application.create();
App = Ember.Application.createWithMixins(Bootstrap.Register);

App.Router.map(function() {
  // put your routes here
});

App.IndexRoute = Ember.Route.extend({
  model: function() {
    return ['red', 'yellow', 'blue'];
  }
});
