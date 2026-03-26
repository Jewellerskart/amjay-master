export type ProductRow = {
  image: string | undefined;
  _id: string;
  qty?: number;
  orderStatus?: string;
  remarks?: string;
  saleAmount?: number;
  product?: {
    jewelCode?: string;
    styleCode?: string;
    qty?: number;
    itemPieces?: number;
    transNo?: string;
    orderNo?: string;
    saleAmount?: number;
  };
  diamond?: {
    pieces?: number;
    weight?: number;
    costAmount?: number;
  };
  colorDiamond?: {
    pieces?: number;
    weight?: number;
    costAmount?: number;
  };
  usage?: {
    type?: 'outright' | 'memo' | 'rented';
  };
  uploadedBy?: {
    name?: string;
    role?: string;
    businessName?: string;
  };
  currentHolder?: {
    userId?: string;
    name?: string;
    role?: string;
    businessName?: string;
  };
  cost?: {
    saleAmount?: number;
    metalValue?: number;
  };
  liveMetal?: number;
  finalPrice?: number;
  createdAt?: string;
};

export type ProductFormState = {
  jewelCode: string;
  styleCode: string;
  qty: string;
  itemPieces: string;
  orderStatus: string;
  remarks: string;
  usageType: 'outright' | 'memo' | 'rented';
  diamondPieces: string;
  diamondWeight: string;
  diamondRatePerCarat: string;
};

export type JewelerOption = {
  id: string;
  label: string;
};
