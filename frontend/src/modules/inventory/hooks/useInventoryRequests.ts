import { useCallback, useMemo, useState } from 'react';
import { useAssignProductToRequestMutation, useCreateInventoryRequestMutation, useListAvailableProductsMutation, useListInventoryRequestsQuery, useUpdateInventoryRequestStatusMutation } from '@api/apiHooks/inventory';
import { InventoryRequestRecord, InventoryRequestStatus, InventoryUsageChoice } from '.';

const toStringId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
    return `${(value as Record<string, unknown>)._id || ''}`.trim();
  }
  return `${value || ''}`.trim();
};

const toDisplayName = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  const row = value as Record<string, unknown>;
  const firstName = `${row.firstName || ''}`.trim();
  const lastName = `${row.lastName || ''}`.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const businessName = `${row.businessName || ''}`.trim();
  const email = `${row.email || ''}`.trim();
  return fullName || businessName || email;
};

const normalizeAssignedProductIds = (item: any): string[] => {
  const source = [
    ...(Array.isArray(item?.assignedProductIds) ? item.assignedProductIds : []),
    item?.assignedProductId,
  ];
  const ids: string[] = [];
  const seen = new Set<string>();
  source.forEach((raw) => {
    const parsed = toStringId(raw);
    if (!parsed || seen.has(parsed)) return;
    seen.add(parsed);
    ids.push(parsed);
  });
  return ids;
};

const mapToRequest = (item: any): InventoryRequestRecord => {
  const requiredProducts = Math.max(1, Number(item?.requiredProducts ?? 1));
  const assignedProductIds = normalizeAssignedProductIds(item);
  const rawAssignedCount = Number(item?.assignedCount ?? assignedProductIds.length);
  const assignedCount = Math.min(requiredProducts, Math.max(0, Number.isFinite(rawAssignedCount) ? rawAssignedCount : 0));
  const rawPendingProducts = Number(item?.pendingProducts);
  const pendingProducts = Number.isFinite(rawPendingProducts) ? Math.max(0, rawPendingProducts) : Math.max(0, requiredProducts - assignedCount);

  const rawUsageChoice = `${item?.usageChoice || 'PURCHASE'}`.toUpperCase();
  const usageChoice = rawUsageChoice === 'RENT' ? 'MEMO' : rawUsageChoice;

  return {
    _id: `${item?._id || item?.id || ''}`,
    styleCode: `${item?.styleCode || ''}`,
    requestedBy: toStringId(item?.requestedBy),
    requestedByName: toDisplayName(item?.requestedBy),
    requiredProducts,
    usageChoice: usageChoice as InventoryUsageChoice,
    preferredUsageNote: item?.preferredUsageNote || '',
    remark: item?.remark || '',
    status: `${item?.status || 'OPEN'}` as InventoryRequestStatus,
    assignedProductId: toStringId(item?.assignedProductId) || undefined,
    assignedProductIds,
    assignedCount,
    pendingProducts,
    assignedTo: toStringId(item?.assignedTo) || undefined,
    assignedToName: toDisplayName(item?.assignedTo),
    assignedAt: item?.assignedAt ? `${item.assignedAt}` : undefined,
    createdAt: item?.createdAt ? `${item.createdAt}` : undefined,
    updatedAt: item?.updatedAt ? `${item.updatedAt}` : undefined,
  };
};

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

  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; jewelCode: string; styleCode: string; status: string; holder?: string; holderRole?: string; finalPrice?: number }>>([]);

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

  const quantityStats = useMemo(() => {
    return requests.reduce(
      (acc, request) => {
        const required = Math.max(1, Number(request.requiredProducts || 1));
        const assigned = Math.min(required, Math.max(0, Number(request.assignedCount ?? request.assignedProductIds?.length ?? 0)));
        acc.requested += required;
        acc.assigned += assigned;
        acc.pending += Math.max(0, required - assigned);
        return acc;
      },
      { requested: 0, assigned: 0, pending: 0 },
    );
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
            finalPrice: Number(item?.finalPrice ?? 0),
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
    quantityStats,
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
