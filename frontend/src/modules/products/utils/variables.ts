import { FilterState, ProductStatus, UsageType, HolderRole } from './type';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  PAGE_SIZE: 12,
  FACET_PAGE_SIZE: 12, // Changed from 500 to 12
} as const;

export const DEFAULT_BOUNDS = {
  weightMin: 0,
  weightMax: 500,
  priceMin: 0,
  priceMax: 500000,
} as const;

export const INITIAL_FILTERS: FilterState = {
  search: '',
  metals: [],
  diamonds: [],
  category: [],
  subCategory: [],
  minWeight: 0,
  maxWeight: 500,
  minPrice: 0,
  maxPrice: 500000,
  status: '',
  usageType: '',
  distributorId: '',
  holderRole: '',
  currentHolderUserId: '',
  startDate: '',
  endDate: '',
  baseQualities: [],
  sortBy: 'createdAt',
  sortDir: 'desc',
};

export const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: '', label: 'Any Status' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'PURCHASE_PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SOLD', label: 'Sold' },
];

export const USAGE_TYPE_OPTIONS: { value: UsageType; label: string }[] = [
  { value: '', label: 'Any Usage' },
  { value: 'owner', label: 'Owner' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'pending', label: 'Pending' },
  { value: 'outright', label: 'Outright Purchase' },
  { value: 'rented', label: 'Rental' },
];

export const HOLDER_ROLE_OPTIONS: { value: HolderRole; label: string }[] = [
  { value: '', label: 'Any Role' },
  { value: 'super-admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'jeweler', label: 'Jeweler' },
];
