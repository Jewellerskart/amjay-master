import { apiSlice } from '../apiSlice'
import type { ApiResponse, PaginatedResult } from '../types'

type InvoicePayload = {
  invoice?: Record<string, unknown>
}

export type InvoiceCommissionBreakdownItem = {
  componentKey: string
  baseAmount: number
  rate: number
  deductionAmount: number
}

export type InvoiceListItem = {
  _id: string
  productId: string
  userEmail: string
  userPhone: string
  amount: number
  grossAmount?: number
  taxAmount?: number
  taxPercent?: number
  commissionTotal?: number
  commissionBreakdown?: InvoiceCommissionBreakdownItem[]
  status: string
  type: string
  createdAt?: string
  updatedAt?: string
  liveRateAtCreation?: number | null
  product?: Record<string, unknown> | null
  productSnapshot?: Record<string, unknown> | null
}

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createInvoice: builder.mutation<ApiResponse<InvoicePayload>, Record<string, unknown>>({
      query: (body) => ({ url: '/invoice', method: 'POST', body }),
      invalidatesTags: ['Invoice'],
    }),
    approveInvoice: builder.mutation<ApiResponse<InvoicePayload>, string>({
      query: (invoiceId) => ({ url: `/invoice/${invoiceId}/approve`, method: 'PATCH' }),
      invalidatesTags: ['Invoice'],
    }),
    listInvoices: builder.mutation<
      ApiResponse<PaginatedResult<InvoiceListItem>>,
      { page?: number; limit?: number; status?: string; type?: string; userEmail?: string }
    >({
      query: (body) => ({ url: '/invoice/list', method: 'POST', body }),
      invalidatesTags: ['Invoice'],
    }),
    fetchInvoice: builder.query<ApiResponse<InvoicePayload>, string>({
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
