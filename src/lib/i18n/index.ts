import i18n from 'sveltekit-i18n';

const config = {
  loaders: [
    {
      locale: 'en',
      key: '',
      loader: async () => (await import('./en.json')).default,
    },
    {
      locale: 'he',
      key: '',
      loader: async () => (await import('./he.json')).default,
    },
  ]
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
