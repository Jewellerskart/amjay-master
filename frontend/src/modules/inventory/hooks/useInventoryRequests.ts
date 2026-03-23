import { useCallback, useMemo, useState } from 'react';
import { useAssignProductToRequestMutation, useCreateInventoryRequestMutation, useListAvailableProductsMutation, useListInventoryRequestsQuery, useUpdateInventoryRequestStatusMutation } from '@api/apiHooks/inventory';
import { InventoryRequestRecord, InventoryRequestStatus, InventoryUsageChoice } from '.';

const mapToRequest = (item: any): InventoryRequestRecord => ({
  _id: `${item?._id || item?.id || ''}`,
  styleCode: `${item?.styleCode || ''}`,
  requestedBy: `${item?.requestedBy || ''}`,
  requiredProducts: Number(item?.requiredProducts ?? 1),
  usageChoice: `${item?.usageChoice || 'PURCHASE'}` as InventoryUsageChoice,
  preferredUsageNote: item?.preferredUsageNote || '',
  remark: item?.remark || '',
  status: `${item?.status || 'OPEN'}` as InventoryRequestStatus,
  assignedProductId: `${item?.assignedProductId || ''}` || undefined,
  assignedTo: `${item?.assignedTo || ''}` || undefined,
  assignedAt: item?.assignedAt ? `${item.assignedAt}` : undefined,
  createdAt: item?.createdAt ? `${item.createdAt}` : undefined,
  updatedAt: item?.updatedAt ? `${item.updatedAt}` : undefined,
});

export const useInventoryRequests = (requestedBy?: string) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<InventoryRequestStatus | ''>('');
  const params = { page, limit, status: statusFilter || undefined, requestedBy };
  const { data, isFetching, refetch } = useListInventoryRequestsQuery(params, { refetchOnMountOrArgChange: true });

  const [createInventoryRequest, { isLoading: isCreatingRequest }] = useCreateInventoryRequestMutation();
  const [updateInventoryRequestStatus, { isLoading: isUpdatingStatus }] = useUpdateInventoryRequestStatusMutation();
  const [assignProductToRequest, { isLoading: isAssigningProduct }] = useAssignProductToRequestMutation();
  const [listAvailableProducts, { isLoading: isLoadingAvailable }] = useListAvailableProductsMutation();

  const [availableProducts, setAvailableProducts] = useState<
    { id: string; jewelCode: string; styleCode: string; status: string; holder?: string; holderRole?: string; origin?: string }
  >([]);

  const requests = useMemo(() => {
    const rows = Array.isArray(data?.data?.data) ? data.data.data : [];
    return rows.map(mapToRequest).filter((item) => item._id);
  }, [data]);

  const total = Number(data?.data?.count ?? 0);

  const stats = useMemo(() => {
    const summary: Record<InventoryRequestStatus, number> = { OPEN: 0, IN_PROGRESS: 0, FULFILLED: 0, CANCELLED: 0 };
    requests.forEach((request) => {
      summary[request.status] = (summary[request.status] || 0) + 1;
    });
    return summary;
  }, [requests]);

  const loadAvailableProducts = useCallback(
    async (params: { page?: number; limit?: number; styleCode?: string } = {}) => {
      try {
        const response = await listAvailableProducts({
          ...params,
          styleCode: params.styleCode ? params.styleCode.toUpperCase() : undefined,
        }).unwrap();
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
        const mapped = rows
          .map((item: any) => ({
            id: `${item?._id || ''}`,
            jewelCode: `${item?.product?.jewelCode || ''}`,
            styleCode: `${item?.product?.styleCode || ''}`,
            status: `${item?.status || ''}`,
            holder: item?.currentHolder?.name || item?.currentHolder?.role || '',
            holderRole: item?.currentHolder?.role || '',
            origin: `${item?.origin || 'root'}`,
          }))
          .filter((item) => item.id);
        setAvailableProducts(mapped);
        return mapped;
      } catch {
        setAvailableProducts([]);
        return [];
      }
    },
    [listAvailableProducts],
  );

  return {
    requests,
    total,
    stats,
    page,
    limit,
    setPage,
    setLimit,
    statusFilter,
    setStatusFilter,
    isLoadingRequests: isFetching,
    refetchRequests: refetch,
    createInventoryRequest,
    isCreatingRequest,
    updateInventoryRequestStatus,
    isUpdatingStatus,
    assignProductToRequest,
    isAssigningProduct,
    availableProducts,
    loadAvailableProducts,
    isLoadingAvailable,
  };
};
