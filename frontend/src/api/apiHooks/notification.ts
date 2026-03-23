import { apiSlice } from '../apiSlice';

type TApiResponse = { status_code?: number; data?: any; message?: string; success?: boolean };

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminNotifications: builder.query<TApiResponse, void>({
      query: () => ({
        url: '/notification/admin',
        method: 'GET',
      }),
      providesTags: ['Notification'],
    }),
  }),
});

export const { useGetAdminNotificationsQuery } = notificationApi;
