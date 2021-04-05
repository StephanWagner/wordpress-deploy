#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const boxen = require('boxen');
const colors = require('colors/safe');
const cliProgress = require('cli-progress');
const Client = require('ftp');
const path = require('path');
const fs = require('fs');

// Log an error message
function error(message, description) {
  console.log(
    boxen(
      colors.red.bold('Error: ') +
        colors.red(message) +
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
const configFilename = argv.configFile || './wordpress-deploy.config.js';
let config;

if (fs.existsSync(configFilename)) {
  config = require('./wordpress-deploy.config.js');
} else {
  error('Config file not found', 'Filename: ' + configFilename + '\nExample: ' + 'https://github.com/StephanWagner/wordpress-deploy/blob/main/wordpress-deploy.config.js');
  return;
}

// Default values
config.host = config.host || 'localhost';
config.port = config.port || 21;
config.user = config.user || 'anonymous';
config.password = config.password || 'secret';
config.theme = config.theme || 'my-wordpress-theme';
config.themeLocal = config.themeLocal || './wp-content/themes';
config.themeRemote = config.themeRemote || './wp-content/themes';
config.ignore = config.ignore || [];
config.backupFolder = config.backupFolder || './wordpress-deploy_backups';

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

// Get all files to upload
// https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
var walk = function (dir, done) {
  var results = [themePathLocal];
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
      if (config.ignore.indexOf(path.basename(file)) === -1) {
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

const themePathLocal = path.normalize(config.themeLocal + '/' + config.theme);
const themePathRemote = path.normalize(config.themeRemote + '/' + config.theme);

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
      // Create backup date
      const date = new Date();
      const year = date.getFullYear();
      const month = ('0' + date.getMonth() + 1).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      const hour = ('0' + date.getHours()).slice(-2);
      const minutes = ('0' + date.getMinutes()).slice(-2);
      const seconds = ('0' + date.getSeconds()).slice(-2);
      const dateStr = year + '-' + month + '-' + day;
      const timeStr = hour + '-' + minutes + '-' + seconds;
      const backupDate = dateStr + '_' + timeStr + '_';

      // Backup current theme
      const backupPath = path.normalize(
        config.backupFolder + '/' + backupDate + config.theme
      );

      client.mkdir(path.normalize(config.backupFolder), true, function (err) {
        if (err) {
          throw err;
        }

        client.rename(themePathRemote, backupPath, function (err) {
          // Get the remote path
          function getRemoteFilename(filename) {
            return filename.replace(themePathLocal, themePathRemote);
          }

          // Callback after upload
          function uploadCallback(err, progress, client, filelist) {
            if (err) {
              throw err;
            }
            progress.increment();

            // End process
            if (filelist.length === 1) {
              progress.update({
                status: 'Upload complete'
              });
              progress.stop();
              client.end();
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
    });

    client.connect({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
  }
);
