// src/lib/stores/theme.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
  const { subscribe, set } = writable<Theme>('light');
  
  function init() {
    if (!browser) return;
    const saved = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    set(initial);
    applyTheme(initial);
  }
  
  function toggle() {
    if (!browser) return;
    const current = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    set(current);
    applyTheme(current);
    localStorage.setItem('theme', current);
  }
  
  function applyTheme(theme: Theme) {
    if (!browser) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }
  
  return { subscribe, toggle, init };
}

export const theme = createThemeStore();