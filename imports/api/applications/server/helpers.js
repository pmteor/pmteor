import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';

import Users from '../../users/users.js';
import { Applications } from '../applications.js';
import { BUNDLE_DIR, SYNC_EXEC_OPTIONS } from '../../bundles/utils.js';

// NPM PACKAGES
import pm2 from 'pm2';
import freeport from 'freeport';
import { cd, find, rm, exec, test } from 'shelljs';

Applications.helpers({
  dir() {
    return `${BUNDLE_DIR}/${this.bundleId}`;
  },

  options(PORT) {
    return {
      name: this.bundleId,
      script: 'main.js',
      cwd: this.dir(),
      autorestart: false,
      watch: true,
      env: _.extend({ PORT}, this.env)
    }
  },

  start() {
    const self = this;

   /*
    * Listening port and connect production process manager. if connected
    * process manager and started application then change application status
    * to running.
    */
    freeport(Meteor.bindEnvironment((freeport_err, port) => {

      // CONNECT
      pm2.connect(Meteor.bindEnvironment((connect_error) => {

        // START
        pm2.start(self.options(port), Meteor.bindEnvironment((start_error) => {

          // LIST
          pm2.list(Meteor.bindEnvironment((start_error, procs) => {
            const application = _.findWhere(procs, {
              name: self.bundleId
            });

            if (application) {
              const { name, monit } = application;
              const { pm_uptime, restart_time } = application.pm2_env;

              Applications.update({ bundleId: name }, {
                $set: {
                  monit: {

                    // UPTIME AND RESTART TIME
                    pm_uptime,
                    restart_time,

                    // MONIT OBJECT INJECT
                    ...monit
                  }
                }
              });
            }

            self.notification({
              type: 'success',
              message: TAPi18n.__('started-application', self.name)
            });

            // DISCONNECT
            pm2.disconnect();
          }));
        }));
      }));
    }));
  },

  stop() {
    const self = this;
    pm2.connect(Meteor.bindEnvironment(() => {
      pm2.stop(self.bundleId, Meteor.bindEnvironment(() => {

        self.notification({
          type: 'success',
          message: TAPi18n.__('stopped-application', self.name)
        });

        // DISCONNECT
        pm2.disconnect();
      }))
    }));
  },

  // ##### --------- REBUILDING FIBERS -------------- #######
  build() {

    this.notification({
      type: 'info',
      message: TAPi18n.__('build-started', this.name)
    });

    // async sleep statements
    Meteor.sleep(1000);

    cd(`${this.dir()}/programs/server`);

    // GO NPM PACKAGES
    cd('npm');

    // BINARY NPM MODULES
    const bindingFiles = find('.').filter((file) => {
      return file.match(/\.gyp$/);
    });

    bindingFiles.forEach((file) => {
      const dir = file.replace('/binding.gyp', '');

      // GO TO BINDING FILE DIR
      cd(dir);

      // REMOVE BEFORE MODULES
      rm('-rf', 'node_modules');

      // INSTALL MODULES
      exec('npm install', SYNC_EXEC_OPTIONS);

      // AND REBUILD BINDINGS PACKAGES.
      exec('node-gyp rebuild', SYNC_EXEC_OPTIONS);

      // PREV DIR
      cd('-');
    });

    // PROGRAMS SERVER DIR
    cd('..');

    // support for 0.9
    if (test('-e', 'package.json')) {

      exec('npm install', SYNC_EXEC_OPTIONS);
    } else {

      // support for older versions
      exec('npm install fibers bcrypt', SYNC_EXEC_OPTIONS);
    }

    this.notification({
      type: 'success',
      message: TAPi18n.__('build-completed', this.name)
    });
  },

  sendEmailMembers(template, data) {
    const members = Users.find({
      _id: {
        $in: this.memberIds
      }
    });

    // USERS EACH
    members.forEach((user) => {

      // MAIL URL PARSE AND EXISTS MAIL URL
      Dev.hasEnv('MAIL_URL', (MAIL_URL) => {
        const { emails } = user;
        const { email } = Dev.parseMailUrl(MAIL_URL);

        // SEND EMAIL
        Email.send({
          from: email,
          to: _.first(emails).address,
          subject: `Pmteor - ${this.name}`,
          html: SSR.render(template, data)
        });
      });
    });
  }
});
