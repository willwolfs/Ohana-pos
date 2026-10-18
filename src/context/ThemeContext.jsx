import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'ohana_app_theme';
const LOGO_STORAGE_KEY = 'ohana_app_custom_logo';
const LOADER_THEME_STORAGE_KEY = 'ohana_app_loader_theme';

export const DEFAULT_LOGO_URL = '/assets/logo-ohana.png';

export const ThemeProvider = ({ children }) => {
  // 1. Modo del sistema ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark'; // Tema inicial por defecto (Sidebar negro y Navbar negro)
  });

  // 2. Icono / Logo personalizado del sistema
  const [appLogo, setAppLogoState] = useState(() => {
    try {
      const saved = localStorage.getItem(LOGO_STORAGE_KEY);
      if (saved) return saved;
    } catch {}
    return DEFAULT_LOGO_URL;
  });

  // 3. Estilo / Color de la pantalla de carga ('default' | 'black-red' | 'cyan-white')
  const [loaderTheme, setLoaderThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(LOADER_THEME_STORAGE_KEY);
      if (['default', 'black-red', 'cyan-white'].includes(saved)) return saved;
    } catch {}
    return 'default'; // Por defecto: Azul Marino con Naranja Maki original
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}

    // Aplicar atributo al root HTML y al body
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    }

    window.dispatchEvent(new CustomEvent('ohana_theme_changed', { detail: { theme } }));
  }, [theme]);

  // Sincronizar tema de loader en HTML data attribute
  useEffect(() => {
    try {
      localStorage.setItem(LOADER_THEME_STORAGE_KEY, loaderTheme);
    } catch {}
    document.documentElement.setAttribute('data-loader-theme', loaderTheme);
  }, [loaderTheme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const setAppLogo = (newLogoUrl) => {
    try {
      if (!newLogoUrl) {
        localStorage.removeItem(LOGO_STORAGE_KEY);
        setAppLogoState(DEFAULT_LOGO_URL);
        window.dispatchEvent(new CustomEvent('ohana_logo_changed', { detail: { logo: DEFAULT_LOGO_URL } }));
        return;
      }
      localStorage.setItem(LOGO_STORAGE_KEY, newLogoUrl);
      setAppLogoState(newLogoUrl);
      window.dispatchEvent(new CustomEvent('ohana_logo_changed', { detail: { logo: newLogoUrl } }));
    } catch (e) {
      console.error('Error guardando logo personalizado:', e);
    }
  };

  const resetAppLogo = () => {
    setAppLogo(null);
  };

  const setLoaderTheme = (themeName) => {
    if (['default', 'black-red', 'cyan-white'].includes(themeName)) {
      setLoaderThemeState(themeName);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: toggleTheme,
        appLogo,
        setAppLogo,
        resetAppLogo,
        loaderTheme,
        setLoaderTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark',
      setTheme: () => {},
      appLogo: DEFAULT_LOGO_URL,
      setAppLogo: () => {},
      resetAppLogo: () => {},
      loaderTheme: 'default',
      setLoaderTheme: () => {},
    };
  }
  return context;
};

