import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthApi, ProductApi } from '@api/api.index';
import { ProductRow, JewelerOption } from '../../inventory/types/types';

const parseNumber = (value: string, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

type ExternalPaging = {
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export const useProductMaster = (user: any, paging?: ExternalPaging) => {
  const role = `${user?.role || ''}`.toLowerCase();
  const isAdmin = role === 'admin' || role === 'super-admin';
  const isDistributor = role === 'distributor';
  const canAssign = isAdmin || isDistributor;

  const [listProducts, { isLoading: isLoadingProducts }] = ProductApi.useListProductsMutation();
  const [updateProduct, { isLoading: isUpdatingProduct }] = ProductApi.useUpdateProductMutation();
  const [assignProduct, { isLoading: isAssigningProduct }] = ProductApi.useAssignProductToJewelerMutation();
  const [getUsersNames] = AuthApi.useGetUsersNamesMutation();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalQtyFromApi, setTotalQtyFromApi] = useState(0);
  const [search, setSearch] = useState('');
  const [holderRole, setHolderRole] = useState<'' | 'super-admin' | 'admin' | 'distributor' | 'jeweler'>('');
  const [pageState, setPageState] = useState(1);
  const [limitState, setLimitState] = useState(10);
  const page = paging ? paging.page : pageState;
  const limit = paging ? paging.limit : limitState;
  const setPage = paging ? paging.onPageChange : setPageState;
  const setLimit = paging ? paging.onLimitChange : setLimitState;
  const [sortBy, setSortBy] = useState<'createdAt' | 'jewelCode' | 'qty' | 'weight' | 'price' | 'livePrice'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [jewelers, setJewelers] = useState<JewelerOption[]>([]);
  const [assignByProductId, setAssignByProductId] = useState<Record<string, string>>({});
  const [assignQtyByProductId, setAssignQtyByProductId] = useState<Record<string, string>>({});
  const [qtyByProductId, setQtyByProductId] = useState<Record<string, string>>({});

  const loadProducts = async () => {
    try {
      const res: any = await listProducts({ page, limit, search, holderRole, sortBy, sortDir }).unwrap();
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      setProducts(rows);
      setTotalProducts(Number(res?.data?.count || 0));
      setTotalQtyFromApi(Number(res?.data?.totalQty || 0));
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load products');
      setProducts([]);
      setTotalProducts(0);
      setTotalQtyFromApi(0);
    }
  };

  const loadJewelers = async () => {
    if (!canAssign) return;
    try {
      const res: any = await getUsersNames().unwrap();
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      setJewelers(
        rows.map((i: any) => ({
          id: `${i?._id || ''}`,
          label: {
            name: `${i?.firstName} ${i?.lastName}`,
            businessName: `${i?.businessName || ''}`,
            email: `${i?.email || ''}`,
          },
        })),
      );
    } catch {
      setJewelers([]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, limit, holderRole, sortBy, sortDir]);

  useEffect(() => {
    loadJewelers();
  }, [canAssign]);

  const onSearch = async () => {
    setPage(1);
    await loadProducts();
  };

  const onUpdateQty = async (product: ProductRow) => {
    const id = product?._id;
    if (!id) return;

    const nextQty = parseNumber(qtyByProductId[id] ?? `${product?.product?.qty || 0}`, 0);
    if (nextQty < 0) {
      toast.error('Qty cannot be negative');
      return;
    }

    try {
      await updateProduct({ id, payload: { product: { ...(product.product || {}), qty: nextQty } } }).unwrap();

      toast.success('Quantity updated');
      loadProducts();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update quantity');
    }
  };

  const onAssignProduct = async (product: ProductRow, opts: { toUserId?: string; quantity?: number } = {}) => {
    const id = product?._id;
    if (!id) return;
    const toUserId = `${opts.toUserId || assignByProductId[id] || ''}`;
    const quantity = Number(opts.quantity ?? assignQtyByProductId[id] ?? 1);
    const fromRole = `${user?.role || ''}` || 'admin';

    if (!toUserId) {
      toast.error('Select jeweler first');
      return;
    }
    const availableQty = Number(product?.product?.qty || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (quantity > availableQty) {
      toast.error(`Only ${availableQty} available to assign`);
      return;
    }
    if (!fromRole) {
      toast.error('Your role is missing; please re-login and try again');
      return;
    }

    try {
      const fromName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || user?.phone;
      await assignProduct({ id, toUserId, remark: 'Assigned via dashboard', fromRole, fromName, fromBusinessName: user?.businessName, quantity }).unwrap();
      toast.success('Product assigned to jeweler');
      loadProducts();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Assignment failed');
    }
  };

  const summary = useMemo(() => {
    let jewelerHeld = 0;
    let distributorHeld = 0;

    for (const row of products) {
      const holder = `${row?.currentHolder?.role || ''}`.toLowerCase();
      if (holder === 'jeweler') jewelerHeld += 1;
      if (holder === 'distributor') distributorHeld += 1;
    }

    return { totalQty: totalQtyFromApi, jewelerHeld, distributorHeld };
  }, [products, totalQtyFromApi]);

  return {
    canAssign,
    isAdmin,
    products,
    totalProducts,
    page,
    limit,
    search,
    holderRole,
    sortBy,
    sortDir,
    setPage,
    setLimit,
    setSearch,
    setHolderRole,
    setSortBy,
    setSortDir,
    onSearch,
    loadProducts,
    isLoadingProducts,
    summary,
    qtyByProductId,
    setQtyByProductId,
    onUpdateQty,
    isUpdatingProduct,
    jewelers,
    assignByProductId,
    setAssignByProductId,
    assignQtyByProductId,
    setAssignQtyByProductId,
    onAssignProduct,
    isAssigningProduct,
  };
};
