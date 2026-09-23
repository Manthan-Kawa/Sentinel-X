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

/**
 * Applies the status bar color and colorScheme to the DOM.
 * CRITICAL: NEVER remove the <meta name="theme-color"> element from the DOM!
 * In iOS Safari / WebKit, removing the meta tag detaches WebKit's native ThemeColorObserver.
 * Once detached, any newly appended meta tags are ignored, locking the status bar to
 * the previous color after a route/page change. Updating the existing element in-place
 * keeps WebKit's observer permanently attached and responsive.
 */
export const applyStatusBarColor = (theme: Theme) => {
  const topbarColor = theme === 'dark' ? '#0b0c11' : '#ffffff';
  const root = document.documentElement;

  // 1. Explicit colorScheme tells WebKit & Chrome to adapt native status bar text and icons (white in dark, black in light)
  root.style.colorScheme = theme;
  if (document.body) {
    document.body.style.colorScheme = theme;
  }

  // 2. Update persistent meta[name="theme-color"] strictly in-place
  let meta = document.getElementById('sentinel-theme-color') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.querySelector('meta[name="theme-color"]');
  }
  if (!meta) {
    meta = document.createElement('meta');
    meta.id = 'sentinel-theme-color';
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  meta.removeAttribute('media');
  meta.setAttribute('content', topbarColor);
  meta.content = topbarColor;

  // 3. Keep apple-mobile-web-app-status-bar-style in sync for iOS PWA/standalone mode
  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
  if (!appleMeta) {
    appleMeta = document.createElement('meta');
    appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.appendChild(appleMeta);
  }
  appleMeta.setAttribute('content', 'black-translucent');

  // Also update any other theme-color tags in the document in-place
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (m !== meta) {
      m.removeAttribute('media');
      m.setAttribute('content', topbarColor);
      (m as HTMLMetaElement).content = topbarColor;
    }
  });

  // 4. Ensure root and body background directly match the topbar color for mobile safe areas
  root.style.backgroundColor = topbarColor;
  if (document.body) {
    document.body.style.backgroundColor = topbarColor;
  }
};

const applyThemeDom = (newTheme: Theme) => {
  const root = document.documentElement;
  if (newTheme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-mode', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-mode', 'light');
  }

  applyStatusBarColor(newTheme);
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

    const commitState = () => {
      setThemeState(newTheme);
      try {
        localStorage.setItem('app-theme', newTheme);
        localStorage.setItem('sentinel_theme', newTheme);
      } catch { /* ignore */ }
    };

    // Robust click/touch coordinate extraction for circular reveal origin
    let x = window.innerWidth / 2;
    let y = 0;
    if (e) {
      if (typeof e.clientX === 'number' && typeof e.clientY === 'number' && (e.clientX !== 0 || e.clientY !== 0)) {
        x = e.clientX;
        y = e.clientY;
      } else if (e.currentTarget && typeof (e.currentTarget as HTMLElement).getBoundingClientRect === 'function') {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      } else if (e.target && typeof (e.target as HTMLElement).getBoundingClientRect === 'function') {
        const r = (e.target as HTMLElement).getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
    }
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    document.documentElement.style.setProperty('--click-x', `${x}px`);
    document.documentElement.style.setProperty('--click-y', `${y}px`);
    document.documentElement.style.setProperty('--click-radius', `${endRadius}px`);

    // Fallback: no View Transitions support → instant swap
    // @ts-ignore
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commitState();
      applyThemeDom(newTheme);
      return;
    }

    // Mark transition active
    document.documentElement.setAttribute('data-theme-transitioning', 'true');

    try {
      // @ts-ignore
      const vt = document.startViewTransition(() => {
        flushSync(() => {
          commitState();
          applyThemeDom(newTheme);
        });
      });

      const cleanup = () => {
        document.documentElement.removeAttribute('data-theme-transitioning');
      };

      vt.finished.then(cleanup, cleanup);
    } catch {
      // If startViewTransition fails synchronously:
      commitState();
      applyThemeDom(newTheme);
      document.documentElement.removeAttribute('data-theme-transitioning');
    }
  };

  const toggleTheme = (e?: React.MouseEvent | MouseEvent) => {
    setTheme(theme === 'dark' ? 'light' : 'dark', e);
  };

  // Synchronize on mount and theme state change
  useEffect(() => {
    applyThemeDom(theme);
  }, [theme]);

  // Re-assert correct status bar color on page navigation / hash changes so it never locks
  useEffect(() => {
    const handleNavChange = () => {
      applyStatusBarColor(theme);
    };
    window.addEventListener('hashchange', handleNavChange);
    window.addEventListener('popstate', handleNavChange);
    return () => {
      window.removeEventListener('hashchange', handleNavChange);
      window.removeEventListener('popstate', handleNavChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
