'use client';

import { useEffect, useState, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'ferm-plus-theme';

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const nextTheme = resolveInitialTheme();
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [mounted, theme]);

  return (
    <>
      <button
        className="theme-toggle"
        type="button"
        aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
        onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      >
        <span>{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
      </button>
      {children}
    </>
  );
}
