# wordpress-deploy

Easily deploy your wordpress theme via FTP.

---

## Author

Stephan Wagner\
https://stephanwagner.me \
<stephanwagner.me@gmail.com>

---

## Install

Install the package globally:

```bash
npm install -g wordpress-deploy
```

Now you can use the bash command `wordpress-deploy` (or in short `wp-dep`) preferably from within your wordpress folder.

```bash
wp-dep
```

---

## Config

Add a config file named `wordpress-deploy.config.js` to your wordpress folder and adjust accordingly.

**Make sure to add the config file to your `.gitignore`**

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
  pathLocal: './wp-content/themes',

  // The remote theme folder location
  pathRemote: './wp-content/themes',

  // The remote folder in which to save uploading files and backups
  backup: './.wordpress-deploy',

  // Files or folders to ignore
  // Folder paths are relative to the theme folder
  // To ignore a folder use two patterns: 'folder', 'folder/**'
  ignore: ['.DS_Store', 'node_modules', 'node_modules/**']
};

module.exports = config;
```

Example file: [wordpress-deploy.config.js](https://github.com/StephanWagner/wordpress-deploy/blob/main/wordpress-deploy.config.js)

You can also provide an argument to use a different config filename:

```bash
wp-dep --config=my-custom-config.js
```

All config parameters can be used as arguments, for example:

```bash
wp-dep --theme=my-theme
```
