import { configureStore } from '@reduxjs/toolkit';
import wizardReducer from '../features/wizard/wizardSlice';
import themeReducer from '../features/theme/themeSlice';
import authReducer from '../features/auth/authSlice';
import recordsReducer from '../features/records/recordsSlice';
import directoryReducer from '../features/directory/directorySlice';
import staffReducer from '../features/staff/staffSlice';
// Keep RTK Query mock for backward compat but primary data now via recordsSlice (axios)
import { recordsApi } from '../features/records/recordsApi';

export const store = configureStore({
  reducer: {
    wizard: wizardReducer,
    theme: themeReducer,
    auth: authReducer,
    records: recordsReducer,
    directory: directoryReducer,
    staff: staffReducer,
    [recordsApi.reducerPath]: recordsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(recordsApi.middleware),
});
