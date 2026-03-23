import { apiSlice } from '../apiSlice'

type IInvoiceResponse = {
  status_code?: number
  data?: {
    invoice?: any
  }
  message?: string
}

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createInvoice: builder.mutation<IInvoiceResponse, any>({
      query: (body) => ({ url: '/invoice', method: 'POST', body }),
      invalidatesTags: ['Invoice'],
    }),
    approveInvoice: builder.mutation<IInvoiceResponse, string>({
      query: (invoiceId) => ({ url: `/invoice/${invoiceId}/approve`, method: 'PATCH' }),
      invalidatesTags: ['Invoice'],
    }),
    listInvoices: builder.mutation<
      {
        status_code?: number
        data?: { data: any[]; count: number; page: number; limit: number; totalAmount?: number }
      },
      { page?: number; limit?: number; status?: string; type?: string; userEmail?: string }
    >({
      query: (body) => ({ url: '/invoice/list', method: 'POST', body }),
      invalidatesTags: ['Invoice'],
    }),
    fetchInvoice: builder.query<IInvoiceResponse, string>({
      query: (invoiceId) => ({ url: `/invoice/${invoiceId}`, method: 'GET' }),
      providesTags: ['Invoice'],
    }),
  }),
})

export const {
  useCreateInvoiceMutation,
  useApproveInvoiceMutation,
  useListInvoicesMutation,
  useFetchInvoiceQuery,
} = invoiceApi
