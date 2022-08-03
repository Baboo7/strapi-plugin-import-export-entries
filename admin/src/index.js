import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import Initializer from './components/Initializer';
import { Alerts } from './components/Injected/Alerts';
import { InjectedImportButton } from './components/InjectedImportButton';
import { InjectedExportButton } from './components/InjectedExportButton';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
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
      Component: Export,
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
