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

    // Theme to deploy
    theme: 'my-wordpress-theme',

    // The folder to move the current theme to
    backup: './wordpress-deploy_backups',
}

module.exports = config;
