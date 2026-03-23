export type UserRole = 'super-admin' | 'admin' | 'distributor' | 'jeweler' | 'staff' | 'accountant';

export interface Address {
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

export type KycFormState = {
  documentType: IKycDocument['documentType'];
  documentNumber: string;
  document: File | null;
  verified: boolean;
};

export interface ProfileForm {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  kycDocuments: IKycDocument[];
  isActive: boolean;
  isBlocked: boolean;
  creditLimit: number;
  walletBalance: number;
  commissionRate: number;
  kycVerified: boolean;
  address?: Address;
  createdAt: string;
  updatedAt: string;
}
