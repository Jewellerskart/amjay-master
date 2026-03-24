import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { inventoryApi, ProductApi } from '@api/api.index';

type InventoryRow = {
  image: any;
  _id: string;
  jewelCode: string;
  styleCode: string;
  qty: number;
  holderName?: string;
  status?: string;
  usageType?: string;
  origin?: string;
  createdAt?: string;
};

type LoadParams = {
  page?: number;
  limit?: number;
  search?: string;
};

type UserShape = { _id?: string; role?: string };

type ExternalPaging = {
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export const useMyInventory = (user?: UserShape, view: 'accepted' | 'pending' = 'accepted', paging?: ExternalPaging) => {
  const [listProducts, { isLoading: isLoadingList }] = inventoryApi.useListInventoryMutation();
  const [acceptProduct, { isLoading: isAccepting }] = ProductApi.useAcceptAssignedProductMutation();
  const [rejectProduct, { isLoading: isRejecting }] = ProductApi.useRejectAssignedProductMutation();

  const userId = `${user?._id || ''}`;
  const holderRole = `${user?.role || ''}`.toLowerCase();
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageState, setPageState] = useState(1);
  const [limitState, setLimitState] = useState(10);
  const page = paging ? paging.page : pageState;
  const limit = paging ? paging.limit : limitState;
  const setPage = paging ? paging.onPageChange : setPageState;
  const setLimit = paging ? paging.onLimitChange : setLimitState;
  const [search, setSearch] = useState('');
  const [acceptModeById, setAcceptModeById] = useState<Record<string, 'rent' | 'outright'>>({});

  const loadInventory = useCallback(
    async (params: LoadParams = {}) => {
      const currentPage = params.page ?? page;
      const currentLimit = params.limit ?? limit;
      const searchTerm = params.search ?? search;

      if (!userId) {
        setItems([]);
        setTotal(0);
        return;
      }
      const payload = {
        page: currentPage,
        limit: currentLimit,
        search: searchTerm || undefined,
        holderRole: (holderRole || undefined) as any,
        currentHolderUserId: userId,
        includeAssignedClones: true,
        includePending: view === 'pending',
      };
      try {
        const response: any = await listProducts(payload).unwrap();

        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];

        setItems(rows.map((row: any) => row).filter((row: InventoryRow) => row._id));

        setTotal(Number(response?.data?.count || rows.length || 0));
      } catch (error: any) {
        const message = error?.data?.message || 'Failed to load inventory';
        toast.error(message);
        setItems([]);
        setTotal(0);
      }
    },
    [listProducts, page, limit, search, userId, holderRole, view],
  );

  useEffect(() => {
    loadInventory();
  }, [page, limit, loadInventory]);

  const onAccept = useCallback(
    async (id: string, mode: 'rent' | 'outright') => {
      if (!id) return;
      try {
        await acceptProduct({ id, mode }).unwrap();
        toast.success('Product accepted');
        await loadInventory();
      } catch (error: any) {
        toast.error(error?.data?.message || 'Failed to accept product');
      }
    },
    [acceptProduct, loadInventory],
  );

  const onReject = useCallback(
    async (id: string, remark?: string) => {
      if (!id) return;
      try {
        await rejectProduct({ id, remark }).unwrap();
        toast.success('Product rejected');
        await loadInventory();
      } catch (error: any) {
        toast.error(error?.data?.message || 'Failed to reject product');
      }
    },
    [rejectProduct, loadInventory],
  );

  const canRespond = useMemo(() => {
    const map: Record<string, boolean> = {};
    items.forEach((row) => {
      const status = `${row.status || ''}`.toLowerCase();
      const pending = view === 'pending' || row.origin === 'assigned' || status === 'assigned' || status === 'pending' || status === '';
      map[row._id] = pending && view === 'pending';
    });
    return map;
  }, [items, view]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 1) / (limit || 1))), [total, limit]);

  return {
    list: { items, total, isLoading: isLoadingList },
    pagination: { page, limit, setPage, setLimit, totalPages },
    searchState: { search, setSearch, loadInventory },
    responses: { acceptModeById, setAcceptModeById, onAccept, onReject, isAccepting, isRejecting, canRespond },
    reload: loadInventory,
  };
};
