// wordpress-deploy uses the node package "ftp" to connect to a server
// https://www.npmjs.com/package/ftp

const config = {
  // The hostname or IP address of the FTP server
  host: 'localhost',

  // The port of the FTP server
  port: 21,

  // Username for authentication
  user: 'anonymous',

  // Password for authentication
  password: 'secret',

  // The theme name
  theme: 'my-wordpress-theme',

  // The local theme folder location
  themeLocal: './wp-content/themes',

  // The remote theme folder location
  themeRemote: './wp-content/themes',

  // Files or folders to ignore
  ignore: ['.DS_Store', 'node_modules'],

  // The remote folder in which to backup the current theme
  backupFolder: './wordpress-deploy_backups'
};

module.exports = config;
