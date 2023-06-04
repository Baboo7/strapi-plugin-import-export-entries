import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPkg from '../../package.json';
import { ImportButton } from './components/ImportButton';
import Initializer from './components/Initializer';
import { Alerts } from './components/Injected/Alerts';
import { InjectedExportCollectionType } from './components/InjectedExportCollectionType';
import { InjectedImportExportSingleType } from './components/InjectedImportExportSingleType';
import PluginIcon from './components/PluginIcon';
import { pluginPermissions } from './permissions';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTrad(`plugin.name`),
        defaultMessage: 'Import Export',
      },
      permissions: pluginPermissions.main,
      Component: async () => {
        const component = await import(/* webpackChunkName: "import-export-entries" */ './pages/App');

        return component;
      },
    });

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap(app) {
    app.injectContentManagerComponent('listView', 'actions', {
      name: `${pluginId}-alerts`,
      Component: Alerts,
    });
    app.injectContentManagerComponent('listView', 'actions', {
      name: `${pluginId}-import`,
      Component: ImportButton,
    });
    app.injectContentManagerComponent('listView', 'actions', {
      name: `${pluginId}-export`,
      Component: InjectedExportCollectionType,
    });

    app.injectContentManagerComponent('editView', 'right-links', {
      name: `${pluginId}-alerts`,
      Component: Alerts,
    });
    app.injectContentManagerComponent('editView', 'right-links', {
      name: `${pluginId}-import-export`,
      Component: InjectedImportExportSingleType,
    });
  },

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(/* webpackChunkName: "import-export-entries-translation-[request]" */ `./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      }),
    );

    return Promise.resolve(importedTrads);
  },
};
