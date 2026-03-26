import type {
  EditUserFormState,
  ExtendedUserRole,
  KycDocumentType,
  KycUploadDraft,
  OnboardingFormState,
  UserEntity,
  UsersSummary,
} from '../types';

export const USER_ROLE_OPTIONS: ExtendedUserRole[] = ['super-admin', 'admin', 'distributor', 'jeweler', 'staff', 'accountant', 'purchase'];
export const KYC_DOCUMENT_OPTIONS: KycDocumentType[] = ['aadhaar', 'pan', 'gst', 'license'];

export const EMPTY_SUMMARY: UsersSummary = {
  totalUsers: 0,
  verifiedUsers: 0,
  pendingKyc: 0,
  totalCreditLimit: 0,
  totalWalletBalance: 0,
  displayedOutrightProducts: 0,
  displayedRentedProducts: 0,
  displayedPendingPaymentAmount: 0,
};

export const createEmptyOnboardingForm = (): OnboardingFormState => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'jeweler',
  businessName: '',
  gstNumber: '',
  panNumber: '',
  creditLimit: '',
  walletBalance: '',
  commissionDefaultRate: '',
  commissionDiamondRate: '',
  commissionLaborRate: '',
  address: { street: '', city: '', state: '', country: '', pincode: '' },
});

export const createEmptyEditUserForm = (): EditUserFormState => ({
  firstName: '',
  lastName: '',
  phone: '',
  role: 'jeweler',
  gstNumber: '',
  panNumber: '',
  creditLimit: '0',
  walletBalance: '0',
  commissionDefaultRate: '0',
  commissionDiamondRate: '0',
  commissionLaborRate: '0',
  isActive: true,
  isBlocked: false,
  kycVerified: false,
  address: { street: '', city: '', state: '', country: '', pincode: '' },
});

export const createKycDraft = (): KycUploadDraft => ({
  documentType: 'aadhaar',
  documentNumber: '',
  verified: false,
  document: null,
});

export const mapUserToEditForm = (user: UserEntity): EditUserFormState => {
  const componentRates = user.commissionConfig?.componentRates || {};
  const defaultRate = Number(user.commissionConfig?.defaultRate ?? user.commissionRate ?? 0);
  const diamondRate = Number(componentRates.diamond ?? defaultRate);
  const laborRate = Number(componentRates.labor ?? defaultRate);

  return {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    role: (user.role || 'jeweler') as ExtendedUserRole,
    gstNumber: user.gstNumber || '',
    panNumber: user.panNumber || '',
    creditLimit: String(Number(user.creditLimit ?? 0)),
    walletBalance: String(Number(user.walletBalance ?? 0)),
    commissionDefaultRate: String(Number.isFinite(defaultRate) ? defaultRate : 0),
    commissionDiamondRate: String(Number.isFinite(diamondRate) ? diamondRate : 0),
    commissionLaborRate: String(Number.isFinite(laborRate) ? laborRate : 0),
    isActive: user.isActive ?? true,
    isBlocked: user.isBlocked ?? false,
    kycVerified: user.kycVerified ?? false,
    address: {
      street: user.address?.street || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      country: user.address?.country || '',
      pincode: user.address?.pincode || '',
    },
  };
};

export const parseNumber = (value: string, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

export const formatRoleLabel = (role?: string) => {
  const input = `${role || ''}`.trim();
  if (!input) return '-';
  return input
    .split('-')
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

export const formatCurrencyInr = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export const getUserDisplayName = (user: Pick<UserEntity, 'firstName' | 'lastName'>) => {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || '-';
};
