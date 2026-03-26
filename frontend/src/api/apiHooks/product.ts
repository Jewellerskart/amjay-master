import { apiSlice } from '../apiSlice';
import type { ApiResponse } from '../types';

type JsonRecord = Record<string, unknown>;
export type TListProduct = {
  page?: number;
  limit?: number;
  search?: string;
  usageType?: 'owner' | 'assigned' | 'pending' | 'rejected' | 'outright' | 'memo' | 'rented' | '';
  group?: string;
  subCategory?: string;
  metals?: string;
  baseQualities?: string;
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
  sortBy?: 'createdAt' | 'jewelCode' | 'styleCode' | 'qty' | 'weight' | 'price' | 'livePrice';
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
type IAcceptAssignedProduct = { id: string; mode: 'memo' | 'rent' | 'outright'; remark?: string };
export const apiHooks = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createProduct: builder.mutation<ApiResponse, JsonRecord>({
      query: (body) => ({ url: '/product', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    listProducts: builder.mutation<ApiResponse, TListProduct>({
      query: (body) => ({
        url: '/product/list',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    listMarketplaceProducts: builder.mutation<ApiResponse, TListProduct>({
      query: (body) => ({
        url: '/product/marketplace/list',
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
        responseHandler: (response: Response) => response.blob(),
      }),
    }),
    exportProductSample: builder.query<Blob, void>({
      query: () => ({
        url: '/product/export/sample',
        method: 'GET',
        responseHandler: (response: Response) => response.blob(),
      }),
    }),
    bulkDeleteProducts: builder.mutation<ApiResponse, { ids: string[] }>({
      query: (body) => ({
        url: '/product/bulk-delete',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    getProductFilter: builder.query<ApiResponse, void>({
      query: () => ({
        url: `/product/filter`,
        method: 'GET',
      }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<ApiResponse, string>({
      query: (id) => ({ url: `/product/${id}`, method: 'GET' }),
      providesTags: ['Product'],
    }),
    updateProduct: builder.mutation<ApiResponse, { id: string; payload: JsonRecord }>({
      query: ({ id, payload }) => ({
        url: `/product/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProductById: builder.mutation<ApiResponse, string>({
      query: (id) => ({ url: `/product/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    assignProductToJeweler: builder.mutation<ApiResponse, TAssignProduct>({
      query: ({ id, ...body }) => ({
        url: `/product/${id}/assign-to-jeweler`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    previewAssignProduct: builder.mutation<ApiResponse, { id: string; jewelerId: string }>({
      query: ({ id, jewelerId }) => ({
        url: `/product/${id}/assign-preview/${jewelerId}`,
        method: 'GET',
      }),
    }),

    acceptAssignedProduct: builder.mutation<ApiResponse, IAcceptAssignedProduct>({
      query: ({ id, ...body }) => ({
        url: `/product/${id}/accept-assignment`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    rejectAssignedProduct: builder.mutation<ApiResponse, { id: string; remark?: string }>({
      query: ({ id, ...body }) => ({
        url: `/product/${id}/reject-assignment`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product'],
    }),

    createDiamondRateChart: builder.mutation<ApiResponse, JsonRecord>({
      query: (body) => ({ url: '/product/diamond-rate-chart', method: 'POST', body }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    listDiamondRateChart: builder.mutation<ApiResponse, TListDiamondRateChart>({
      query: (body) => ({ url: '/product/diamond-rate-chart/list', method: 'POST', body }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    getDiamondRateChartById: builder.query<ApiResponse, string>({
      query: (id) => ({ url: `/product/diamond-rate-chart/${id}`, method: 'GET' }),
      providesTags: ['DiamondRateChart'],
    }),
    updateDiamondRateChart: builder.mutation<ApiResponse, { id: string; payload: JsonRecord }>({
      query: ({ id, payload }) => ({
        url: `/product/diamond-rate-chart/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    deleteDiamondRateChart: builder.mutation<ApiResponse, string>({
      query: (id) => ({ url: `/product/diamond-rate-chart/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DiamondRateChart'],
    }),
    matchDiamondRateChart: builder.query<ApiResponse, { carat: number; clarity?: string; shape?: string }>({
      query: ({ carat, clarity, shape }) => ({
        url: '/product/diamond-rate-chart/match',
        method: 'GET',
        params: { carat, clarity, shape },
      }),
      providesTags: ['DiamondRateChart'],
    }),
    listMissingDiamondRates: builder.query<ApiResponse, void>({
      query: () => ({
        url: '/product/diamond-rate-chart/missing',
        method: 'GET',
      }),
      providesTags: ['DiamondRateChart'],
    }),
    createOtherRateChart: builder.mutation<ApiResponse, JsonRecord>({
      query: (body) => ({ url: '/product/other-rate-chart', method: 'POST', body }),
      invalidatesTags: ['OtherRateChart'],
    }),
    listOtherRateChart: builder.mutation<ApiResponse, TListOtherRateChart>({
      query: (body) => ({ url: '/product/other-rate-chart/list', method: 'POST', body }),
      invalidatesTags: ['OtherRateChart'],
    }),
    getOtherRateChartById: builder.query<ApiResponse, string>({
      query: (id) => ({ url: `/product/other-rate-chart/${id}`, method: 'GET' }),
      providesTags: ['OtherRateChart'],
    }),
    updateOtherRateChart: builder.mutation<ApiResponse, { id: string; payload: JsonRecord }>({
      query: ({ id, payload }) => ({
        url: `/product/other-rate-chart/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['OtherRateChart'],
    }),
    deleteOtherRateChart: builder.mutation<ApiResponse, string>({
      query: (id) => ({ url: `/product/other-rate-chart/${id}`, method: 'DELETE' }),
      invalidatesTags: ['OtherRateChart'],
    }),
  }),
});

export const {
  useCreateProductMutation,
  useListProductsMutation,
  useListMarketplaceProductsMutation,
  useGetProductByIdQuery,
  useUpdateProductMutation,
  useDeleteProductByIdMutation,
  useAssignProductToJewelerMutation,
  usePreviewAssignProductMutation,

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
