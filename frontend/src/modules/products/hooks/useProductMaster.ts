import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthApi, ProductApi } from '@api/index';
import { ProductRow, JewelerOption } from '../../inventory/types/types';

type HolderRoleFilter = '' | 'super-admin' | 'admin' | 'distributor' | 'jeweler';

type ExternalPaging = {
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

type PriceTotals = {
  inventoryQty: number;
  inventoryPrice: number;
  memoQty: number;
  memoPrice: number;
  purchasedQty: number;
  purchasedPrice: number;
};

type AssignProductOptions = {
  toUserId?: string;
  quantity?: number;
  silent?: boolean;
  skipReload?: boolean;
};

export const useProductMaster = (user: any, paging?: ExternalPaging) => {
  const role = `${user?.role || ''}`.toLowerCase();
  const isAdmin = role === 'admin' || role === 'super-admin';
  const isDistributor = role === 'distributor';
  const canAssign = isAdmin || isDistributor;

  const [listProducts, { isLoading: isLoadingProducts }] = ProductApi.useListProductsMutation();
  const [assignProduct, { isLoading: isAssigningProduct }] = ProductApi.useAssignProductToJewelerMutation();
  const [getUsersNames] = AuthApi.useGetUsersNamesMutation();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalQtyFromApi, setTotalQtyFromApi] = useState(0);
  const [priceTotals, setPriceTotals] = useState<PriceTotals>({
    inventoryQty: 0,
    inventoryPrice: 0,
    memoQty: 0,
    memoPrice: 0,
    purchasedQty: 0,
    purchasedPrice: 0,
  });
  const [search, setSearch] = useState('');
  const [holderRole, setHolderRole] = useState<HolderRoleFilter>('');
  const [pageState, setPageState] = useState(1);
  const [limitState, setLimitState] = useState(10);
  const page = paging ? paging.page : pageState;
  const limit = paging ? paging.limit : limitState;
  const setPage = paging ? paging.onPageChange : setPageState;
  const setLimit = paging ? paging.onLimitChange : setLimitState;
  const [sortBy, setSortBy] = useState<'createdAt' | 'jewelCode' | 'styleCode' | 'qty' | 'weight' | 'price' | 'livePrice'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [jewelers, setJewelers] = useState<JewelerOption[]>([]);
  const [assignByProductId, setAssignByProductId] = useState<Record<string, string>>({});

  const loadProducts = async (
    overrides: Partial<{
      page: number;
      limit: number;
      search: string;
      holderRole: HolderRoleFilter;
      sortBy: 'createdAt' | 'jewelCode' | 'styleCode' | 'qty' | 'weight' | 'price' | 'livePrice';
      sortDir: 'asc' | 'desc';
    }> = {},
  ) => {
    const payload = {
      page: overrides.page ?? page,
      limit: overrides.limit ?? limit,
      search: overrides.search ?? search,
      holderRole: overrides.holderRole ?? holderRole,
      sortBy: overrides.sortBy ?? sortBy,
      sortDir: overrides.sortDir ?? sortDir,
    };

    try {
      const res: any = await listProducts(payload).unwrap();
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const totals = res?.data?.totals || {};
      setProducts(rows);
      setTotalProducts(Number(res?.data?.count || 0));
      setTotalQtyFromApi(Number(res?.data?.totalQty || 0));
      setPriceTotals({
        inventoryQty: Number(totals?.inventoryQty || res?.data?.totalQty || 0),
        inventoryPrice: Number(totals?.inventoryPrice || 0),
        memoQty: Number(totals?.memoQty || 0),
        memoPrice: Number(totals?.memoPrice || 0),
        purchasedQty: Number(totals?.purchasedQty || 0),
        purchasedPrice: Number(totals?.purchasedPrice || 0),
      });
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load products');
      setProducts([]);
      setTotalProducts(0);
      setTotalQtyFromApi(0);
      setPriceTotals({
        inventoryQty: 0,
        inventoryPrice: 0,
        memoQty: 0,
        memoPrice: 0,
        purchasedQty: 0,
        purchasedPrice: 0,
      });
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
    await loadProducts({ page: 1 });
  };

  const onAssignProduct = async (product: ProductRow, opts: AssignProductOptions = {}) => {
    const id = product?._id;
    if (!id) return false;
    const toUserId = `${opts.toUserId || assignByProductId[id] || ''}`;
    const quantity = Number(opts.quantity ?? 1);
    const silent = opts.silent === true;
    const skipReload = opts.skipReload === true;
    const fromRole = `${user?.role || ''}` || 'admin';

    if (!toUserId) {
      toast.error('Select jeweler first');
      return false;
    }
    if (quantity !== 1) {
      toast.error('Assignment is jewelcode-wise. Quantity must be 1.');
      return false;
    }
    if (!fromRole) {
      toast.error('Your role is missing; please re-login and try again');
      return false;
    }

    try {
      const fromName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || user?.phone;
      await assignProduct({ id, toUserId, remark: 'Assigned via dashboard', fromRole, fromName, fromBusinessName: user?.businessName, quantity }).unwrap();
      if (!silent) {
        toast.success('Product assigned to jeweler');
      }
      if (!skipReload) {
        await loadProducts();
      }
      return true;
    } catch (error: any) {
      if (!silent) {
        toast.error(error?.data?.message || 'Assignment failed');
      }
      return false;
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

    return {
      totalQty: totalQtyFromApi,
      jewelerHeld,
      distributorHeld,
      ...priceTotals,
    };
  }, [products, totalQtyFromApi, priceTotals]);

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
    jewelers,
    assignByProductId,
    setAssignByProductId,
    onAssignProduct,
    isAssigningProduct,
  };
};

