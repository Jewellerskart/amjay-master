import { apiSlice } from '../apiSlice'
import type { ApiResponse } from '../types'

type CommissionPayload = {
  commissions?: Array<Record<string, any>>
  commission?: Record<string, any>
}

export const commissionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createCommission: builder.mutation<ApiResponse<CommissionPayload>, Record<string, unknown>>({
      query: (body) => ({ url: '/commission', method: 'POST', body }),
      invalidatesTags: ['Commission'],
    }),
    getCommissionsByUser: builder.query<ApiResponse<CommissionPayload>, string>({
      query: (userId) => ({ url: `/commission/user/${userId}`, method: 'GET' }),
      providesTags: ['Commission'],
    }),
    getCommissionsByInvoice: builder.query<ApiResponse<CommissionPayload>, string>({
      query: (invoiceId) => ({ url: `/commission/invoice/${invoiceId}`, method: 'GET' }),
      providesTags: ['Commission'],
    }),
  }),
})

export const {
  useCreateCommissionMutation,
  useGetCommissionsByUserQuery,
  useGetCommissionsByInvoiceQuery,
} = commissionApi
