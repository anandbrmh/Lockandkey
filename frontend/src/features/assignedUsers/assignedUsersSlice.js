import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../app/api';

export const fetchAssignedUsers = createAsyncThunk('assignedUsers/fetchAll', async ({ search = '', page = 1, limit = 50 } = {}, { rejectWithValue }) => {
  try {
    const params = { page, limit };
    if (search) params.search = search;
    const { data } = await api.get('/assigned-users', { params });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch assigned users');
  }
});

export const createAssignedUser = createAsyncThunk('assignedUsers/create', async ({ name, phone, photoFile }, { rejectWithValue }) => {
  try {
    let dataToSend;
    let headers = {};
    if (photoFile) {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('phone', phone);
      fd.append('photo', photoFile);
      dataToSend = fd;
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      dataToSend = { name, phone };
    }
    const { data } = await api.post('/assigned-users', dataToSend, { headers });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create assigned user');
  }
});

export const deleteAssignedUser = createAsyncThunk('assignedUsers/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/assigned-users/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Delete failed');
  }
});

export const fetchAssignedUserRecords = createAsyncThunk('assignedUsers/fetchRecords', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/assigned-users/${id}/records`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch records');
  }
});

const assignedUsersSlice = createSlice({
  name: 'assignedUsers',
  initialState: {
    users: [],
    pagination: { total: 0, page: 1, limit: 50, pages: 0 },
    loading: false,
    creating: false,
    error: null,
    selectedRecords: null,
    selectedUser: null,
    recordsLoading: false,
  },
  reducers: {
    clearAssignedUsersError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignedUsers.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchAssignedUsers.fulfilled, (s, { payload }) => { s.loading = false; s.users = payload.users || []; s.pagination = payload.pagination || s.pagination; })
      .addCase(fetchAssignedUsers.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(createAssignedUser.pending, (s) => { s.creating = true; s.error = null; })
      .addCase(createAssignedUser.fulfilled, (s, { payload }) => { s.creating = false; s.users.unshift(payload); s.pagination.total += 1; })
      .addCase(createAssignedUser.rejected, (s, { payload }) => { s.creating = false; s.error = payload; })
      .addCase(deleteAssignedUser.fulfilled, (s, { payload }) => { s.users = s.users.filter(u => String(u._id) !== String(payload)); s.pagination.total = Math.max(0, s.pagination.total - 1); })
      .addCase(fetchAssignedUserRecords.pending, (s) => { s.recordsLoading = true; s.selectedRecords = null; })
      .addCase(fetchAssignedUserRecords.fulfilled, (s, { payload }) => { s.recordsLoading = false; s.selectedUser = payload.assignedUser; s.selectedRecords = payload.records; })
      .addCase(fetchAssignedUserRecords.rejected, (s, { payload }) => { s.recordsLoading = false; s.error = payload; });
  },
});

export const { clearAssignedUsersError } = assignedUsersSlice.actions;
export const selectAssignedUsers = (state) => state.assignedUsers;
export default assignedUsersSlice.reducer;
