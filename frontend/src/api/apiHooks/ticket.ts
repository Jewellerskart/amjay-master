import { apiSlice } from '../apiSlice'
import type { ApiResponse } from '../types'

type TicketRecord = {
  _id: string
  status: string
  priority: string
  createdAt: string
  [key: string]: any
}

type TicketPayload = {
  ticket?: TicketRecord
  data?: TicketRecord[]
  count?: number
}

export const ticketApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createTicket: builder.mutation<ApiResponse<TicketPayload>, Record<string, unknown>>({
      query: (body) => ({ url: '/ticket/purchase', method: 'POST', body }),
      invalidatesTags: ['Ticket'],
    }),
    listTickets: builder.query<ApiResponse<TicketPayload>, Record<string, unknown>>({
      query: (body) => ({ url: '/ticket/list', method: 'POST', body }),
      providesTags: ['Ticket'],
    }),
    updateTicket: builder.mutation<ApiResponse<TicketPayload>, { ticketId: string; status: string }>({
      query: ({ ticketId, status }) => ({
        url: `/ticket/${ticketId}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Ticket'],
    }),
  }),
})

export const { useCreateTicketMutation, useListTicketsQuery, useUpdateTicketMutation } = ticketApi
