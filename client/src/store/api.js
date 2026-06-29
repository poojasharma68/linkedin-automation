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

function normalizePostsArg(arg) {
  if (typeof arg === 'string' || arg == null) {
    return { category: arg, programme: undefined };
  }
  return { category: arg.category, programme: arg.programme };
}

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
  tagTypes: ['Posts', 'Categories', 'LinkedInSession', 'Auth'],
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
    startLinkedInLogin: builder.mutation({
      query: () => ({
        url: '/api/linkedin-session/login',
        method: 'POST',
      }),
      invalidatesTags: ['LinkedInSession'],
    }),
    getCategories: builder.query({
      query: () => '/api/categories',
      providesTags: ['Categories'],
    }),
    createCategory: builder.mutation({
      query: (body) => ({
        url: '/api/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Categories'],
    }),
    updateCategory: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Categories', 'Posts'],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/api/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Categories', 'Posts'],
    }),
    getAllPosts: builder.query({
      query: (arg) => {
        const { category, programme } = normalizePostsArg(arg);
        const params = new URLSearchParams();
        if (category && category !== 'all') params.set('category', category);
        if (programme && programme !== 'all') params.set('programme', programme);
        const qs = params.toString();
        return `/api/process/posts${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Posts'],
    }),
    processPosts: builder.mutation({
      query: (body) => ({
        url: '/api/process',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Posts'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetAdminMeQuery,
  useGetHealthQuery,
  useGetLinkedInSessionQuery,
  useStartLinkedInLoginMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetAllPostsQuery,
  useProcessPostsMutation,
} = api;

export default api;
