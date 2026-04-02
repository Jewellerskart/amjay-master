import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import toast from 'react-hot-toast';
import { BACKEND_API_URL } from '@shared/config/environment';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${BACKEND_API_URL}/api/v1`,
  credentials: 'include',
});

let lastSessionExpiryToastAt = 0;
const showSessionExpiredToast = () => {
  const now = Date.now();
  if (now - lastSessionExpiryToastAt < 4000) return;
  lastSessionExpiryToastAt = now;
  toast.error('Session expired. Please login again.');
};

const baseQueryWithReauth = async (args: unknown, api: unknown, extraOptions: unknown) => {
  let result: any = await rawBaseQuery(args as any, api as any, extraOptions as any);

  if (result?.error?.status === 401) {
    const refreshResult: any = await rawBaseQuery(
      { url: '/refresh-token', method: 'POST' },
      api as any,
      extraOptions as any,
    );

    if (refreshResult?.data?.status_code === 200 || refreshResult?.data?.success) {
      result = await rawBaseQuery(args as any, api as any, extraOptions as any);
    } else {
      showSessionExpiredToast();
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth as any,
  tagTypes: [
    'Auth',
    'Coupon',
    'User',
    'Contact',
    'Notification',
    'Product',
    'DiamondRateChart',
    'OtherRateChart',
    'Wallet',
    'Commission',
    'Invoice',
    'Ticket',
    'Pos',
    'Inventory',
  ],
  endpoints: () => ({}),
});
