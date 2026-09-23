import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
 * CRITICAL: NEVER remove the <meta name="theme-color"> elements from the DOM!
 * In iOS Safari / WebKit, removing meta tags detaches WebKit's native ThemeColorObserver.
 * Furthermore, iOS Safari strictly checks media queries (prefers-color-scheme).
 * Updating all light/dark/default meta tags in-place guarantees Safari respects
 * the chosen theme even when the iPhone's OS is in Light Mode!
 */
export const applyStatusBarColor = (theme: Theme) => {
  const topbarColor = theme === 'dark' ? '#0b0c11' : '#ffffff';
  const root = document.documentElement;

  // 1. Explicit colorScheme tells WebKit & Chrome to adapt native status bar text and icons (white in dark, black in light)
  root.style.colorScheme = theme;
  if (document.body) {
    document.body.style.colorScheme = theme;
  }

  // 2. Update persistent meta[name="theme-color"] tags strictly in-place
  const metaLight = document.getElementById('theme-color-light') as HTMLMetaElement | null;
  if (metaLight) {
    metaLight.setAttribute('content', topbarColor);
    metaLight.content = topbarColor;
  }

  const metaDark = document.getElementById('theme-color-dark') as HTMLMetaElement | null;
  if (metaDark) {
    metaDark.setAttribute('content', topbarColor);
    metaDark.content = topbarColor;
  }

  let metaDefault = document.getElementById('sentinel-theme-color') as HTMLMetaElement | null;
  if (!metaDefault) {
    metaDefault = document.querySelector('meta[name="theme-color"]:not([media])');
  }
  if (metaDefault) {
    metaDefault.setAttribute('content', topbarColor);
    metaDefault.content = topbarColor;
  }

  // Also update any other theme-color tags in document in-place
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', topbarColor);
    (m as HTMLMetaElement).content = topbarColor;
  });

  // 3. Keep apple-mobile-web-app-status-bar-style in sync for iOS PWA/standalone mode
  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
  if (!appleMeta) {
    appleMeta = document.createElement('meta');
    appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.appendChild(appleMeta);
  }
  appleMeta.setAttribute('content', 'black-translucent');

};

const applyThemeDom = (newTheme: Theme, updateStatusBar = true) => {
  const root = document.documentElement;

  // Remove any stale inline background-color so CSS classes are always authoritative
  root.style.removeProperty('background-color');
  if (document.body) document.body.style.removeProperty('background-color');

  if (newTheme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-mode', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-mode', 'light');
  }

  if (updateStatusBar) {
    applyStatusBarColor(newTheme);
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

  const activeTransitionRef = useRef<any>(null);
  // Always reflects latest theme — updated at render time so closures never go stale
  const themeRef = useRef<Theme>(theme);
  themeRef.current = theme;

  const setTheme = (newTheme: Theme, e?: React.MouseEvent | MouseEvent) => {
    if (newTheme === theme) return;

    // Skip any previous view transition to prevent stuck overlays
    if (activeTransitionRef.current && typeof activeTransitionRef.current.skipTransition === 'function') {
      try { activeTransitionRef.current.skipTransition(); } catch { /* ignore */ }
      activeTransitionRef.current = null;
    }

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
      applyThemeDom(newTheme, true);
      return;
    }

    // Mark transition active
    document.documentElement.setAttribute('data-theme-transitioning', 'true');

    try {
      // @ts-ignore
      const vt = document.startViewTransition(() => {
        flushSync(() => {
          commitState();
          // Always apply full DOM update (class + meta) atomically inside the transition.
          // Never use a separate timer — timers get cancelled on navigation and cause the stuck-bar bug.
          applyThemeDom(newTheme, true);
        });
      });

      activeTransitionRef.current = vt;

      const cleanup = () => {
        activeTransitionRef.current = null;
        // Re-assert to ensure meta tags are in sync after transition finishes
        applyStatusBarColor(newTheme);
        document.documentElement.removeAttribute('data-theme-transitioning');
      };

      vt.finished.then(cleanup, cleanup);
    } catch {
      activeTransitionRef.current = null;
      commitState();
      applyThemeDom(newTheme, true);
      document.documentElement.removeAttribute('data-theme-transitioning');
    }
  };

  const toggleTheme = (e?: React.MouseEvent | MouseEvent) => {
    setTheme(theme === 'dark' ? 'light' : 'dark', e);
  };

  // Synchronize on mount and theme state change
  useEffect(() => {
    applyThemeDom(theme, true);
  }, [theme]);

  // Re-assert full theme on every page navigation so the topbar never gets stuck.
  // Uses themeRef (not theme from closure) to avoid stale-closure bug:
  // hashchange can fire while React is mid-update, before setThemeState re-renders,
  // so reading `theme` from the closure would give the OLD value and revert the theme.
  useEffect(() => {
    const handleNavChange = () => {
      // Cancel any orphaned transition
      if (activeTransitionRef.current && typeof activeTransitionRef.current.skipTransition === 'function') {
        try { activeTransitionRef.current.skipTransition(); } catch { /* ignore */ }
        activeTransitionRef.current = null;
      }
      document.documentElement.removeAttribute('data-theme-transitioning');
      // Read from ref — always the current theme, even mid-React-render
      applyThemeDom(themeRef.current, true);
    };
    window.addEventListener('hashchange', handleNavChange);
    window.addEventListener('popstate', handleNavChange);
    return () => {
      window.removeEventListener('hashchange', handleNavChange);
      window.removeEventListener('popstate', handleNavChange);
    };
  }, []); // Empty deps — handler reads themeRef, not stale closure value

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
