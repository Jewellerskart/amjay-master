import { apiSlice } from '../apiSlice'

type IWalletResponse = {
  status_code?: number
  data?: {
    wallet?: { walletBalance?: number; creditLimit?: number; usedCredit?: number }
  }
  message?: string
}

export const walletApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyWallet: builder.query<IWalletResponse, void>({
      query: () => ({ url: '/wallet/me', method: 'GET' }),
      providesTags: ['Wallet'],
    }),
    getWalletByUser: builder.query<IWalletResponse, string>({
      query: (userId) => ({ url: `/wallet/${userId}`, method: 'GET' }),
      providesTags: ['Wallet'],
    }),
    updateWallet: builder.mutation<
      IWalletResponse,
      { userId: string; walletBalance?: number; creditLimit?: number; usedCredit?: number }
    >({
      query: ({ userId, ...payload }) => ({
        url: `/wallet/${userId}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['Wallet'],
    }),
  }),
})

export const { useGetMyWalletQuery, useGetWalletByUserQuery, useUpdateWalletMutation } = walletApi
