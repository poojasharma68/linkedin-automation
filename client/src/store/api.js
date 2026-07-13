import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from './authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const url = typeof args === 'string' ? args : args?.url;
    if (!String(url).includes('/api/auth/login')) {
      api.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['LinkedInSession', 'Auth'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({
        url: '/api/auth/login',
        method: 'POST',
        body,
      }),
    }),
    getAdminMe: builder.query({
      query: () => '/api/auth/me',
      providesTags: ['Auth'],
    }),
    getHealth: builder.query({
      query: () => '/health',
    }),
    getLinkedInSession: builder.query({
      query: () => '/api/linkedin-session/status',
      providesTags: ['LinkedInSession'],
    }),
    disconnectLinkedIn: builder.mutation({
      query: () => ({
        url: '/api/linkedin-session/disconnect',
        method: 'POST',
      }),
      invalidatesTags: ['LinkedInSession'],
    }),
    // Screenshots each URL and returns its CDN url. Nothing is persisted.
    processPosts: builder.mutation({
      query: (body) => ({
        url: '/api/process',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetAdminMeQuery,
  useGetHealthQuery,
  useGetLinkedInSessionQuery,
  useDisconnectLinkedInMutation,
  useProcessPostsMutation,
} = api;

export default api;
