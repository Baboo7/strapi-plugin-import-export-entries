# Strapi Plugin Import Export Entries

Import/Export data from and to your database in just few clicks.

<p align="center">
  <img src="./doc/logo.png" alt="UI" width="300"/>
</p>

## Features

### Import

- Import data directly from the Content Manager
- Import data from CSV and JSON file or from typing raw text according to user permissions
- Import contents to collection type/single type

### Export

- Export data directly from the Content Manager
- Export CSV and JSON contents according to user permissions
- Download files or copy exported data to clipboard
- Filter & sort data using Content Manager filters & sorting

## Screenshots

<p align="center">
  <img src="./doc/scr-ui.png" alt="UI" width="500"/>
</p>
<p align="center">
  <img src="./doc/scr-ui-import.png" alt="UI" width="500"/>
</p>
<p align="center">
  <img src="./doc/scr-ui-export.png" alt="UI" width="500"/>
</p>

## Table Of Content

- [Requirements](#requirements)
- [Installation](#installation)
- [Rebuild The Admin Panel](#rebuild-the-admin-panel)
- [Usage](#usage)
  - [Config](#config)
  - [Services](#services)
  - [Content API](#content-api)
  - [Importing Data](#importing-data)
    - [Data Structure](#data-structure)
    - [Webhook](#webhook)
  - [Examples](#examples)
- [Author](#author)
- [Acknowledgments](#acknowledgments)

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
  'import-export-entries': {
    enabled: true,
  },
  //...
});
```

3. Update the webpack config:

Create the file `src/admin/webpack.config.js`:

```js
'use strict';

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = (config) => {
  config.plugins.push(new MonacoWebpackPlugin());

  return config;
};
```

4. Rollback the config of the `security` middleware:

> ⚠️ This step is only for users that used version <= `1.6.2`.

The `security` middleware does not need to be configured anymore to use of the **Monaco** code editor.

In the file `config/middlewares.js`, replace:

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

with

```js
module.exports = [
  //...
  'strapi::security',
  //...
];
```

The important part here is to remove `cdn.jsdelivr.net` from the `script-src` section as it is a security vulnerability.

## Rebuild The Admin Panel

New releases can introduce changes to the administration panel that require a rebuild. Rebuild the admin panel with one of the following commands:

```
yarn build --clean
```

or

```
npm run build --clean
```

## Usage

Once the plugin is installed and setup, the functionnalities are accessible on the content management page of a collection.

<p align="center">
  <img src="./doc/scr-usage.png" alt="UI" width="500"/>
</p>

### Config

In `config/plugins.js`:

```js
module.exports = ({ env }) => ({
  //...
  'import-export-entries': {
    enabled: true,
    config: {
      /**
       * Public hostname of the server.
       *
       * If you use the local provider to persist medias,
       * `serverPublicHostname` should be set to properly export media urls.
       */
      serverPublicHostname: 'https://yoga.com', // default: "".
    },
  },
  //...
});
```

When importing data, imported file size may exceed the file size limit of the server. To lift up the limit, configure the [Strapi middleware `body`](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/middlewares.html#body):

```js
// ./config/middlewares.js

module.exports = {
  // ...
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '10mb',
    },
  },
  // ...
}
```

### Services

```ts
/*****************************
 * Service "import".
 ****************************/

/**
 * Get the service.
 */
const service = strapi.plugin("import-export-entries").service("import");

/**
 * Method importData.
 */
await service.importData(
  /** See Example 1 for the shape of the objects. */
  dataRaw: object[] | string,
  options: {
    /** Slug of the model to import to. */
    slug: string;
    /** Format of the imported data. */
    format: "csv" | "json";
    /** User importing data. */
    user: object;
  }
) : Promise<{
  failures: {
    /** Error raised. */
    error: Error;
    /** Data for which import failed. */
    data: object;
  }[]
}>;
```

### Content API

Data can be imported/exported through the content api. Endpoints have to be enabled in _Settings > Users & Permissions plugin > Roles_.

```ts
/*****************************
 * Import data
 *
 * POST /api/import-export-entries/content/import
 ****************************/

type RouteParams = {
  /** Slug of the model to export. */
  slug: string;
  /**
   * Data to import.
   * if `format` is "csv", data must be a string.
   * if `format` is "json", data must be an object or an array of objects.
   * */
  data: string | Object | Object[];
  /** Format of the passed data to import. */
  format: 'csv' | 'json';
  /** Name of the field to use as a unique identifier for entries. Default: "id" */
  idField?: string;
};

type RouteReturn = {
  /** Array of failed imports. */
  failures: {
    /** Error raised during import. */
    error: string;
    /** Data for which the import failed. */
    data: Object;
  }[];
};
```

```ts
/*****************************
 * Export data
 *
 * POST /api/import-export-entries/content/export/contentTypes
 ****************************/

type RouteParams = {
  /** Slug of the model to export. */
  slug: string;
  /** Format to use to export the data. */
  exportFormat: 'csv' | 'json';
  /** Search query used to select the entries to export. The package `qs` is used to parse the query. Default: "" */
  search?: string;
  /** Whether to apply the search query. Default: false */
  applySearch?: boolean;
  /** Whether to export relations as id instead of plain objects. Default: false */
  relationsAsId?: boolean;
  /** Deepness of the exported data. Default: 5 */
  deepness?: number;
};

type RouteReturn = {
  /** Exported data. */
  data: string;
};
```

### Importing Data

#### Data Structure

The expected import data structure:

- Relation: `object` | `number`
  - `object`: the relation is searched in db by `id`. If an entry is found, it is updated with the provided data. Otherwise, it is created.
  - `number`: the relation is treated as an id.
- Media: `object` | `string` | `number`
  - `object`: the media must have an `id`, `name` or `url` property. First the media is searched by `id`, then by `name` and finally imported from `url` if not found previously. When imported by url, the name of the file is deduced from the `url` and is used to find the media in db. If found by name, the media in db is used. Otherwise, the media is uploaded to the db. ⚠️ Check that the server can access the url.
    - Eg: `{ id: 1 }`
    - Eg: `{ name: "alpaga.jpg" }`
    - Eg: `{ url: "https://www.thetimes.co.uk/imageserver/image/alpaga.jpg" }` ((File name is `imageserver-image-alpaga.jpg`))
    - Eg: `{ url: "http://localhost:1337/alpaga.jpg" }` (File name is `alpaga.jpg`)
    -
  - `string`: Same as above, except the media provided is a url.
    - Eg: `"https://www.thetimes.co.uk/imageserver/image/alpaga.jpg"` ((File name is `imageserver-image-alpaga.jpg`))
    - Eg: `"http://localhost:1337/alpaga.jpg"` (File name is `alpaga.jpg`)
  - `number`: the media is treated as an id.
    - Eg: `7`

#### Webhook

At the moment, the webhook is triggered only for media creation, update and deletion. It is not triggered for other data.

### Examples

#### Example 1: Import Through Content Manager

Let's consider some data that represents yoga courses. We have a `course` table where each `course` refers to a `beautiful_place` (stored in the `beautiful_place` table).

Here we are importing the following 3 entries to the `course` table.

<details>
  <summary>CSV data</summary>

```json
"id","type","beautiful_place","description","name","createdAt","updatedAt","createdBy","updatedBy"
"1","vinyasa","{""id"":2,""name"":""Machu Picchu"",""description"":""The strength of the Incas with the chill of the alpacas."",""createdAt"":""2022-06-06T21:51:45.787Z"",""updatedAt"":""2022-06-06T21:51:45.787Z"",""locale"":""en""}","All you need is your mat and an Alpaca.","Alpaca Flow","2022-06-06T21:52:34.046Z","2022-06-06T21:52:34.046Z","{""id"":1,""firstname"":""Patrick"",""lastname"":""Beach"",""username"":null,""email"":""patrick.beach@yoga.com"",""password"":""$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu"",""resetPasswordToken"":null,""registrationToken"":null,""isActive"":true,""blocked"":false,""preferedLanguage"":null,""createdAt"":""2022-05-23T19:16:33.057Z"",""updatedAt"":""2022-06-06T21:43:12.901Z""}","{""id"":1,""firstname"":""Patrick"",""lastname"":""Beach"",""username"":null,""email"":""patrick.beach@yoga.com"",""password"":""$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu"",""resetPasswordToken"":null,""registrationToken"":null,""isActive"":true,""blocked"":false,""preferedLanguage"":null,""createdAt"":""2022-05-23T19:16:33.057Z"",""updatedAt"":""2022-06-06T21:43:12.901Z""}"
"2","ashtanga","{""id"":1,""name"":""Boracay White Beach"",""description"":""Sea, Stretch and Sun!"",""createdAt"":""2022-06-06T21:49:35.227Z"",""updatedAt"":""2022-06-06T21:53:56.648Z"",""locale"":""en""}","Head in the stars, feet in the sand.","Sun Salutation","2022-06-06T21:55:35.088Z","2022-06-06T21:55:35.088Z","{""id"":1,""firstname"":""Patrick"",""lastname"":""Beach"",""username"":null,""email"":""patrick.beach@yoga.com"",""password"":""$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu"",""resetPasswordToken"":null,""registrationToken"":null,""isActive"":true,""blocked"":false,""preferedLanguage"":null,""createdAt"":""2022-05-23T19:16:33.057Z"",""updatedAt"":""2022-06-06T21:43:12.901Z""}","{""id"":1,""firstname"":""Patrick"",""lastname"":""Beach"",""username"":null,""email"":""patrick.beach@yoga.com"",""password"":""$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu"",""resetPasswordToken"":null,""registrationToken"":null,""isActive"":true,""blocked"":false,""preferedLanguage"":null,""createdAt"":""2022-05-23T19:16:33.057Z"",""updatedAt"":""2022-06-06T21:43:12.901Z""}"
"3","vinyasa","{""id"":2,""name"":""Machu Picchu"",""description"":""The strength of the Incas with the chill of the alpacas."",""createdAt"":""2022-06-06T21:51:45.787Z"",""updatedAt"":""2022-06-06T21:51:45.787Z"",""locale"":""en""}","This place needs some serious renovation. Let's do it.","Inca Strength Journey","2022-06-06T21:58:39.571Z","2022-06-06T21:58:39.571Z","{""id"":1,""firstname"":""Patrick"",""lastname"":""Beach"",""username"":null,""email"":""patrick.beach@yoga.com"",""password"":""$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu"",""resetPasswordToken"":null,""registrationToken"":null,""isActive"":true,""blocked"":false,""preferedLanguage"":null,""createdAt"":""2022-05-23T19:16:33.057Z"",""updatedAt"":""2022-06-06T21:43:12.901Z""}","{""id"":1,""firstname"":""Patrick"",""lastname"":""Beach"",""username"":null,""email"":""patrick.beach@yoga.com"",""password"":""$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu"",""resetPasswordToken"":null,""registrationToken"":null,""isActive"":true,""blocked"":false,""preferedLanguage"":null,""createdAt"":""2022-05-23T19:16:33.057Z"",""updatedAt"":""2022-06-06T21:43:12.901Z""}"
```

</details>

Or the JSON equivalent:

<details>
  <summary>JSON data</summary>

```json
[
  {
    "id": 1,
    "type": "vinyasa",
    "description": "All you need is your mat and an Alpaca.",
    "name": "Alpaca Flow",
    "createdAt": "2022-06-06T21:52:34.046Z",
    "updatedAt": "2022-06-06T21:52:34.046Z",
    "beautiful_place": {
      "id": 2,
      "name": "Machu Picchu",
      "description": "The strength of the Incas with the chill of the alpacas.",
      "createdAt": "2022-06-06T21:51:45.787Z",
      "updatedAt": "2022-06-06T21:51:45.787Z",
      "locale": "en"
    },
    "createdBy": {
      "id": 1,
      "firstname": "Patrick",
      "lastname": "Beach",
      "username": null,
      "email": "patrick.beach@yoga.com",
      "password": "$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu",
      "resetPasswordToken": null,
      "registrationToken": null,
      "isActive": true,
      "blocked": false,
      "preferedLanguage": null,
      "createdAt": "2022-05-23T19:16:33.057Z",
      "updatedAt": "2022-06-06T21:43:12.901Z"
    },
    "updatedBy": {
      "id": 1,
      "firstname": "Patrick",
      "lastname": "Beach",
      "username": null,
      "email": "patrick.beach@yoga.com",
      "password": "$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu",
      "resetPasswordToken": null,
      "registrationToken": null,
      "isActive": true,
      "blocked": false,
      "preferedLanguage": null,
      "createdAt": "2022-05-23T19:16:33.057Z",
      "updatedAt": "2022-06-06T21:43:12.901Z"
    }
  },
  {
    "id": 2,
    "type": "ashtanga",
    "description": "Head in the stars, feet in the sand.",
    "name": "Sun Salutation",
    "createdAt": "2022-06-06T21:55:35.088Z",
    "updatedAt": "2022-06-06T21:55:35.088Z",
    "beautiful_place": {
      "id": 1,
      "name": "Boracay White Beach",
      "description": "Sea, Stretch and Sun!",
      "createdAt": "2022-06-06T21:49:35.227Z",
      "updatedAt": "2022-06-06T21:53:56.648Z",
      "locale": "en"
    },
    "createdBy": {
      "id": 1,
      "firstname": "Patrick",
      "lastname": "Beach",
      "username": null,
      "email": "patrick.beach@yoga.com",
      "password": "$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu",
      "resetPasswordToken": null,
      "registrationToken": null,
      "isActive": true,
      "blocked": false,
      "preferedLanguage": null,
      "createdAt": "2022-05-23T19:16:33.057Z",
      "updatedAt": "2022-06-06T21:43:12.901Z"
    },
    "updatedBy": {
      "id": 1,
      "firstname": "Patrick",
      "lastname": "Beach",
      "username": null,
      "email": "patrick.beach@yoga.com",
      "password": "$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu",
      "resetPasswordToken": null,
      "registrationToken": null,
      "isActive": true,
      "blocked": false,
      "preferedLanguage": null,
      "createdAt": "2022-05-23T19:16:33.057Z",
      "updatedAt": "2022-06-06T21:43:12.901Z"
    }
  },
  {
    "id": 3,
    "type": "vinyasa",
    "description": "This place needs some serious renovation. Let's do it.",
    "name": "Inca Strength Journey",
    "createdAt": "2022-06-06T21:58:39.571Z",
    "updatedAt": "2022-06-06T21:58:39.571Z",
    "beautiful_place": 2,
    "createdBy": {
      "id": 1,
      "firstname": "Patrick",
      "lastname": "Beach",
      "username": null,
      "email": "patrick.beach@yoga.com",
      "password": "$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu",
      "resetPasswordToken": null,
      "registrationToken": null,
      "isActive": true,
      "blocked": false,
      "preferedLanguage": null,
      "createdAt": "2022-05-23T19:16:33.057Z",
      "updatedAt": "2022-06-06T21:43:12.901Z"
    },
    "updatedBy": {
      "id": 1,
      "firstname": "Patrick",
      "lastname": "Beach",
      "username": null,
      "email": "patrick.beach@yoga.com",
      "password": "$2a$10$iUGfsRyOQJ3h.mss2xwgmu42UBtOkLsyX8MxpCRAOlDSHq2/IZlRu",
      "resetPasswordToken": null,
      "registrationToken": null,
      "isActive": true,
      "blocked": false,
      "preferedLanguage": null,
      "createdAt": "2022-05-23T19:16:33.057Z",
      "updatedAt": "2022-06-06T21:43:12.901Z"
    }
  }
]
```

</details>

The import will produce the following result:

- For the 1st entry:

  1. Find the relation `beautiful_place` with id `2`. \
     If it exists in db, the relation entry is updated in db with the imported data.
     If it doesn't, the relation entry is created in db with the imported data.
  2. Update the `createdBy` and `updatedBy` fields with the id of the user importing the data.
  3. Create the `course` with the right `beautiful_place` id.

- For the 2nd entry: same process
- For the 3rd entry:
  1. The relation `beautiful_place` is a number. Since the relation already exists in db, the `course` will be linked to the right `beautiful_place`. If the number was referring to the id of a non existent `beautiful_place`, the relation would fallback to `null`.
  2. Same last 2 steps as the 1st entry.

## Author

Baboo - [@Baboo7](https://github.com/Baboo7)

## Acknowledgments

This plugin (and especially this README) took strong inspiration from the [strapi-plugin-import-export-content](https://github.com/EdisonPeM/strapi-plugin-import-export-content#readme) from [EdisonPeM](https://github.com/EdisonPeM).
