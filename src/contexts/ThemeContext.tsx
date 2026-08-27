import { createContext, useContext, useEffect, type ReactNode } from 'react';

interface ThemeContextValue {
  isDark: true;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always force dark mode — light mode is removed
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.removeItem('sentinel_theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: true, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
