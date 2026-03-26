import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useListMarketplaceProductsMutation, useGetProductFilterQuery } from '@api/apiHooks/product';
import { FilterState, Product, Facets, Bounds, ProductListResponse, FacetKey } from './type';
import { PAGINATION, DEFAULT_BOUNDS, INITIAL_FILTERS } from './variables';
import { encodeFacetFilter, regexOr, parseBounds, validateFilterBounds } from './filter';

import { Dispatch, SetStateAction } from 'react';

interface UseProductMarketplaceProps {
  includeAssignedClones?: boolean;
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
}

const NO_DIAMOND_LABEL = 'No Diamond';
const NO_BASE_QUALITY_LABEL = 'No Base Quality';

const normalizeFacetValues = (values: unknown, options?: { noneLabel?: string; includeNoneOption?: boolean }): string[] => {
  const rows = Array.isArray(values) ? values : [];
  const unique = new Set<string>();
  let hasEmpty = false;

  rows.forEach((raw) => {
    const value = `${raw || ''}`.trim();
    if (!value) {
      hasEmpty = true;
      return;
    }
    unique.add(value);
  });

  const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b));
  if (options?.includeNoneOption && options.noneLabel) {
    if (hasEmpty || !sorted.includes(options.noneLabel)) {
      sorted.unshift(options.noneLabel);
    }
  }

  return sorted;
};

export const useProductMarketplace = ({ includeAssignedClones = false, filters, setFilters }: UseProductMarketplaceProps) => {
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState<Facets>({
    metals: [],
    baseQualities: [],
    diamonds: [],
    category: [],
    subCategory: [],
  });
  const [bounds, setBounds] = useState<Bounds>(DEFAULT_BOUNDS);
  const hasInitialized = useRef(false);

  const [listProducts, { isLoading }] = useListMarketplaceProductsMutation();

  const { data: filterData, isLoading: filterLoading, isSuccess } = useGetProductFilterQuery();
  useEffect(() => {
    if (isSuccess && filterData) {
      const filters = filterData.data.filters;
      setFacets({
        metals: normalizeFacetValues(filters.baseMetals),
        baseQualities: normalizeFacetValues(filters.baseQualities, { noneLabel: NO_BASE_QUALITY_LABEL, includeNoneOption: true }),
        diamonds: normalizeFacetValues(filters.baseStones, { noneLabel: NO_DIAMOND_LABEL, includeNoneOption: true }),
        category: normalizeFacetValues(filters.category),
        subCategory: normalizeFacetValues(filters.subCategory),
      });
    }
  }, [filterData, isSuccess, filterLoading]);
  const fetchProducts = useCallback(
    async (options: { reset?: boolean; overrideFilters?: FilterState } = {}) => {
      const { reset = false, overrideFilters } = options;
      const activeFilters = overrideFilters || filters;

      try {
        const currentPage = reset ? PAGINATION.DEFAULT_PAGE : page;

        const response = (await listProducts({
          page: Number(currentPage),
          limit: PAGINATION.PAGE_SIZE,
          search: activeFilters.search,
          group: regexOr(activeFilters.category),
          subCategory: regexOr(activeFilters.subCategory),
          metals: regexOr(activeFilters.metals),
          baseQualities: encodeFacetFilter(activeFilters.baseQualities, NO_BASE_QUALITY_LABEL),
          diamonds: encodeFacetFilter(activeFilters.diamonds, NO_DIAMOND_LABEL),
          minWeight: activeFilters.minWeight,
          maxWeight: activeFilters.maxWeight,
          minPrice: activeFilters.minPrice,
          maxPrice: activeFilters.maxPrice,
          status: activeFilters.status || '',
          usageType: activeFilters.usageType || '',
          distributorId: activeFilters.distributorId || '',
          holderRole: activeFilters.holderRole || '',
          currentHolderUserId: activeFilters.currentHolderUserId || '',
          startDate: activeFilters.startDate || '',
          endDate: activeFilters.endDate || '',
          sortBy: activeFilters.sortBy || 'createdAt',
          sortDir: activeFilters.sortDir || 'desc',
          includeAssignedClones,
        }).unwrap()) as ProductListResponse;

        const newProducts = Array.isArray(response?.data?.data) ? response.data.data : [];

        setProducts((prev) => (reset ? newProducts : [...prev, ...newProducts]));

        setHasMore(newProducts.length === PAGINATION.PAGE_SIZE);
        setPage(Number(currentPage) + 1);
        setTotalCount(Number(response?.data?.count || 0));

        const newBounds = parseBounds(response?.data, bounds);
        setBounds(newBounds);

        if (reset) {
          setFilters((prevFilters) => validateFilterBounds({ ...prevFilters, sortBy: activeFilters.sortBy, sortDir: activeFilters.sortDir }, newBounds));
        }
      } catch (error: any) {
        const errorMessage = error?.data?.message || 'Failed to load products';
        toast.error(errorMessage);
        setHasMore(false);
        if (reset) {
          setProducts([]);
        }
      }
    },
    [filters, page, includeAssignedClones, listProducts, bounds, setFilters],
  );

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchProducts({ reset: false });
    }
  }, [fetchProducts, isLoading, hasMore]);

  const applyFilters = useCallback(() => {
    fetchProducts({ reset: true });
  }, [fetchProducts]);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPage(PAGINATION.DEFAULT_PAGE);
    fetchProducts({ reset: true, overrideFilters: INITIAL_FILTERS });
  }, [fetchProducts, setFilters]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleFilterSelection = useCallback((filterKey: FacetKey, value: string) => {
    setFilters((prev) => {
      const current = prev[filterKey] || [];
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [filterKey]: updated };
    });
  }, []);

  const clearFilterSelection = useCallback((filterKey: FacetKey) => {
    setFilters((prev) => ({ ...prev, [filterKey]: [] }));
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    fetchProducts({ reset: true });
  }, [fetchProducts]);

  return {
    filters,
    products,
    hasMore,
    totalCount,
    facets,
    bounds,
    isLoading,
    page,

    fetchProducts,
    loadMore,
    applyFilters,
    resetFilters,
    updateFilter,
    toggleFilterSelection,
    clearFilterSelection,
  };
};

import { useAcceptAssignedProductMutation } from '@api/apiHooks/product';
import { useCreateInventoryRequestMutation } from '@api/apiHooks/inventory';

interface UseProductActionsProps {
  userId?: string;
  onProductAccepted?: (productId: string) => void;
}

export const useProductActions = ({ userId, onProductAccepted }: UseProductActionsProps) => {
  const [qtyByProductId, setQtyByProductId] = useState<Record<string, number>>({});

  const [acceptAssignment, { isLoading: isAccepting }] = useAcceptAssignedProductMutation();
  const [createRequest, { isLoading: isCreatingRequest }] = useCreateInventoryRequestMutation();

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setQtyByProductId((prev) => ({ ...prev, [productId]: Math.max(1, quantity) }));
  }, []);

  const getQuantity = useCallback(
    (productId: string): number => {
      return qtyByProductId[productId] || 1;
    },
    [qtyByProductId],
  );

  const handleInquiry = useCallback(
    async (styleCode?: string) => {
      if (!styleCode) {
        toast.error('Invalid style code');
        return;
      }

      if (!userId) {
        toast.error('Please login to request products');
        return;
      }

      const quantity = getQuantity(styleCode);

      try {
        const payload = {
          requiredProducts: quantity,
          usageChoice: 'MEMO',
          preferredUsageNote: `Inquiry for style ${styleCode}`,
          remark: styleCode,
          styleCode,
        } as any;
        await createRequest(payload).unwrap();

        toast.success('Inquiry submitted successfully');
      } catch (error: any) {
        const errorMessage = error?.data?.message || 'Failed to submit inquiry';
        toast.error(errorMessage);
      }
    },
    [userId, getQuantity, createRequest],
  );

  const handleAccept = useCallback(
    async (productId?: string, mode: 'memo' | 'rent' | 'outright' = 'memo') => {
      if (!productId) {
        toast.error('Invalid product');
        return;
      }

      try {
        await acceptAssignment({ id: productId, mode }).unwrap();

        toast.success(`Product accepted as ${mode}`);

        if (onProductAccepted) {
          onProductAccepted(productId);
        }
      } catch (error: any) {
        const errorMessage = error?.data?.message || 'Failed to accept assignment';
        toast.error(errorMessage);
      }
    },
    [acceptAssignment, onProductAccepted],
  );

  return { qtyByProductId, isAccepting, isCreatingRequest, updateQuantity, getQuantity, handleInquiry, handleAccept };
};
