const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const boxen = require('boxen');
const colors = require('colors/safe');
const cliProgress = require('cli-progress');
const Client = require('ftp');
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
  error('Config file not found', 'Filename: ' + configFilename);
  return;
}

// Default values
config.host = config.host || 'localhost';
config.port = config.port || 21;
config.user = config.user || 'anonymous';
config.password = config.password || 'secret';
config.theme = config.theme || 'my-wordpress-theme';
config.themePath = config.themePath || './';
config.ignore = config.ignore || [];
config.backup = config.backup || './wordpress-deploy_backup';

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
var path = require('path');
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
      file = path.resolve(dir, file);
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

// Walk through files and uplaod synchronous
walk(
  path.normalize(config.themePath + '/' + config.theme),

  // Results listed
  function (err, results) {
    if (err) {
      throw err;
    }

    // Start progress bar
    progress.start(results.length, 0, {
      status: 'Preparing to upload files'
    });

    // Init client
    const client = new Client();
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
      client.rename('test-theme', backupDate + 'test-theme', function (err) {
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
          let file = filelist[0];

          const fileRemote = file.replace(
            '/Users/stephanwagner/Sites/wordpress-deploy/',
            ''
          );

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
        putItems(results);
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
