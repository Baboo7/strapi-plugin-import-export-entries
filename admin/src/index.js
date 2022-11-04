import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPkg from '../../package.json';
import Initializer from './components/Initializer';
import { Alerts } from './components/Injected/Alerts';
import { InjectedExportButton } from './components/InjectedExportButton';
import { InjectedImportButton } from './components/InjectedImportButton';
import { InjectedImportExportSingleType } from './components/InjectedImportExportSingleType/InjectedImportExportSingleType';
import PluginIcon from './components/PluginIcon';
import pluginId from './pluginId';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'SEO',
      },
      Component: async () => {
        const component = await import('./pages/App');

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
      Component: InjectedImportButton,
    });
    app.injectContentManagerComponent('listView', 'actions', {
      name: `${pluginId}-export`,
      Component: InjectedExportButton,
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
        return import(`./translations/${locale}.json`)
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
