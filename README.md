# Strapi Plugin Import Export Entries

This plugin helps you import and export data from and to your database in just few clicks.

<img src="./doc/scr-ui.png" alt="UI" width="500"/>

## Requirements

Strapi v4 is required.

## Installation

1. Download

```
yarn add strapi-plugin-import-export-entries
```

or

```
npm i strapi-plugin-import-export-entries
```

2. Enable the plugin

Add in the file `config/plugins.js`:

```js
module.exports = ({ env }) => ({
  //...
  "import-export-entries": {
    enabled: true,
  },
  //...
});
```

3. Update the config of the `security` middleware:

The `security` middleware needs to be configured to enable the use of the great **Monaco** code editor.

In the file `config/middlewares.js`, replace:

```js
module.exports = [
  //...
  "strapi::security",
  //...
];
```

with

```js
module.exports = ({ env }) => ({
  //...
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Enable the download of the Monaco editor
          // from cdn.jsdelivr.net.
          "script-src": ["'self'", "cdn.jsdelivr.net", "blob:"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  //...
});
```

## Rebuild the admin panel

New releases can introduce changes to the administration panel that require a rebuild. Rebuild the admin panel with one of the following commands:

```
yarn build --clean
```

or

```
npm run build --clean
```

## Features

### Import

- Import data directly from the Content Manager
- Read data from CSV and JSON file or from typing raw text
- Import contents to collection type (NOT single type yet)

### Export

- Export data directly from the Content Manager
- Export CSV and JSON contents
- Download files or copy exported data to clipboard

## Author

Baboo - [@Baboo7](https://github.com/Baboo7)

## Acknowledgments

This plugin (and especially this README) took strong inspiration from the [strapi-plugin-import-export-content](https://github.com/EdisonPeM/strapi-plugin-import-export-content#readme) from [EdisonPeM](https://github.com/EdisonPeM).
