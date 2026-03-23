import { apiSlice } from '../apiSlice';

type TApiResponse = { status_code?: number; data?: any; message?: string; success?: boolean };

export const contactAdminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createContactQuery: builder.mutation<
      TApiResponse,
      {
        subject: string;
        message: string;
        queryType?: 'general' | 'product-request';
        productRequest?: {
          productRefId?: string;
          preferredProductName?: string;
          preferredColor?: string;
          preferredCut?: string;
          preferredCarat?: number;
          qty?: number;
          budgetPerCarat?: number;
        };
        priority?: 'low' | 'medium' | 'high';
        deadlineAt?: string;
        documents?: File[];
      }
    >({
      query: ({ subject, message, queryType, productRequest, priority, deadlineAt, documents = [] }) => {
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('message', message);
        if (queryType) formData.append('queryType', queryType);
        if (productRequest) formData.append('productRequest', JSON.stringify(productRequest));
        if (priority) formData.append('priority', priority);
        if (deadlineAt) formData.append('deadlineAt', deadlineAt);
        documents.forEach((file) => formData.append('documents', file));
        return {
          url: '/contact-admin/query',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Contact', 'Notification'],
    }),
    getMyContactQueries: builder.query<TApiResponse, void>({
      query: () => ({
        url: '/contact-admin/query/my',
        method: 'GET',
      }),
      providesTags: ['Contact'],
    }),
    getAllContactQueries: builder.mutation<
      TApiResponse,
      { status?: string; search?: string; startDate?: string; endDate?: string; page?: number; limit?: number }
    >({
      query: (body) => ({
        url: '/contact-admin/query/all',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Contact'],
    }),
    getAssignableContactUsers: builder.query<TApiResponse, void>({
      query: () => ({
        url: '/contact-admin/query/assignees',
        method: 'GET',
      }),
      providesTags: ['Contact'],
    }),
    updateContactQueryStatus: builder.mutation<
      TApiResponse,
      { id: string; status: string; remark?: string; deadlineAt?: string; assignedToUserId?: string | null }
    >({
      query: ({ id, ...body }) => ({
        url: `/contact-admin/query/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Contact', 'Notification'],
    }),
  }),
});

export const {
  useCreateContactQueryMutation,
  useGetMyContactQueriesQuery,
  useGetAllContactQueriesMutation,
  useGetAssignableContactUsersQuery,
  useUpdateContactQueryStatusMutation,
} = contactAdminApi;
