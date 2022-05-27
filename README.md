# Strapi Plugin Import Export

This plugin helps you import and export data from and to your database in just few clicks.

<img src="./doc/scr-ui.png" alt="UI" width="500"/>

## Requirements

Strapi v4 is required.

## Installation

```
yarn add strapi-plugin-import-export-entries
```

or

```
npm i strapi-plugin-import-export-entries
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
