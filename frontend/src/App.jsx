import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from './app/store';
import AppRouter from './routes/AppRouter';
import { initializeTheme } from './features/theme/themeSlice';
import './App.css';
import { useOfflineSync } from './hooks/useOfflineSync';

// AppInitializer sets up themes and global auth listeners
function AppInitializer({ children }) {
  const dispatch = useDispatch();
  useOfflineSync();

  useEffect(() => {
    dispatch(initializeTheme());
    const handler = () => {
      // auto-logout on 401 from api interceptor
      import('./features/auth/authSlice').then(({ logout }) => dispatch(logout()));
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [dispatch]);

  return <>{children}</>;
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInitializer>
        <AppRouter />
      </AppInitializer>
    </Provider>
  );
}