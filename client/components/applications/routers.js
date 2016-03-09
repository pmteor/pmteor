Router.route('/applications/:_id', {
  name: 'Application',
  waitOn() {
    return Meteor.subscribe('application', this.params._id);
  },

  // Current data this application.
  data() {
    return Applications.findOne(this.params._id);
  }
});
