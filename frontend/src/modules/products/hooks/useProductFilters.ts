import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterState, FacetKey } from '../utils/type';
import { INITIAL_FILTERS } from '../utils/variables';

const FACET_KEYS: FacetKey[] = ['metals', 'baseQualities', 'diamonds', 'category', 'subCategory'];

const readArray = (value: string | null): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const readNumber = (value: string | null): number | undefined => {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const serializeArray = (arr: string[]): string | null => {
  if (!arr || arr.length === 0) return null;
  return arr.join(',');
};

export const useProductFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => {
    const params = Object.fromEntries(searchParams.entries());
    const next: FilterState = { ...INITIAL_FILTERS };

    FACET_KEYS.forEach((key) => {
      next[key] = readArray(params[key]);
    });

    next.search = params.search ?? INITIAL_FILTERS.search;
    next.minWeight = readNumber(params.minWeight) ?? INITIAL_FILTERS.minWeight;
    next.maxWeight = readNumber(params.maxWeight) ?? INITIAL_FILTERS.maxWeight;
    next.minPrice = readNumber(params.minPrice) ?? INITIAL_FILTERS.minPrice;
    next.maxPrice = readNumber(params.maxPrice) ?? INITIAL_FILTERS.maxPrice;
    next.status = (params.status as FilterState['status']) ?? INITIAL_FILTERS.status;
    next.usageType = (params.usageType as FilterState['usageType']) ?? INITIAL_FILTERS.usageType;
    next.distributorId = params.distributorId ?? INITIAL_FILTERS.distributorId;
    next.holderRole = (params.holderRole as FilterState['holderRole']) ?? INITIAL_FILTERS.holderRole;
    next.currentHolderUserId = params.currentHolderUserId ?? INITIAL_FILTERS.currentHolderUserId;
    next.startDate = params.startDate ?? INITIAL_FILTERS.startDate;
    next.endDate = params.endDate ?? INITIAL_FILTERS.endDate;
    next.sortBy = (params.sortBy as FilterState['sortBy']) ?? INITIAL_FILTERS.sortBy;
    next.sortDir = (params.sortDir as FilterState['sortDir']) ?? INITIAL_FILTERS.sortDir;
    return next;
  });

  const syncParams = useCallback(
    (state: FilterState) => {
      const next = new URLSearchParams();

      if (state.search) next.set('search', state.search);
      if (state.minWeight !== undefined) next.set('minWeight', String(state.minWeight));
      if (state.maxWeight !== undefined) next.set('maxWeight', String(state.maxWeight));
      if (state.minPrice !== undefined) next.set('minPrice', String(state.minPrice));
      if (state.maxPrice !== undefined) next.set('maxPrice', String(state.maxPrice));
      if (state.status) next.set('status', state.status);
      if (state.usageType) next.set('usageType', state.usageType);
      if (state.distributorId) next.set('distributorId', state.distributorId);
      if (state.holderRole) next.set('holderRole', state.holderRole);
      if (state.currentHolderUserId) next.set('currentHolderUserId', state.currentHolderUserId);
      if (state.startDate) next.set('startDate', state.startDate);
      if (state.endDate) next.set('endDate', state.endDate);
      if (state.sortBy) next.set('sortBy', state.sortBy);
      if (state.sortDir) next.set('sortDir', state.sortDir);

      FACET_KEYS.forEach((key) => {
        const serialized = serializeArray(state[key]);
        if (serialized) next.set(key, serialized);
      });

      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    syncParams(filters);
  }, [filters, syncParams]);

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

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return useMemo(
    () => ({
      filters,
      setFilters,
      updateFilter,
      toggleFilterSelection,
      clearFilterSelection,
      resetFilters,
    }),
    [filters, updateFilter, toggleFilterSelection, clearFilterSelection, resetFilters],
  );
};
