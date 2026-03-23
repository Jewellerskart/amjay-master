import { BACKEND_API_URL } from '@variable';
import { apiSlice } from '../apiSlice';
import type { TApiResponse } from '@types';

const baseUrl = `${BACKEND_API_URL}/api/v1`;

export const commonApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    postCms: builder.mutation<TApiResponse, Record<string, unknown>>({
      query: (data) => ({
        url: `${baseUrl}/c-r-c/cms/all-cms`,
        method: 'POST',
        body: data,
        credentials: 'include',
      }),
    }),
  }),
});

export const { usePostCmsMutation } = commonApi;
