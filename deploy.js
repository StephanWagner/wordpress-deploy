const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const boxen = require('boxen');
const colors = require('colors/safe');
const Client = require('ftp');
const fs = require('fs');

// Show an error
function error(message, description) {
  console.log(
    boxen(colors.red.bold('Error: ') + colors.red(message) + '\n' + colors.white(description), {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'red'
    })
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
  return ;
}

// Default values
config.host = config.host || 'localhost';
config.port = config.port || 21;
config.user = config.user || 'anonymous';
config.password = config.password || 'secret';
config.theme = config.theme || 'my-wordpress-theme';
config.backup = config.backup || './wordpress-deploy_backup';

// Show wordpress deploy box
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

// Upload
var c = new Client();

c.on('ready', function () {
  c.put('foo.txt', 'foo.remote-copy.txt', function (err) {
    if (err) throw err;
    c.end();
  });
});

c.connect({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
});
