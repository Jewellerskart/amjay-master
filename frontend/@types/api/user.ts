import { TBasicDataStructure } from '..';
export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
  DISTRIBUTOR = 'distributor',
  JEWELER = 'jeweler',
  STAFF = 'staff',
  ACCOUNTANT = 'accountant',
}
export type IUserAccount = TBasicDataStructure & {
  firstName: string;
  lastName?: string;

  email?: string;
  phone: string;
  password: string;

  role: UserRole;

  businessName?: string;
  gstNumber?: string;
  panNumber?: string;

  address?: IAddress;

  kycVerified: boolean;
  kycDocuments: IKycDocument[];

  isActive: boolean;
  isBlocked: boolean;

  creditLimit: number;
  walletBalance: number;
  discountRate: number;

  profileImage?: string;

  lastLogin?: Date;

  refreshToken?: string;

  createdAt: Date;
  updatedAt: Date;
};
export type IUserDetails = TBasicDataStructure & {
  email?: string;
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  landmark?: string;
  state?: string;
  city?: string;
  country?: string;
  pin?: number;
  alternate_no?: number;
};

export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface IKycDocument {
  documentType: 'aadhaar' | 'pan' | 'gst' | 'license';
  documentNumber: string;
  documentUrl?: string;
  verified: boolean;
  verifiedAt?: string | null;
}
