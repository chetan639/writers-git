'use client';

import React, { useSyncExternalStore } from 'react';
import { MoonIcon, SunIcon } from './icons';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gitwriter-theme';
const CHANGE_EVENT = 'gitwriter:themechange';

function resolveTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** The theme lives on <html>, not in React — so we subscribe to it rather than mirror it. */
function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  // Null on the server: the real value only exists in the browser, and guessing
  // it would flash the wrong icon after hydration.
  const theme = useSyncExternalStore<Theme | null>(subscribe, resolveTheme, () => null);

  const toggle = () => {
    const next: Theme = resolveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing — the choice just won't survive a reload.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to day' : 'Switch to night'}
      aria-label={theme === 'dark' ? 'Switch to day theme' : 'Switch to night theme'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink ${className}`}
    >
      {theme === 'dark' ? <MoonIcon size={17} /> : <SunIcon size={17} />}
    </button>
  );
}
