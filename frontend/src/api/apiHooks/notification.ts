import { apiSlice } from '../apiSlice';
import type { ApiResponse } from '../types';

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminNotifications: builder.query<ApiResponse, void>({
      query: () => ({
        url: '/notification/admin',
        method: 'GET',
      }),
      providesTags: ['Notification'],
    }),
  }),
});

export const { useGetAdminNotificationsQuery } = notificationApi;
