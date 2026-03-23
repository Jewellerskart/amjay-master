import { TBasicDataStructure } from '..';

export type TSellerLoginAndSignUpData = TBasicDataStructure & {
  email?: string;
  type?: string;
  country_code?: string;
  mobile_number?: number;
  company_name?: string;
  password?: string;
  is_auth?: boolean;
  seller_level?: number;
  verify?: { otp?: number; otpTime?: Date | null; step?: number };
  business_info?: {
    business_name?: string;
    company_registration_number?: string;
    address_1?: string;
    address_2?: string;
    country?: string;
    state?: string;
    city?: string;
    pin?: number;
    business_type?: string;
    pan_card?: string;
  };
  seller_info?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    country_of_citizenship?: string;
    date_of_birth?: Date | string;
    proof_type?: string;
    proof_detail?: string;
    is_verified?: boolean;
    address_1?: string;
    address_2?: string;
    country?: string;
    state?: string;
    city?: string;
    pin?: number;
    is_owner?: boolean;
  };
  brand?: { brand_name?: string; seller_id?: string };
  banking_detail?: {
    is_verified?: boolean;
    account_number?: string;
    account_holder_name?: string;
    ifsc_code?: string;
    bank_name?: string;
    branch_name?: string;
    bank_account_type?: string;
  };
  reject_code?: number;
  reject_reason?: string;
};

export type Warehouse = {
  gst?: string;
  address_1?: string;
  address_2?: string;
  country?: string;
  state?: string;
  city?: string;
  pin?: number;
  primary?: boolean;
};

export type WarehouseData = {
  business_name?: string;
  data_1?: Warehouse;
  data_2?: Warehouse;
  data_3?: Warehouse;
};

export type ICommission = TBasicDataStructure & {
  cat_1?: string;
  cat_1_com?: number;
  cat_1_exp?: Date | null;
  cat_1_f_com?: number;
  cat_2?: string;
  cat_2_com?: number;
  cat_2_exp?: Date | null;
  cat_2_f_com?: number;
  cat_3?: string;
  cat_3_com?: number;
  cat_3_exp?: Date | null;
  cat_3_f_com?: number;
  cat_4?: string;
  cat_4_com?: number;
  cat_4_exp?: Date | null;
  cat_4_f_com?: number;
  cat_5?: string;
  cat_5_com?: number;
  cat_5_exp?: Date | null;
  cat_5_f_com?: number;
  cat_6?: string;
  cat_6_com?: number;
  cat_6_exp?: Date | null;
  cat_6_f_com?: number;
  cat_7?: string;
  cat_7_com?: number;
  cat_7_exp?: Date | null;
  cat_7_f_com?: number;
  cat_8?: string;
  cat_8_com?: number;
  cat_8_exp?: Date | null;
  cat_8_f_com?: number;
};

export type ISCommission = TBasicDataStructure & {
  cat_1?: string;
  cat_1_dis?: number;
  cat_1_exp?: Date | null;
  cat_1_f_dis?: number;
  cat_2?: string;
  cat_2_dis?: number;
  cat_2_exp?: Date | null;
  cat_2_f_dis?: number;
  cat_3?: string;
  cat_3_dis?: number;
  cat_3_exp?: Date | null;
  cat_3_f_dis?: number;
  cat_4?: string;
  cat_4_dis?: number;
  cat_4_exp?: Date | null;
  cat_4_f_dis?: number;
};
export type ISellerWallet = TBasicDataStructure & {
  email?: string;
  wallet_balance?: number;
  wallet_expiry?: Date;
  wallet_fine?: number;
  orders?: {
    order_id?: string;
    order_fine_amount?: number;
    order_status?: string;
    fine_date?: Date;
  }[];
};
export type ISellerWalletTransaction = TBasicDataStructure & {
  email?: string;
  amount?: number;
  transaction_type?: string;
  fine_amount?: number;
  transaction_id?: string;
  transaction_status?: string;
  transaction_date?: Date | string;
};
