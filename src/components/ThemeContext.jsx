import React, { createContext, useContext, useEffect, useState } from 'react';

const mq = window.matchMedia('(prefers-color-scheme: dark)');

const ThemeContext = createContext({ isDark: false });

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(mq.matches);

  useEffect(() => {
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
