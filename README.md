# wordpress-deploy

## Author

Stephan Wagner\
https://stephanwagner.me\
<stephanwagner.me@gmail.com>

---

## Install

Install the package globally

```bash
npm install -g wordpress-deploy
```

Now you can use the deploy script preferably from within your wordpress folder.

```bash
wordpress-deploy
```

---

## Config

Add a config file named `wordpress-deploy.config.js` to your wordpress folder and adjust accordingly:

```javascript
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
```

You can also find an example here: https://github.com/StephanWagner/wordpress-deploy/blob/main/wordpress-deploy.config.js

> **Make sure to add the config file to your `.gitignore`.**

You can also provide an argument to use a different filename:

```bash
wordpress-deploy --configFile=./my-custom-config.js
```
