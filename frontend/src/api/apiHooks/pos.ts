import { apiSlice } from '../apiSlice'

type IPosResponse = {
  status_code?: number
  data?: {
    invoice?: any
    product?: any
  }
  message?: string
}

export const posApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sellProduct: builder.mutation<IPosResponse, { productId: string; jewelerId: string; salePrice: number; choice: 'PURCHASE' | 'RENT' }>({
      query: (body) => ({ url: '/pos/sell', method: 'POST', body }),
      invalidatesTags: ['Pos', 'Product', 'Invoice', 'Ticket'],
    }),
  }),
})

export const { useSellProductMutation } = posApi
