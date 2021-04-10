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
  pathLocal: './wp-content/themes',

  // The remote theme folder location
  pathRemote: './wp-content/themes',

  // The remote folder in which to save uploading files and backups
  backup: './.wordpress-deploy',

  // Files or folders to ignore
  // Folder paths are relative to the theme folder
  // To ignore a folder use two patterns: 'foldername' and 'foldername/**'
  ignore: ['.DS_Store', '.env', 'node_modules', 'node_modules/**']
};

module.exports = config;
