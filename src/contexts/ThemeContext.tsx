import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: (e?: React.MouseEvent | MouseEvent) => void;
  setTheme: (theme: Theme, e?: React.MouseEvent | MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

const applyThemeDom = (newTheme: Theme) => {
  const root = document.documentElement;
  if (newTheme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-mode', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-mode', 'light');
  }

  const topbarColor = newTheme === 'dark' ? '#0b0c11' : '#ffffff';

  const metaThemeColors = document.querySelectorAll('meta[name="theme-color"]');
  if (metaThemeColors.length > 0) {
    metaThemeColors.forEach((m) => m.setAttribute('content', topbarColor));
  } else {
    const metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    metaThemeColor.setAttribute('content', topbarColor);
    document.head.appendChild(metaThemeColor);
  }

  // Ensure root background directly matches topbar color for mobile status bar area
  root.style.backgroundColor = topbarColor;
  if (document.body) {
    document.body.style.backgroundColor = topbarColor;
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('app-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    const legacy = localStorage.getItem('sentinel_theme') as Theme | null;
    if (legacy === 'light' || legacy === 'dark') return legacy;
    return 'dark';
  });

  const setTheme = (newTheme: Theme, e?: React.MouseEvent | MouseEvent) => {
    if (newTheme === theme) return;

    const commit = () => {
      setThemeState(newTheme);
      applyThemeDom(newTheme);
      try {
        localStorage.setItem('app-theme', newTheme);
        localStorage.setItem('sentinel_theme', newTheme);
      } catch { /* ignore */ }
    };

    // Resolve the click-origin for the circle-expand centre
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e) {
      if (e.clientX || e.clientY) {
        x = e.clientX;
        y = e.clientY;
      } else if (e.currentTarget instanceof HTMLElement) {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
    }
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    // Fallback: no View Transitions support → instant swap
    // @ts-ignore
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit();
      return;
    }

    // Freeze element-level CSS transitions during the clip-path snapshot
    document.documentElement.setAttribute('data-theme-transitioning', 'true');

    // @ts-ignore
    const vt = document.startViewTransition(() => {
      flushSync(commit);
    });

    vt.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    }).catch(() => { /* cancelled — ignore */ });

    vt.finished.finally(() => {
      document.documentElement.removeAttribute('data-theme-transitioning');
    });
  };

  const toggleTheme = (e?: React.MouseEvent | MouseEvent) => {
    setTheme(theme === 'dark' ? 'light' : 'dark', e);
  };

  useEffect(() => { applyThemeDom(theme); }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
