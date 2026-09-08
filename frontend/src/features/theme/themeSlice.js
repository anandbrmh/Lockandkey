import { createSlice } from '@reduxjs/toolkit';

const getInitialTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem('color-theme');
    if (typeof storedPrefs === 'string') {
      return storedPrefs === 'dark';
    }
    // Default to light to prevent black flash on PWA cold start
    // Do NOT auto-follow prefers-color-scheme - user must explicitly enable dark
  }
  return false;
};

const initialState = {
  isDark: getInitialTheme(),
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleDark: (state) => {
      state.isDark = !state.isDark;
      if (state.isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
      }
    },
    initializeTheme: (state) => {
      // Sync with inline script in index.html - ensure no flash
      if (state.isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.backgroundColor = '#18181b';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.backgroundColor = '#ffffff';
        // Keep theme-color meta in sync (prevent Android status bar dark flash)
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = '#ffffff';
      }
    }
  },
});

export const { toggleDark, initializeTheme } = themeSlice.actions;

export const selectIsDark = (state) => state.theme.isDark;

export default themeSlice.reducer;
