import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../app/api';

// Helpers for persistence
const loadInitialState = () => {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    return { token, user, isAuthenticated: !!token && !!user };
  } catch {
    return { token: null, user: null, isAuthenticated: false };
  }
};

const initialAuth = loadInitialState();

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, email, password, role, adminCode }, { rejectWithValue }) => {
    try {
      const payload = { name, email, password, role };
      if (adminCode !== undefined) payload.adminCode = adminCode;
      const { data } = await api.post('/auth/register', payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Registration failed');
    }
  }
);

export const fetchAdminSettings = createAsyncThunk('auth/fetchAdminSettings', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/admin/settings');
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch settings');
  }
});

export const updateAdminSettings = createAsyncThunk('auth/updateAdminSettings', async ({ name, email, adminCode }, { rejectWithValue }) => {
  try {
    const { data } = await api.put('/auth/admin/settings', { name, email, adminCode });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to update settings');
  }
});

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Login failed');
    }
  }
);

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch profile');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialAuth.user,
    token: initialAuth.token,
    isAuthenticated: initialAuth.isAuthenticated,
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError(state) {
      state.error = null;
    },
    hydrateAuth(state) {
      const { token, user, isAuthenticated } = loadInitialState();
      state.token = token;
      state.user = user;
      state.isAuthenticated = isAuthenticated;
    },
  },
  extraReducers: (builder) => {
    builder
      // register
      .addCase(registerUser.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(registerUser.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.user = payload.user;
        s.token = payload.token;
        s.isAuthenticated = true;
        localStorage.setItem('token', payload.token);
        localStorage.setItem('user', JSON.stringify(payload.user));
      })
      .addCase(registerUser.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      // login
      .addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(loginUser.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.user = payload.user;
        s.token = payload.token;
        s.isAuthenticated = true;
        localStorage.setItem('token', payload.token);
        localStorage.setItem('user', JSON.stringify(payload.user));
      })
      .addCase(loginUser.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      // me
      .addCase(fetchMe.pending, (s) => { s.loading = true; })
      .addCase(fetchMe.fulfilled, (s, { payload }) => { s.loading = false; s.user = payload; s.isAuthenticated = true; localStorage.setItem('user', JSON.stringify(payload)); })
      .addCase(fetchMe.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      // admin settings
      .addCase(fetchAdminSettings.pending, (s) => { s.loading = true; })
      .addCase(fetchAdminSettings.fulfilled, (s, { payload }) => { s.loading = false; s.user = payload; localStorage.setItem('user', JSON.stringify(payload)); })
      .addCase(fetchAdminSettings.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(updateAdminSettings.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updateAdminSettings.fulfilled, (s, { payload }) => { s.loading = false; s.user = payload; localStorage.setItem('user', JSON.stringify(payload)); })
      .addCase(updateAdminSettings.rejected, (s, { payload }) => { s.loading = false; s.error = payload; });
  },
});

export const { logout, clearError, hydrateAuth } = authSlice.actions;
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export default authSlice.reducer;
