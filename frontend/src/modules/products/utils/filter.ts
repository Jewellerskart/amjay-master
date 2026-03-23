import { FilterState, Bounds } from './type';

export const regexOr = (values: string[]): string => {
  return values.length ? values.join('|') : '';
};

export const calculateSliderBackground = (min: number, max: number, from: number, to: number): string => {
  const safeFrom = Math.max(min, Math.min(from, max));
  const safeTo = Math.max(min, Math.min(to, max));
  const start = ((safeFrom - min) / (max - min)) * 100;
  const end = ((safeTo - min) / (max - min)) * 100;
  return `linear-gradient(90deg, #d0d8ff ${start}%, #6a7bff ${start}%, #6a7bff ${end}%, #d0d8ff ${end}%)`;
};

export const validateFilterBounds = (filters: FilterState, bounds: Bounds): FilterState => {
  return {
    ...filters,
    minWeight: Math.max(bounds.weightMin, Math.min(filters.minWeight ?? bounds.weightMin, bounds.weightMax)),
    maxWeight: Math.max(bounds.weightMin, Math.min(filters.maxWeight ?? bounds.weightMax, bounds.weightMax)),
    minPrice: Math.max(bounds.priceMin, Math.min(filters.minPrice ?? bounds.priceMin, bounds.priceMax)),
    maxPrice: Math.max(bounds.priceMin, Math.min(filters.maxPrice ?? bounds.priceMax, bounds.priceMax)),
  };
};

export const parseBounds = (data: any, defaultBounds: Bounds): Bounds => {
  const minW = data?.minWeight;
  const maxW = data?.maxWeight;
  const minP = data?.minPrice;
  const maxP = data?.maxPrice;

  return {
    weightMin: Number.isFinite(minW) ? minW : defaultBounds.weightMin,
    weightMax: Number.isFinite(maxW) ? maxW : defaultBounds.weightMax,
    priceMin: Number.isFinite(minP) ? minP : defaultBounds.priceMin,
    priceMax: Number.isFinite(maxP) ? maxP : defaultBounds.priceMax,
  };
};

export const countActiveFilters = (filters: FilterState): number => {
  let count = 0;
  if (filters.search) count++;
  count += filters.metals.length;
  count += filters.diamonds.length;
  count += filters.category.length;
  count += filters.subCategory.length;
  if (filters?.availability) count++;
  return count;
};
