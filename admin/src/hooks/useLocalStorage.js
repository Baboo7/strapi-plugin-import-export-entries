const PREFERENCES_KEY = 'preferences';

const DEFAULT_PREFERENCES = {
  applyFilters: false,
  deepness: 5,
};

export const useLocalStorage = () => {
  const getPreferences = () => {
    const preferences = localStorage.getItem(PREFERENCES_KEY);

    return preferences != null ? { ...DEFAULT_PREFERENCES, ...JSON.parse(preferences) } : { ...DEFAULT_PREFERENCES };
  };

  const updatePreferences = (partialPreferences) => {
    const preferences = getPreferences();

    return localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...preferences, ...partialPreferences }));
  };

  const getItem = (key) => {
    return localStorage.getItem(key);
  };

  const setItem = (key, value) => {
    return localStorage.getItem(key, value);
  };

  return {
    getPreferences,
    updatePreferences,
    getItem,
    setItem,
  };
};
