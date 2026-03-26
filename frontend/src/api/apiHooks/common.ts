import { apiSlice } from '../apiSlice';
import type { ApiResponse } from '../types';

export const commonApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    postCms: builder.mutation<ApiResponse, Record<string, unknown>>({
      query: (data) => ({
        url: '/c-r-c/cms/all-cms',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { usePostCmsMutation } = commonApi;
