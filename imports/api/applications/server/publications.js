import { Meteor } from 'meteor/meteor';

// COLLECTIONS
import Users from '../../users/users.js';
import { Applications } from '../applications.js';
import { Bundles } from '../../bundles/bundles.js';
import { Notifications } from '../../notifications/notifications.js';
import { Logs } from '../../logs/logs.js';

Meteor.publishComposite('applications', function() {
  return {
    find() {
      return Applications.find({ memberIds: this.userId }, {
        sort: {
          createdAt: -1
        }
      });
    },

    children: [

      // ALL LOGS APPLICATION
      {
        find(application) {
          return Logs.find({ 'process.name': application.bundleId }, {
            sort: {
              createdAt: -1
            }
          });
        }
      },

      // NOTIFICATIONS
      {
        find(application) {
          return Notifications.find({
            applicationId: application._id,
            createdAt: {
               $gt: new Date() // Publish current Date after .
             }
          });
        }
      }
    ]
  }
});

Meteor.publishComposite('application', function(_id) {
  check(_id, String);

  return {
    find() {
      return Applications.find({ _id, memberIds: this.userId });
    },

    children: [

      // ALL LOGS APPLICATION
      {
        find(application) {
          return Logs.find({ 'process.name': application.bundleId }, {
            sort: {
              createdAt: -1
            }
          });
        }
      },

      // MEMBERS APPLICATION
      {
        find(application) {
          return Users.find({
            _id: {
              $in: application.memberIds
            }
          }, {
            fields: {
              services: 0
            }
          });
        }
      },

      // Notifications
      {
        find(application) {
          return Notifications.find({
            applicationId: application._id,
            createdAt: {
               $gt: new Date() // Publish current Date after .
            }
          });
        }
      },

      // BUNDLES
      {
        find(application) {
          return Bundles.find({ _id: application.bundleId });
        }
      }
    ]
  }
});
