export type ProductStatus = 'AVAILABLE' | 'ASSIGNED' | 'RENTED' | 'PURCHASE_PENDING_PAYMENT' | 'ACTIVE' | 'INACTIVE' | 'SOLD' | '';

export type UsageType = 'owner' | 'assigned' | 'pending' | 'rejected' | 'outright' | 'rented' | '';

export type HolderRole = 'super-admin' | 'admin' | 'distributor' | 'jeweler' | '';
export interface ActiveFiltersProps {
  filters: FilterState;
  onRemoveFilter: (key: FacetKey, value: string) => void;
}
export interface FilterState {
  search: string;
  metals: string[];
  baseQualities: string[];
  diamonds: string[];
  category: string[];
  subCategory: string[];
  minWeight?: number;
  maxWeight?: number;
  minPrice?: number;
  maxPrice?: number;
  status: ProductStatus;
  usageType: UsageType;
  distributorId: string;
  holderRole: HolderRole;
  currentHolderUserId: string;
  startDate: string;
  endDate: string;
  availability?: any;
  sortBy?: 'createdAt' | 'jewelCode' | 'qty' | 'weight' | 'price' | 'livePrice';
  sortDir?: 'asc' | 'desc';
}
export interface FilterPanelProps {
  filters: FilterState;
  facets: Facets;
  bounds: Bounds;
  totalCount: number;
  displayedCount: number;
  isLoading: boolean;
  showAdvancedFilters?: boolean;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onToggleSelection: (key: FacetKey, value: string) => void;
  onClearSelection: (key: FacetKey) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

export interface Bounds {
  weightMin: number;
  weightMax: number;
  priceMin: number;
  priceMax: number;
}

export interface Facets {
  metals: string[];
  baseQualities: string[];
  diamonds: string[];
  category: string[];
  subCategory: string[];
}

export type FacetKey = 'metals' | 'baseQualities' | 'diamonds' | 'category' | 'subCategory';
export type ProductCardProps = {
  product?: any;
  onInquiry?: () => void;
  hideOwnership?: boolean;
  detailHref?: string;
  quantity?: number;
  onQuantityChange?: (value: number) => void;
  isAssigned?: boolean;
  onAcceptRent?: () => void;
  onAcceptOutright?: () => void;
  acceptLoading?: boolean;
};
export interface ProductGridProps {
  products: Product[];
  isJewelerRole: boolean;
  qtyByProductId: Record<string, number>;
  isLoading: boolean;
  hasMore: boolean;
  isAccepting: boolean;
  onQuantityChange: (productId: string, quantity: number) => void;
  onInquiry: (productId: string) => void;
  onLoadMore: () => void;
}

export interface Product {
  finalPrice: any;
  liveMetal: any;
  _id: string;
  product?: {
    transNo?: string;
    orderNo?: string;
    design?: string;
    jewelCode?: string;
    styleCode?: string;
    category?: string;
    categoryName?: string;
    categoryGroupName?: string;
    subCategory?: string;
    qty?: number;
  };
  material?: {
    baseMetal?: string;
    baseQuality?: string;
    baseStone?: string;
    metalGroupName?: string;
    metal?: string;
  };
  weight?: {
    grossWeight?: number;
    netWeight?: number;
    pureWeight?: number;
  };
  diamond?: { pieces?: number; weight?: number; costAmount?: number };
  colorDiamond?: { pieces?: number; weight?: number; costAmount?: number };
  cost?: {
    totalCost?: number;
    pieceValue?: number;
    metalValue?: number;
    diamondValue?: number;
    colorStoneValue?: number;
    otherMetalValue?: number;
    setAmount?: number;
    handAmount?: number;
    saleAmount?: number;
  };
  components?: Array<{
    type?: string;
    itemName?: string;
    itemCode?: string;
    pieces?: number;
    weight?: number;
    rate?: number;
    amount?: number;
  }>;
  charges?: Array<{ type?: string; amount?: number }>;
  currentHolder?: {
    businessName?: string;
  };
  uploadedBy?: {
    businessName?: string;
  };
  image?: string | null;
  media?: string[];
  _origin?: string;
  origin?: string;
  parentProductId?: string;
  rootProductId?: string;
  childCount?: number;
  category?: {
    group?: string;
    subCategory?: string;
  };
  saleAmount?: number;
}

export interface ProductListResponse {
  data: {
    data: Product[];
    count: number;
    minWeight?: number;
    maxWeight?: number;
    minPrice?: number;
    maxPrice?: number;
    facets?: Facets;
  };
}
