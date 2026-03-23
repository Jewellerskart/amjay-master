import { apiSlice } from '../apiSlice';

type TApiResponse = { status_code?: number; data?: any; message?: string; success?: boolean };
export type TListProduct = {
  page?: number;
  limit?: number;
  search?: string;
  usageType?: 'owner' | 'assigned' | 'pending' | 'rejected' | 'outright' | 'rented' | '';
  group?: string;
  subCategory?: string;
  metals?: string;
  diamonds?: string;
  minWeight?: number;
  maxWeight?: number;
  minPrice?: number;
  maxPrice?: number;
  distributorId?: string;
  status?: string;
  holderRole?: 'super-admin' | 'admin' | 'distributor' | 'jeweler' | '';
  currentHolderUserId?: string;
  startDate?: string;
  endDate?: string;
  includeAssignedClones?: boolean;
  includePending?: boolean;
  sortBy?: 'createdAt' | 'jewelCode' | 'qty' | 'weight' | 'price';
  sortDir?: 'asc' | 'desc';
};
type TAssignProduct = {
  id: string;
  toUserId: string;
  quantity: number;
  remark?: string;
  fromRole?: string;
  fromName?: string;
  fromBusinessName?: string;
};
type TListDiamondRateChart = {
  page?: number;
  limit?: number;
  clarity?: string;
  shape?: string;
  size?: string;
  isActive?: boolean;
};
type TListOtherRateChart = {
  page?: number;
  limit?: number;
  name?: string;
  category?: string;
  isActive?: boolean;
};
type IAcceptAssignedProduct = { id: string; mode: 'rent' | 'outright'; remark?: string };
export const apiHooks = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createProduct: builder.mutation<TApiResponse, any>({
      query: (body) => ({ url: '/product', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    listProducts: builder.mutation<TApiResponse, TListProduct>({
      query: (body) => ({
        url: '/product/list',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    exportProducts: builder.mutation<Blob, Partial<TListProduct>>({
      query: (body) => ({
        url: '/product/export',
        method: 'POST',
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportProductSample: builder.query<Blob, void>({
      query: () => ({
        url: '/product/export/sample',
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
    bulkDeleteProducts: builder.mutation<TApiResponse, { ids: string[] }>({
      query: (body) => ({
        url: '/product/bulk-delete',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    getProductFilter: builder.query<TApiResponse, void>({
      query: () => ({
        url: `/product/filter`,
        method: 'GET',
      }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<TApiResponse, string>({
      query: (id) => ({ url: `/product/${id}`, method: 'GET' }),
      providesTags: ['Product'],
    }),
    updateProduct: builder.mutation<TApiResponse, { id: string; payload: any }>({
      query: ({ id, payload }) => ({
        url: `/product/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProductById: builder.mutation<TApiResponse, string>({
      query: (id) => ({ url: `/product/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    assignProductToJeweler: builder.mutation<TApiResponse, TAssignProduct>({
      query: ({ id, ...body }) => ({
        url: `/product/${id}/assign-to-jeweler`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product'],
    }),

    acceptAssignedProduct: builder.mutation<TApiResponse, IAcceptAssignedProduct>({
      query: ({ id, ...body }) => ({
        url: `/product/${id}/accept-assignment`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    rejectAssignedProduct: builder.mutation<TApiResponse, { id: string; remark?: string }>({
      query: ({ id, ...body }) => ({
        url: `/product/${id}/reject-assignment`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product'],
    }),

    createDiamondRateChart: builder.mutation<TApiResponse, any>({
      query: (body) => ({ url: '/product/diamond-rate-chart', method: 'POST', body }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    listDiamondRateChart: builder.mutation<TApiResponse, TListDiamondRateChart>({
      query: (body) => ({ url: '/product/diamond-rate-chart/list', method: 'POST', body }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    getDiamondRateChartById: builder.query<TApiResponse, string>({
      query: (id) => ({ url: `/product/diamond-rate-chart/${id}`, method: 'GET' }),
      providesTags: ['DiamondRateChart'],
    }),
    updateDiamondRateChart: builder.mutation<TApiResponse, { id: string; payload: any }>({
      query: ({ id, payload }) => ({
        url: `/product/diamond-rate-chart/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    deleteDiamondRateChart: builder.mutation<TApiResponse, string>({
      query: (id) => ({ url: `/product/diamond-rate-chart/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    matchDiamondRateChart: builder.query<TApiResponse, { carat: number; clarity?: string; shape?: string }>({
      query: ({ carat, clarity, shape }) => ({
        url: '/product/diamond-rate-chart/match',
        method: 'GET',
        params: { carat, clarity, shape },
      }),
      providesTags: ['DiamondRateChart'],
    }),
    listMissingDiamondRates: builder.query<TApiResponse, void>({
      query: () => ({
        url: '/product/diamond-rate-chart/missing',
        method: 'GET',
      }),
      providesTags: ['DiamondRateChart'],
    }),
    createOtherRateChart: builder.mutation<TApiResponse, any>({
      query: (body) => ({ url: '/product/other-rate-chart', method: 'POST', body }),
      invalidatesTags: ['OtherRateChart'],
    }),
    listOtherRateChart: builder.mutation<TApiResponse, TListOtherRateChart>({
      query: (body) => ({ url: '/product/other-rate-chart/list', method: 'POST', body }),
      invalidatesTags: ['OtherRateChart'],
    }),
    getOtherRateChartById: builder.query<TApiResponse, string>({
      query: (id) => ({ url: `/product/other-rate-chart/${id}`, method: 'GET' }),
      providesTags: ['OtherRateChart'],
    }),
    updateOtherRateChart: builder.mutation<TApiResponse, { id: string; payload: any }>({
      query: ({ id, payload }) => ({
        url: `/product/other-rate-chart/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['OtherRateChart'],
    }),
    deleteOtherRateChart: builder.mutation<TApiResponse, string>({
      query: (id) => ({ url: `/product/other-rate-chart/${id}`, method: 'DELETE' }),
      invalidatesTags: ['OtherRateChart'],
    }),
  }),
});

export const {
  useCreateProductMutation,
  useListProductsMutation,
  useGetProductByIdQuery,
  useUpdateProductMutation,
  useDeleteProductByIdMutation,
  useAssignProductToJewelerMutation,

  useCreateDiamondRateChartMutation,
  useListDiamondRateChartMutation,
  useGetDiamondRateChartByIdQuery,
  useUpdateDiamondRateChartMutation,
  useDeleteDiamondRateChartMutation,
  useMatchDiamondRateChartQuery,
  useListMissingDiamondRatesQuery,
  useAcceptAssignedProductMutation,
  useRejectAssignedProductMutation,
  useExportProductsMutation,
  useExportProductSampleQuery,
  useLazyExportProductSampleQuery,
  useBulkDeleteProductsMutation,
  useGetProductFilterQuery,
  useCreateOtherRateChartMutation,
  useListOtherRateChartMutation,
  useGetOtherRateChartByIdQuery,
  useUpdateOtherRateChartMutation,
  useDeleteOtherRateChartMutation,
} = apiHooks;
