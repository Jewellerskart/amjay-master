import { apiSlice } from '../apiSlice'
import type { ApiResponse } from '../types'

type WalletPayload = {
  wallet?: { walletBalance?: number; creditLimit?: number; usedCredit?: number }
}

export const walletApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyWallet: builder.query<ApiResponse<WalletPayload>, void>({
      query: () => ({ url: '/wallet/me', method: 'GET' }),
      providesTags: ['Wallet'],
    }),
    getWalletByUser: builder.query<ApiResponse<WalletPayload>, string>({
      query: (userId) => ({ url: `/wallet/${userId}`, method: 'GET' }),
      providesTags: ['Wallet'],
    }),
    updateWallet: builder.mutation<
      ApiResponse<WalletPayload>,
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
