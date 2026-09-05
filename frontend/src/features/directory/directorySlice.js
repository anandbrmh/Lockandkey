import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../app/api';

export const fetchSavedPersons = createAsyncThunk('directory/fetchPersons', async ({ search = '', page = 1, limit = 20, verified } = {}, { rejectWithValue }) => {
  try {
    const params = { search, page, limit };
    if (verified !== undefined) params.verified = verified;
    const { data } = await api.get('/directory/persons', { params });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch persons');
  }
});

export const fetchSavedLocations = createAsyncThunk('directory/fetchLocations', async ({ search = '', page = 1, limit = 20 } = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/directory/locations', { params: { search, page, limit } });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.normalizedMessage || 'Failed to fetch locations');
  }
});

export const deleteSavedPerson = createAsyncThunk('directory/deletePerson', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/directory/persons/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete');
  }
});

export const deleteSavedLocation = createAsyncThunk('directory/deleteLocation', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/directory/locations/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete');
  }
});

const directorySlice = createSlice({
  name: 'directory',
  initialState: {
    persons: [],
    personsPagination: null,
    locations: [],
    locationsPagination: null,
    loadingPersons: false,
    loadingLocations: false,
    error: null,
  },
  reducers: {
    clearDirectoryError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSavedPersons.pending, (s) => { s.loadingPersons = true; s.error = null; })
      .addCase(fetchSavedPersons.fulfilled, (s, { payload }) => { s.loadingPersons = false; s.persons = payload.persons || []; s.personsPagination = payload.pagination || null; })
      .addCase(fetchSavedPersons.rejected, (s, { payload }) => { s.loadingPersons = false; s.error = payload; })

      .addCase(fetchSavedLocations.pending, (s) => { s.loadingLocations = true; s.error = null; })
      .addCase(fetchSavedLocations.fulfilled, (s, { payload }) => { s.loadingLocations = false; s.locations = payload.locations || []; s.locationsPagination = payload.pagination || null; })
      .addCase(fetchSavedLocations.rejected, (s, { payload }) => { s.loadingLocations = false; s.error = payload; })

      .addCase(deleteSavedPerson.fulfilled, (s, { payload: id }) => { s.persons = s.persons.filter(p => p._id !== id); })
      .addCase(deleteSavedLocation.fulfilled, (s, { payload: id }) => { s.locations = s.locations.filter(l => l._id !== id); });
  },
});

export const { clearDirectoryError } = directorySlice.actions;
export const selectDirectory = (state) => state.directory;
export const fetchStaffDirectory = fetchSavedPersons;
export const fetchPersons = fetchSavedPersons;
export default directorySlice.reducer;
