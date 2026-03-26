import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Header } from '@common/header';
import { AuthApi } from '@api/index';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { isAdminRole } from '@shared/utils/roles';
import type { Address, OnboardingFormState } from '../../types';
import { USER_ROLE_OPTIONS, createEmptyOnboardingForm, formatRoleLabel, parseNumber } from '../../utils';

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const normalizeAddress = (address: Address) => {
  const cleaned = {
    street: address.street?.trim() || undefined,
    city: address.city?.trim() || undefined,
    state: address.state?.trim() || undefined,
    country: address.country?.trim() || undefined,
    pincode: address.pincode?.trim() || undefined,
  };
  return Object.values(cleaned).some((value) => Boolean(value)) ? cleaned : undefined;
};

export const UserOnboarding = () => {
  const { data: user } = useAuthSellerLogin();
  const isAdmin = isAdminRole(user?.role);

  const [registerUser, { isLoading: isCreating }] = AuthApi.useRegisterUserMutation();
  const [checkBusinessName, { isLoading: isCheckingBusiness }] = AuthApi.useCheckBusinessNameMutation();

  const [form, setForm] = useState<OnboardingFormState>(createEmptyOnboardingForm());
  const [businessCheck, setBusinessCheck] = useState<{
    available: boolean | null;
    message: string;
    suggestions: string[];
  }>({ available: null, message: '', suggestions: [] });

  const canCheckBusinessName = useMemo(() => form.businessName.trim().length >= 2, [form.businessName]);

  const onCheckBusinessName = async () => {
    const businessName = form.businessName.trim();
    if (businessName.length < 2) {
      toast.error('Enter at least 2 characters for business name check');
      return;
    }

    try {
      const response: any = await checkBusinessName({ businessName }).unwrap();
      const available = Boolean(response?.data?.available);
      const suggestions = Array.isArray(response?.data?.suggestions) ? response.data.suggestions : [];
      setBusinessCheck({
        available,
        suggestions,
        message: available ? 'Business name is available' : 'Business name already exists',
      });
      if (available) toast.success('Business name is available');
    } catch (error: any) {
      setBusinessCheck({ available: null, message: '', suggestions: [] });
      toast.error(error?.data?.message || 'Failed to check business name');
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;

    if (!form.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!PHONE_REGEX.test(form.phone.trim())) {
      toast.error('Phone must be in international format, e.g. +919876543210');
      return;
    }
    if (!form.password) {
      toast.error('Password is required');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Password and confirm password do not match');
      return;
    }

    const email = form.email.trim();
    const commissionDefaultRate = parseNumber(form.commissionDefaultRate, 0);
    const commissionDiamondRate = parseNumber(form.commissionDiamondRate, commissionDefaultRate);
    const commissionLaborRate = parseNumber(form.commissionLaborRate, commissionDefaultRate);
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      email: email || undefined,
      phone: form.phone.trim(),
      password: form.password,
      role: form.role,
      businessName: form.businessName.trim() || undefined,
      gstNumber: form.gstNumber.trim().toUpperCase() || undefined,
      panNumber: form.panNumber.trim().toUpperCase() || undefined,
      creditLimit: parseNumber(form.creditLimit, 0),
      walletBalance: parseNumber(form.walletBalance, 0),
      commissionRate: commissionDefaultRate,
      commissionConfig: {
        defaultRate: commissionDefaultRate,
        componentRates: {
          diamond: commissionDiamondRate,
          labor: commissionLaborRate,
        },
      },
      address: normalizeAddress(form.address),
    };

    try {
      const response: any = await registerUser(payload).unwrap();
      toast.success(response?.message || 'User onboarded successfully');
      setForm(createEmptyOnboardingForm());
      setBusinessCheck({ available: null, message: '', suggestions: [] });
    } catch (error: any) {
      const suggestions = Array.isArray(error?.data?.data?.suggestions) ? error.data.data.suggestions : [];
      setBusinessCheck({
        available: false,
        message: error?.data?.message || 'Failed to onboard user',
        suggestions,
      });
      toast.error(error?.data?.message || 'Failed to onboard user');
    }
  };

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="content-body">
          <div className="container-fluid py-4">
            <div className="alert alert-warning mb-0">Only admin and super-admin users can onboard new accounts.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="content-body user-list-page">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-3">
            <div className="col-sm-12 p-md-0">
              <div className="welcome-text">
                <h4 className="mb-1">User Onboarding</h4>
                <span className="text-muted">Create distributor, jeweler, staff, or finance accounts with initial limits and KYC metadata.</span>
              </div>
            </div>
          </div>

          <div className="card users-table-card">
            <div className="card-header border-0 pb-0">
              <h5 className="mb-0">Create New User</h5>
            </div>
            <div className="card-body">
              <form onSubmit={onSubmit}>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label>First Name</label>
                    <input className="form-control" value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} required />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Last Name</label>
                    <input className="form-control" value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Role</label>
                    <select className="form-control text-capitalize" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as OnboardingFormState['role'] }))}>
                      {USER_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {formatRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group col-md-4">
                    <label>Email (optional)</label>
                    <input type="email" className="form-control" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Phone</label>
                    <input className="form-control" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="+919876543210" required />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Business Name</label>
                    <div className="input-group">
                      <input className="form-control" value={form.businessName} onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))} />
                      <div className="input-group-append">
                        <button className="btn btn-outline-secondary" type="button" disabled={!canCheckBusinessName || isCheckingBusiness} onClick={onCheckBusinessName}>
                          {isCheckingBusiness ? 'Checking...' : 'Check'}
                        </button>
                      </div>
                    </div>
                    {businessCheck.message && <small className={`d-block mt-1 ${businessCheck.available ? 'text-success' : 'text-warning'}`}>{businessCheck.message}</small>}
                    {businessCheck.suggestions.length > 0 && (
                      <small className="d-block text-muted mt-1">Suggestions: {businessCheck.suggestions.join(', ')}</small>
                    )}
                  </div>

                  <div className="form-group col-md-4">
                    <label>Password</label>
                    <input type="password" className="form-control" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Confirm Password</label>
                    <input type="password" className="form-control" value={form.confirmPassword} onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} required />
                  </div>
                  <div className="form-group col-md-4">
                    <label>PAN Number</label>
                    <input className="form-control" value={form.panNumber} onChange={(event) => setForm((prev) => ({ ...prev, panNumber: event.target.value.toUpperCase() }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>GST Number</label>
                    <input className="form-control" value={form.gstNumber} onChange={(event) => setForm((prev) => ({ ...prev, gstNumber: event.target.value.toUpperCase() }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Credit Limit</label>
                    <input type="number" className="form-control" value={form.creditLimit} onChange={(event) => setForm((prev) => ({ ...prev, creditLimit: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Wallet Balance</label>
                    <input type="number" className="form-control" value={form.walletBalance} onChange={(event) => setForm((prev) => ({ ...prev, walletBalance: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Commission Default (%)</label>
                    <input type="number" className="form-control" value={form.commissionDefaultRate} onChange={(event) => setForm((prev) => ({ ...prev, commissionDefaultRate: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Diamond Commission (%)</label>
                    <input type="number" className="form-control" value={form.commissionDiamondRate} onChange={(event) => setForm((prev) => ({ ...prev, commissionDiamondRate: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Labor Commission (%)</label>
                    <input type="number" className="form-control" value={form.commissionLaborRate} onChange={(event) => setForm((prev) => ({ ...prev, commissionLaborRate: event.target.value }))} />
                  </div>
                </div>

                <hr />
                <h6 className="mb-3">Address</h6>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Street</label>
                    <input className="form-control" value={form.address.street || ''} onChange={(event) => setForm((prev) => ({ ...prev, address: { ...prev.address, street: event.target.value } }))} />
                  </div>
                  <div className="form-group col-md-3">
                    <label>City</label>
                    <input className="form-control" value={form.address.city || ''} onChange={(event) => setForm((prev) => ({ ...prev, address: { ...prev.address, city: event.target.value } }))} />
                  </div>
                  <div className="form-group col-md-3">
                    <label>State</label>
                    <input className="form-control" value={form.address.state || ''} onChange={(event) => setForm((prev) => ({ ...prev, address: { ...prev.address, state: event.target.value } }))} />
                  </div>
                  <div className="form-group col-md-3">
                    <label>Country</label>
                    <input className="form-control" value={form.address.country || ''} onChange={(event) => setForm((prev) => ({ ...prev, address: { ...prev.address, country: event.target.value } }))} />
                  </div>
                  <div className="form-group col-md-3">
                    <label>Pincode</label>
                    <input className="form-control" value={form.address.pincode || ''} onChange={(event) => setForm((prev) => ({ ...prev, address: { ...prev.address, pincode: event.target.value } }))} />
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-2">
                  <button className="btn btn-outline-secondary mr-2" type="button" onClick={() => setForm(createEmptyOnboardingForm())}>
                    Reset
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

