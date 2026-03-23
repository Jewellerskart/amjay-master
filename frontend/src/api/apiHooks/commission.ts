import { apiSlice } from '../apiSlice'

type ICommissionResponse = {
  status_code?: number
  data?: {
    commissions?: any[]
    commission?: any
  }
  message?: string
}

export const commissionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createCommission: builder.mutation<ICommissionResponse, any>({
      query: (body) => ({ url: '/commission', method: 'POST', body }),
      invalidatesTags: ['Commission'],
    }),
    getCommissionsByUser: builder.query<ICommissionResponse, string>({
      query: (userId) => ({ url: `/commission/user/${userId}`, method: 'GET' }),
      providesTags: ['Commission'],
    }),
    getCommissionsByInvoice: builder.query<ICommissionResponse, string>({
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
