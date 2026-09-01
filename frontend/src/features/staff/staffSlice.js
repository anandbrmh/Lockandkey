import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../app/api';

export const fetchStaffProfile = createAsyncThunk('staff/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/staff/me');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch staff profile');
  }
});

export const checkStaffProfile = createAsyncThunk('staff/check', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/staff/check');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to check staff profile');
  }
});

export const completeStaffProfile = createAsyncThunk('staff/complete', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/staff/complete', formData, {
      headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to save staff profile');
  }
});

const staffSlice = createSlice({
  name: 'staff',
  initialState: {
    profile: null,
    completed: false,
    exists: false,
    loading: false,
    saving: false,
    error: null,
    checked: false,
  },
  reducers: {
    clearStaffError(state) { state.error = null; },
    resetStaff(state) {
      state.profile = null; state.completed = false; state.exists = false; state.checked = false; state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffProfile.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchStaffProfile.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.profile = payload.data;
        s.completed = !!payload.completed;
        s.exists = !!payload.data;
        s.checked = true;
      })
      .addCase(fetchStaffProfile.rejected, (s, { payload }) => { s.loading = false; s.error = payload; s.checked = true; })
      .addCase(checkStaffProfile.pending, (s) => { s.loading = true; })
      .addCase(checkStaffProfile.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.completed = !!payload.completed;
        s.exists = !!payload.exists;
        s.checked = true;
      })
      .addCase(checkStaffProfile.rejected, (s, { payload }) => { s.loading = false; s.error = payload; s.checked = true; })
      .addCase(completeStaffProfile.pending, (s) => { s.saving = true; s.error = null; })
      .addCase(completeStaffProfile.fulfilled, (s, { payload }) => {
        s.saving = false;
        s.profile = payload.data;
        s.completed = !!payload.completed;
        s.exists = true;
        s.checked = true;
      })
      .addCase(completeStaffProfile.rejected, (s, { payload }) => { s.saving = false; s.error = payload; });
  },
});

export const { clearStaffError, resetStaff } = staffSlice.actions;
export const selectStaff = (state) => state.staff;
export const selectStaffCompleted = (state) => state.staff.completed;
export default staffSlice.reducer;
