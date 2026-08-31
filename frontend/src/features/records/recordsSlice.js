import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../app/api';

// Fetch list with filters: page, limit, status, startDate, endDate, handoverName
export const fetchRecords = createAsyncThunk('records/fetchAll', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/lock-key-records', { params });
    // backend returns { success, data: { records, pagination } }
    // Normalize to array + pagination
    if (data?.data?.records) return data.data;
    if (Array.isArray(data?.data)) return { records: data.data, pagination: null };
    return { records: data.data || [], pagination: null };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch records');
  }
});

export const fetchRecordById = createAsyncThunk('records/fetchById', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/lock-key-records/${id}`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch record');
  }
});

export const createRecord = createAsyncThunk('records/create', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/lock-key-records', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.normalizedMessage || 'Failed to create record';
    const errors = err.response?.data?.errors;
    return rejectWithValue(errors ? `${msg}: ${Array.isArray(errors) ? errors.join(', ') : JSON.stringify(errors)}` : msg);
  }
});

export const updateRecord = createAsyncThunk('records/update', async ({ id, formData }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/lock-key-records/${id}`, formData, {
      headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to update record');
  }
});

export const deleteRecord = createAsyncThunk('records/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/lock-key-records/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to delete record');
  }
});

export const fetchStats = createAsyncThunk('records/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/lock-key-records/stats/summary');
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch stats');
  }
});

export const getImageKitAuth = createAsyncThunk('records/getImageKitAuth', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/lock-key-records/auth/imagekit');
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to get ImageKit auth');
  }
});

// Dedicated: change only handover photo — backend auto-sets handoverAt = server now (no client date)
export const updateHandoverPhoto = createAsyncThunk('records/updateHandoverPhoto', async ({ id, file }, { rejectWithValue }) => {
  try {
    const fd = new FormData();
    fd.append('handoverPhoto', file);
    const { data } = await api.patch(`/lock-key-records/${id}/handover-photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to update handover photo');
  }
});

// Dedicated: change only placement photo — backend auto-sets placementAt = server now
export const updatePlacementPhoto = createAsyncThunk('records/updatePlacementPhoto', async ({ id, file }, { rejectWithValue }) => {
  try {
    const fd = new FormData();
    fd.append('placementPhoto', file);
    const { data } = await api.patch(`/lock-key-records/${id}/placement-photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to update placement photo');
  }
});

const recordsSlice = createSlice({
  name: 'records',
  initialState: {
    records: [],
    pagination: null,
    currentRecord: null,
    stats: null,
    imageKitAuth: null,
    loading: false,
    creating: false,
    error: null,
  },
  reducers: {
    clearError(state) { state.error = null; },
    clearCurrent(state) { state.currentRecord = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecords.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchRecords.fulfilled, (s, { payload }) => { s.loading = false; s.records = payload.records || []; s.pagination = payload.pagination || null; })
      .addCase(fetchRecords.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(fetchRecordById.pending, (s) => { s.loading = true; })
      .addCase(fetchRecordById.fulfilled, (s, { payload }) => { s.loading = false; s.currentRecord = payload; })
      .addCase(fetchRecordById.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(createRecord.pending, (s) => { s.creating = true; s.error = null; })
      .addCase(createRecord.fulfilled, (s, { payload }) => { s.creating = false; s.records.unshift(payload); })
      .addCase(createRecord.rejected, (s, { payload }) => { s.creating = false; s.error = payload; })

      .addCase(updateRecord.pending, (s) => { s.loading = true; })
      .addCase(updateRecord.fulfilled, (s, { payload }) => {
        s.loading = false;
        const idx = s.records.findIndex((r) => r._id === payload._id || r.id === payload._id);
        if (idx !== -1) s.records[idx] = payload;
        if (s.currentRecord && (s.currentRecord._id === payload._id || s.currentRecord.id === payload._id)) s.currentRecord = payload;
      })
      .addCase(updateRecord.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(deleteRecord.pending, (s) => { s.loading = true; })
      .addCase(deleteRecord.fulfilled, (s, { payload: id }) => { s.loading = false; s.records = s.records.filter((r) => r._id !== id && r.id !== id); })
      .addCase(deleteRecord.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })

      // handover photo change
      .addCase(updateHandoverPhoto.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updateHandoverPhoto.fulfilled, (s, { payload }) => {
        s.loading = false;
        const idx = s.records.findIndex((r) => (r._id || r.id) === payload._id);
        if (idx !== -1) s.records[idx] = payload;
        if (s.currentRecord && (s.currentRecord._id || s.currentRecord.id) === payload._id) s.currentRecord = payload;
      })
      .addCase(updateHandoverPhoto.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })

      // placement photo change
      .addCase(updatePlacementPhoto.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updatePlacementPhoto.fulfilled, (s, { payload }) => {
        s.loading = false;
        const idx = s.records.findIndex((r) => (r._id || r.id) === payload._id);
        if (idx !== -1) s.records[idx] = payload;
        if (s.currentRecord && (s.currentRecord._id || s.currentRecord.id) === payload._id) s.currentRecord = payload;
      })
      .addCase(updatePlacementPhoto.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(fetchStats.pending, (s) => { s.loading = true; })
      .addCase(fetchStats.fulfilled, (s, { payload }) => { s.loading = false; s.stats = payload; })
      .addCase(fetchStats.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(getImageKitAuth.fulfilled, (s, { payload }) => { s.imageKitAuth = payload; });
  },
});

export const { clearError, clearCurrent } = recordsSlice.actions;
export const selectRecords = (state) => state.records.records;
export const selectRecordsState = (state) => state.records;
export default recordsSlice.reducer;
