import type { Address, IKycDocument, UserRole } from './profile.types';

export type ExtendedUserRole = UserRole | 'purchase';

export type KycDocumentType = IKycDocument['documentType'];

export type UserCommissionConfig = {
  defaultRate?: number;
  componentRates?: Record<string, number>;
};

export type UserEntity = {
  _id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: ExtendedUserRole;
  businessName?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: Address;
  kycVerified?: boolean;
  kycDocuments?: IKycDocument[];
  isActive?: boolean;
  isBlocked?: boolean;
  creditLimit?: number;
  walletBalance?: number;
  commissionRate?: number;
  commissionConfig?: UserCommissionConfig;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    outrightProducts?: number;
    rentedProducts?: number;
    pendingPaymentAmount?: number;
  };
};

export type UsersSummary = {
  totalUsers: number;
  verifiedUsers: number;
  pendingKyc: number;
  totalCreditLimit: number;
  totalWalletBalance: number;
  displayedOutrightProducts?: number;
  displayedRentedProducts?: number;
  displayedPendingPaymentAmount?: number;
};

export type OnboardingFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: ExtendedUserRole;
  businessName: string;
  gstNumber: string;
  panNumber: string;
  creditLimit: string;
  walletBalance: string;
  commissionDefaultRate: string;
  commissionDiamondRate: string;
  commissionLaborRate: string;
  address: Address;
};

export type EditUserFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  role: ExtendedUserRole;
  gstNumber: string;
  panNumber: string;
  creditLimit: string;
  walletBalance: string;
  commissionDefaultRate: string;
  commissionDiamondRate: string;
  commissionLaborRate: string;
  isActive: boolean;
  isBlocked: boolean;
  kycVerified: boolean;
  address: Address;
};

export type KycUploadDraft = {
  documentType: KycDocumentType;
  documentNumber: string;
  verified: boolean;
  document: File | null;
};
