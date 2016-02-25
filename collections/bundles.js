Bundles = new FS.Collection("bundles", {
  stores: [
    new FS.Store.FileSystem("bundles", {
      path: Meteor.isServer ? process.env.BUNDLE_DIR : null,

      // New Name file _id.
      fileKeyMaker(fileObj) {
        return `${fileObj._id}.tar.gz`;
      }
    })
  ],
  filter: {
    allow: {
      contentTypes: ['application/x-gzip'],
      extensions: ['gz']
    }
  }
});

isServer(() => {
  Bundles.on('stored', Meteor.bindEnvironment((file, storeName) => {

    // CD BUNDLES DIR
    shell.cd(`${process.env.BUNDLE_DIR}`);

    // REMOVE OLD APPLICATION
    shell.rm('-rf', file._id);

    // CREATE NEW APPLICATION DIR
    shell.mkdir(file._id);

    // EXTRACT
    shell.exec(`tar -xvzf ${file._id}.tar.gz -C ${file._id} --strip 1`, SYNC_EXEC_OPTIONS);

    // CD SERVER PACKAGES
    shell.cd(`${file._id}/programs/server`);

    // NPM CORE PACKAGES INSTALL
    const npm = shell.exec('npm install', ASYNC_EXEC_OPTIONS);

    npm.stdout.on('end', Meteor.bindEnvironment(() => {
      const application = Applications.findOne({
        bundleId: file._id
      });

      // FIX BCRYPT
      if (shell.test('-e', 'npm/npm-bcrypt')) {
        shell.exec('npm install bcrypt', SYNC_EXEC_OPTIONS);
        shell.rm('-rf', 'npm/npm-bcrypt');
      }

      // FIX BSON
      if (shell.test('-e', 'npm/cfs_gridfs')) {
        shell.cd('npm/cfs_gridfs/node_modules/mongodb/node_modules/bson');
        shell.exec('make', SYNC_EXEC_OPTIONS);
      }

     /*
      * IMPORTANT!!!!
      * After installation is completed it will be updated before
      * the start if the application fix begin.
      */
      application.setStatus(3);
    }));
  }));
});
