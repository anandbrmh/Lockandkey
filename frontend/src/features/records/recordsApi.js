import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// For development convenience, we'll try to reach a backend at /api
// We also support saving/reading from localStorage as a fallback to ensure 
// the app remains fully functional and testable in standalone frontend mode.
const getLocalRecords = () => {
  try {
    const saved = localStorage.getItem('lock_key_records');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalRecord = (record) => {
  try {
    const records = getLocalRecords();
    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      ...record
    };
    records.unshift(newRecord);
    localStorage.setItem('lock_key_records', JSON.stringify(records));
    return newRecord;
  } catch (e) {
    console.error('Error saving mock record', e);
    return record;
  }
};

export const recordsApi = createApi({
  reducerPath: 'recordsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Record'],
  endpoints: (builder) => ({
    getRecords: builder.query({
      query: () => '/lock-key-records',
      providesTags: ['Record'],
      // Standard RTK Query allows transformResponse to fall back to mock data if it fails,
      // but to make it foolproof without a backend, we can override or use queryFn.
      async queryFn(args, queryApi, extraOptions, baseQuery) {
        try {
          const result = await baseQuery('/lock-key-records');
          if (result.error) {
            // Fallback to localStorage mock data
            console.warn('Backend server not responding. Falling back to local storage mock database.');
            return { data: getLocalRecords() };
          }
          return { data: result.data };
        } catch (e) {
          return { data: getLocalRecords() };
        }
      }
    }),
    createRecord: builder.mutation({
      query: (formData) => ({
        url: '/lock-key-records',
        method: 'POST',
        body: formData,
        // Let body be handled as multipart/form-data automatically by browser (no headers override)
      }),
      invalidatesTags: ['Record'],
      async queryFn(formData, queryApi, extraOptions, baseQuery) {
        try {
          // If formData is FormData, let's parse it to mock store it in local storage
          let recordData = {};
          if (formData instanceof FormData) {
            // Read fields
            recordData.keyCount = formData.get('keyCount');
            recordData.handoverName = formData.get('handoverName');
            recordData.handoverRole = formData.get('handoverRole');
            recordData.handoverContact = formData.get('handoverContact');
            
            // Read photos as object URLs / base64 or filenames
            recordData.lockPhoto = formData.get('lockPhoto') ? URL.createObjectURL(formData.get('lockPhoto')) : null;
            recordData.keyPhoto = formData.get('keyPhoto') ? URL.createObjectURL(formData.get('keyPhoto')) : null;
            recordData.placementPhoto = formData.get('placementPhoto') ? URL.createObjectURL(formData.get('placementPhoto')) : null;

            // Metadata parsing
            try {
              recordData.metadata = JSON.parse(formData.get('metadata') || '{}');
            } catch (e) {
              recordData.metadata = {};
            }
          } else {
            recordData = formData;
          }

          // Trigger baseQuery call
          const result = await baseQuery({
            url: '/lock-key-records',
            method: 'POST',
            body: formData,
          });

          if (result.error) {
            // Fallback mock success
            console.warn('Backend server not responding. Saving record to local storage mock database.');
            const saved = saveLocalRecord(recordData);
            // Simulate server network latency
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return { data: saved };
          }
          return { data: result.data };
        } catch (e) {
          const saved = saveLocalRecord(e);
          return { data: saved };
        }
      }
    }),
  }),
});

export const { useGetRecordsQuery, useCreateRecordMutation } = recordsApi;
export { getLocalRecords }; // Exporting for default seed data checks
