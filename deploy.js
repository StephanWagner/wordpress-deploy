#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const boxen = require('boxen');
const colors = require('colors/safe');
const cliProgress = require('cli-progress');
const Client = require('ftp');
const minimatch = require('minimatch');
const path = require('path');
const fs = require('fs');

// Log an error message
function error(message, description) {
  console.log(
    boxen(
      colors.brightRed.bold('Error: ') +
        colors.brightRed(message) +
        (description ? '\n' + colors.white(description) : ''),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'red'
      }
    )
  );
}

// Arguments
const argv = yargs(hideBin(process.argv)).argv;

// Get config
const configFilename = path.resolve(
  argv.configFile || './wordpress-deploy.config.js'
);
let config;

if (fs.existsSync(configFilename)) {
  config = require(configFilename);
} else {
  error(
    'Config file not found',
    'Filename: ' +
      configFilename +
      '\nExample: ' +
      'https://github.com/StephanWagner/wordpress-deploy/blob/main/wordpress-deploy.config.js'
  );
  return;
}

// Default values
config.host = argv.host || config.host || 'localhost';
config.port = argv.port || config.port || 21;
config.user = argv.user || config.user || 'anonymous';
config.password = argv.password || config.password || 'secret';
config.theme = argv.theme || config.theme || 'my-wordpress-theme';
config.pathLocal = argv.pathLocal || config.pathLocal || './wp-content/themes';
config.pathRemote = argv.pathRemote || config.pathRemote || './wp-content/themes';
config.backup = argv.backup || config.backup || './.wordpress-deploy';
config.ignore = argv.ignore || config.ignore || [];

// Normalize pathnames
const themePathLocal = path.normalize(config.pathLocal + '/' + config.theme);
const themePathRemote = path.normalize(config.pathRemote + '/' + config.theme);

// Show wordpress-deploy box
let boxText = colors.brightMagenta('wordpress-deploy') + '\n\n';
boxText += colors.brightGreen('Host: ') + colors.white(config.host) + '\n';
boxText += colors.brightGreen('Port: ') + colors.white(config.port) + '\n';
boxText += colors.brightGreen('User: ') + colors.white(config.user) + '\n';
boxText += colors.brightGreen('Theme: ') + colors.white(config.theme);

console.log(
  boxen(boxText, {
    padding: 1,
    margin: 1,
    borderStyle: 'double',
    borderColor: 'magenta'
  })
);

// Check if a file or folder can be uploaded
function canInclude(file) {
  file = path.relative(themePathLocal, file);
  let canInclude = true;
  for (let i = 0; i < config.ignore.length; i++) {
    const ignorePattern = config.ignore[i];
    if (minimatch(file, ignorePattern, { dot: true, matchBase: true })) {
      canInclude = false;
      break;
    }
  }
  return canInclude;
}

// Get all files to upload
// https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
var walk = function (dir, done) {
  var results = [];
  fs.readdir(dir, function (err, list) {
    if (err) {
      return done(err);
    }
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) {
        return done(null, results);
      }
      file = dir + '/' + file;
      // Add file if it is not ignored
      if (canInclude(file)) {
        results.push(file);
      }
      // Add directories recursively
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          next();
        }
      });
    })();
  });
};

// Init progress bar
const progress = new cliProgress.SingleBar({
  format:
    'Uploading |' +
    colors.cyan('{bar}') +
    '| {percentage}% | {value}/{total} files | {status}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
});

// Abort if theme not found
if (!fs.existsSync(themePathLocal)) {
  error('Theme not found', 'Location: ' + themePathLocal);
  return;
}

// Walk through files and upload synchronously
walk(
  themePathLocal,

  // Results listed
  function (err, results) {
    if (err) {
      throw err;
    }

    // Error when nothing to upload
    if (!results || !results.length) {
      error(
        'Nothing to upload',
        'No files found in folder ' + config.themeLocal
      );
      return;
    }

    // Add theme folder
    results.unshift(themePathLocal);

    // Init client
    const client = new Client();
    client.on('error', function (err) {
      error(
        'Could not connect to server',
        'Host: ' +
          config.host +
          '\nPort: ' +
          config.port +
          '\nUser: ' +
          config.user
      );
    });

    client.on('ready', function () {
      // Create backup date string
      const date = new Date();
      const year = date.getFullYear();
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      const hour = ('0' + date.getHours()).slice(-2);
      const minutes = ('0' + date.getMinutes()).slice(-2);
      const seconds = ('0' + date.getSeconds()).slice(-2);
      const dateStr = year + month + day + '_' + hour + minutes + seconds;

      // Path to theme backup folder
      const backupPath = path.normalize(
        config.backup + '/' + dateStr + '_' + config.theme
      );

      // Path to theme upload folder
      const uploadPath = path.normalize(backupPath + '_upload');

      // Make backup folder if it doesn't exist
      client.mkdir(path.normalize(config.backup), true, function (err) {
        if (err) {
          throw err;
        }

        // Get the remote path to filename
        function getRemoteFilename(filename) {
          return filename.replace(themePathLocal, uploadPath);
        }

        // Callback after upload
        function uploadCallback(err, progress, client, filelist) {
          if (err) {
            throw err;
          }

          // Update progress bar
          progress.increment();

          // All files are uploaded
          if (filelist.length === 1) {
            // Complete progress bar
            progress.update({
              status: 'Upload complete'
            });
            progress.stop();

            // Rename current theme folder
            client.rename(themePathRemote, backupPath, function (err) {
              if (err) {
                error(
                  'Could not backup current theme',
                  'Remote location: ' + themePathRemote
                );
              }

              // Move uploaded theme from backup folder to theme folder
              client.rename(uploadPath, themePathRemote, function (err) {
                client.end();
                if (err) {
                  error(
                    'Could not create theme folder',
                    'Remote location: ' + themePathRemote
                  );
                  return;
                }
                console.log(
                  boxen(colors.brightGreen('✓ Upload complete'), {
                    padding: 1,
                    margin: 1,
                    borderStyle: 'double',
                    borderColor: 'green'
                  })
                );
              });
            });
          } else {
            // Upload next file
            putItems(filelist.slice(1));
          }
        }

        // Upload a file or create a directory
        function putItems(filelist) {
          const file = filelist[0];
          const fileRemote = getRemoteFilename(file);

          // Create a directory
          if (fs.lstatSync(file).isDirectory()) {
            progress.update({
              status: 'Creating directory: ' + path.basename(file)
            });
            client.mkdir(fileRemote, true, function (err) {
              uploadCallback(err, progress, client, filelist);
            });
          } else {
            // Upload a file
            progress.update({
              status: 'Uploading file: ' + path.basename(file)
            });
            client.put(file, fileRemote, function (err) {
              uploadCallback(err, progress, client, filelist);
            });
          }
        }

        // Start progress bar
        progress.start(results.length, 0, {
          status: 'Preparing to upload files'
        });

        // Start upload
        putItems(results);
      });
    });

    // Connect to client
    client.connect({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
  }
);
