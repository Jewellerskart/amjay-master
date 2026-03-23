import { apiSlice } from '../apiSlice'

type ITicketResponse = {
  status_code?: number
  data?: {
    ticket?: any
    data?: any[]
    count?: number
  }
  message?: string
}

export const ticketApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createTicket: builder.mutation<ITicketResponse, any>({
      query: (body) => ({ url: '/ticket/purchase', method: 'POST', body }),
      invalidatesTags: ['Ticket'],
    }),
    listTickets: builder.query<ITicketResponse, any>({
      query: (body) => ({ url: '/ticket/list', method: 'POST', body }),
      providesTags: ['Ticket'],
    }),
    updateTicket: builder.mutation<ITicketResponse, { ticketId: string; status: string }>({
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
