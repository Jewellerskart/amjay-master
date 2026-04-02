import { apiSlice } from '../apiSlice'
import type { ApiResponse } from '../types'

type PosPayload = {
  invoice?: {
    _id?: string
    status?: string
    amount?: number
    grossAmount?: number
    taxAmount?: number
    taxPercent?: number
    commissionTotal?: number
  }
  product?: Record<string, unknown>
}

export type PosReportMetrics = {
  soldCount: number
  soldOutrightCount: number
  soldMemoCount: number
  activeMemoCount: number
  activeOutrightCount: number
  avgMemoDays: number
  maxMemoDays: number
  totalGrossSales: number
  totalNetPayable: number
  totalCommissionDeduction: number
  pendingInvoiceCount: number
  pendingInvoiceAmount: number
}

export type PosRecentTransaction = {
  _id: string
  invoiceId: string
  choice: 'PURCHASE' | 'MEMO'
  createdAt?: string | null
  amount: number
  finalPrice: number
  commissionDeduction: number
  jewelCode: string
  styleCode: string
  jewelerName: string
  jewelerBusinessName?: string
}

export type PosMemoAgingItem = {
  _id: string
  jewelCode: string
  styleCode: string
  holderName: string
  holderBusinessName?: string
  memoDays: number
  memoSince?: string | null
}

type PosReportPayload = {
  metrics: PosReportMetrics
  recentTransactions: PosRecentTransaction[]
  memoAging: PosMemoAgingItem[]
}

export const posApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sellProduct: builder.mutation<ApiResponse<PosPayload>, { productId: string; jewelerId: string; salePrice: number; choice: 'PURCHASE' | 'MEMO' | 'RENT' }>({
      query: (body) => ({ url: '/pos/sell', method: 'POST', body }),
      invalidatesTags: ['Pos', 'Product', 'Invoice', 'Ticket'],
    }),
    getPosReport: builder.query<ApiResponse<PosReportPayload>, { limit?: number } | void>({
      query: (params) => ({
        url: '/pos/report',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Pos', 'Invoice', 'Product'],
    }),
  }),
})

export const { useSellProductMutation, useGetPosReportQuery } = posApi
