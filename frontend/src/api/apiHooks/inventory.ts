import { apiSlice } from '../apiSlice';
import { TListProduct } from './product';
import type { ApiResponse } from '../types';

export type InventoryUsageChoice = 'PURCHASE' | 'MEMO' | 'RENT';
export type InventoryRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED';

export interface InventoryRequestPayload {
  requiredProducts?: number;
  usageChoice: InventoryUsageChoice;
  styleCode: string;
  preferredUsageNote?: string;
  remark?: string;
}

export interface InventoryAssignPayload {
  productId: string;
  jewelerId: string;
  usageChoice: InventoryUsageChoice;
  remark?: string;
}

export interface InventoryStatusPayload {
  status: InventoryRequestStatus;
  remark?: string;
}

export interface InventoryListPayload {
  page?: number;
  limit?: number;
  status?: InventoryRequestStatus;
  requestedBy?: string;
}

type InventoryListResponse = {
  status_code?: number;
  data?: {
    data?: Record<string, unknown>[];
    count?: number;
    page?: number;
    limit?: number;
  };
  message?: string;
};

type InventoryResponse = {
  status_code?: number;
  data?: Record<string, unknown>;
  message?: string;
};

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listInventory: builder.mutation<ApiResponse, TListProduct>({
      query: (body) => ({
        url: '/inventory/list',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    listInventoryRequests: builder.query<InventoryListResponse, InventoryListPayload>({
      query: (body) => ({ url: '/inventory/request/list', method: 'POST', body }),
      providesTags: ['Inventory'],
    }),
    createInventoryRequest: builder.mutation<InventoryResponse, InventoryRequestPayload>({
      query: (body) => ({ url: '/inventory/request', method: 'POST', body }),
      invalidatesTags: ['Inventory'],
    }),
    updateInventoryRequestStatus: builder.mutation<InventoryResponse, { id: string; payload: InventoryStatusPayload }>({
      query: ({ id, payload }) => ({ url: `/inventory/request/${id}/status`, method: 'PATCH', body: payload }),
      invalidatesTags: ['Inventory'],
    }),
    assignProductToRequest: builder.mutation<InventoryResponse, { id: string; payload: InventoryAssignPayload }>({
      query: ({ id, payload }) => ({ url: `/inventory/request/${id}/assign`, method: 'POST', body: payload }),
      invalidatesTags: ['Inventory'],
    }),
    listAvailableProducts: builder.mutation<InventoryListResponse, { page?: number; limit?: number; styleCode?: string; includeAssignments?: boolean }>({
      query: (body) => ({ url: '/inventory/available', method: 'POST', body }),
    }),
  }),
});

export const { useListInventoryRequestsQuery, useCreateInventoryRequestMutation, useUpdateInventoryRequestStatusMutation, useAssignProductToRequestMutation, useListAvailableProductsMutation, useListInventoryMutation } = inventoryApi;
