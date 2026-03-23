import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthApi } from '@api/api.index';
import type { ProfileForm, IKycDocument, KycFormState, UserRole } from '../types/profile.types';

const initialForm: ProfileForm = {
  _id: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'jeweler',
  kycVerified: false,
  kycDocuments: [],
  isActive: true,
  isBlocked: false,
  creditLimit: 0,
  walletBalance: 0,
  commissionRate: 0,
  createdAt: '',
  updatedAt: '',
};

const initialKycForm: KycFormState = {
  documentType: 'aadhaar' as IKycDocument['documentType'],
  documentNumber: '',
  document: null as File | null,
  verified: false,
};

export const useProfile = () => {
  const { data, isFetching, refetch } = AuthApi.useGetProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = AuthApi.useUpdateProfileMutation();
  const [uploadKycDocument, { isLoading: isUploading }] = AuthApi.useUploadKycDocumentMutation();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [isEditMode, setIsEditMode] = useState(false);
  const [kycForm, setKycForm] = useState<typeof initialKycForm>(initialKycForm);
  const [uploadedDocTypes, setUploadedDocTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data?.data?.user) {
      const user = data.data.user as Partial<ProfileForm>;
      setForm((prev) => ({
        ...prev,
        _id: user._id || prev._id,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        role: (user.role || prev.role) as UserRole,
        kycDocuments: Array.isArray(user?.kycDocuments) ? (user.kycDocuments as IKycDocument[]) : prev.kycDocuments,
        creditLimit: Number(user?.creditLimit ?? prev.creditLimit),
        walletBalance: Number(user?.walletBalance ?? prev.walletBalance),
        commissionRate: Number(user?.commissionRate ?? prev.commissionRate),
        kycVerified: user?.kycVerified ?? prev.kycVerified,
        address: user?.address || prev.address,
      }));
      const docs = Array.isArray(user?.kycDocuments) ? (user.kycDocuments as IKycDocument[]) : [];
      setUploadedDocTypes(new Set(docs.map((doc) => doc.documentType)));
    }
  }, [data]);

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, address: { ...(prev.address || {}), [name]: value } }));
  };

  const onSaveProfile = async () => {
    try {
      await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: form.address,
      }).unwrap();
      toast.success('Profile saved');
      refetch();
      setIsEditMode(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save profile');
    }
  };

  const onUploadKycDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form._id) return;
    if (!kycForm.documentNumber.trim()) {
      toast.error('Document number required');
      return;
    }

    try {
      await uploadKycDocument({
        userId: form._id,
        documentType: kycForm.documentType,
        documentNumber: kycForm.documentNumber.trim(),
        verified: kycForm.verified,
      }).unwrap();
      toast.success('Document uploaded');
      setKycForm((prev) => ({ ...prev, document: null }));
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to upload document');
    }
  };

  return {
    form,
    isLoading: isFetching,
    isSaving,
    isUploading,
    isEditMode,
    setIsEditMode,
    kycForm,
    setKycForm,
    uploadedDocTypes,
    canManageKyc: true,
    handleFieldChange,
    handleAddressChange,
    onSaveProfile,
    onUploadKycDocument,
  };
};
