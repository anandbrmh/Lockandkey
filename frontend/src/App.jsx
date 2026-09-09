import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './app/store';
import AppRouter from './routes/AppRouter';
import { initializeTheme } from './features/theme/themeSlice';
import './App.css';
import { useOfflineSync } from './hooks/useOfflineSync';
import { fetchMe, selectIsAuthenticated, logout } from './features/auth/authSlice';

// AppInitializer sets up themes and global auth listeners
function AppInitializer({ children }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  useOfflineSync();

  useEffect(() => {
    dispatch(initializeTheme());
    const handler = () => {
      dispatch(logout());
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMe());
    }
  }, [isAuthenticated, dispatch]);

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