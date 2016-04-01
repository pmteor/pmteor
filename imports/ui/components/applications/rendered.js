import './templates.html';

import { Template } from 'meteor/templating';
import { Applications } from '../../../api/applications/applications.js';
import { Charts } from '../../lib/charts.js';

Template.application.onRendered(function() {

  // if null application data then deny.
  if (_.isNull(this.data)) {
    return;
  }

  if (this.data.isOnline()) {
    const charts = new Charts();

    // OBSERVE
    this.cursor = Applications.find(this.data._id).observe({
      changed(doc) {

        // PUSH NEW MEMORY AND CPU
        charts.add(doc.monit);

        // RELOAD
        charts.reload();
      }
    });
  }
});

Template.application.onDestroyed(function() {
  // CURSOR OBSERVE SROP
  if (this.cursor) {
    this.cursor.stop();
  }
});

Template.updateApplicationModal.onCreated(function() {
  this.subscribe('application', this.data._id);
});
