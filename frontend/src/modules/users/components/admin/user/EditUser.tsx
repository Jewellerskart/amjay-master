import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthApi } from '@api/index';
import { allUserAccountUrl } from '@variable';
import type { EditUserFormState, IKycDocument, KycUploadDraft, UserEntity } from '../../../types';
import {
  KYC_DOCUMENT_OPTIONS,
  USER_ROLE_OPTIONS,
  createEmptyEditUserForm,
  createKycDraft,
  formatDateTime,
  formatRoleLabel,
  mapUserToEditForm,
  parseNumber,
} from '../../../utils';

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export const EditUser = () => {
  const navigate = useNavigate();
  const { email: emailParam } = useParams();
  const email = useMemo(() => decodeURIComponent(`${emailParam || ''}`).trim().toLowerCase(), [emailParam]);

  const { data, isFetching, refetch } = AuthApi.useGetUserByEmailQuery(email, { skip: !email });
  const [updateUserByEmail, { isLoading: isSaving }] = AuthApi.useUpdateUserByEmailMutation();
  const [deleteUserByEmail, { isLoading: isDeleting }] = AuthApi.useDeleteUserByEmailMutation();
  const [uploadKycDocument, { isLoading: isUploadingKyc }] = AuthApi.useUploadKycDocumentMutation();

  const [form, setForm] = useState<EditUserFormState>(createEmptyEditUserForm());
  const [kycDraft, setKycDraft] = useState<KycUploadDraft>(createKycDraft());

  const user = useMemo(() => data?.data?.user as UserEntity | undefined, [data]);
  const userDocs = useMemo(() => (Array.isArray(user?.kycDocuments) ? user.kycDocuments : []), [user?.kycDocuments]);

  useEffect(() => {
    if (!user) return;
    setForm(mapUserToEditForm(user));
  }, [user]);

  const onSave = async () => {
    if (!email) return;
    const firstName = form.firstName.trim();
    if (firstName.length < 2) {
      toast.error('First name must have at least 2 characters');
      return;
    }

    const phone = form.phone.trim();

    if (phone && !PHONE_REGEX.test(phone)) {
      toast.error('Phone must be in international format, e.g. +919876543210');
      return;
    }

    const normalizedAddress = {
      street: form.address.street?.trim() || undefined,
      city: form.address.city?.trim() || undefined,
      state: form.address.state?.trim() || undefined,
      country: form.address.country?.trim() || undefined,
      pincode: form.address.pincode?.trim() || undefined,
    };
    const hasAddress = Object.values(normalizedAddress).some((value) => Boolean(value));
    const commissionDefaultRate = parseNumber(form.commissionDefaultRate, 0);
    const commissionDiamondRate = parseNumber(form.commissionDiamondRate, commissionDefaultRate);
    const commissionLaborRate = parseNumber(form.commissionLaborRate, commissionDefaultRate);

    try {
      await updateUserByEmail({
        email,
        payload: {
          firstName,
          lastName: form.lastName.trim() || undefined,
          phone: phone || undefined,
          role: form.role,
          gstNumber: form.gstNumber.trim() || undefined,
          panNumber: form.panNumber.trim() || undefined,
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
          isActive: form.isActive,
          isBlocked: form.isBlocked,
          kycVerified: form.kycVerified,
          address: hasAddress ? normalizedAddress : undefined,
        },
      }).unwrap();

      toast.success('User profile updated');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update user');
    }
  };

  const onDelete = async () => {
    if (!email) return;
    if (!window.confirm(`Delete user ${email}? This action cannot be undone.`)) return;

    try {
      await deleteUserByEmail({ email }).unwrap();
      toast.success('User deleted successfully');
      navigate(allUserAccountUrl);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete user');
    }
  };

  const onUploadKyc = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?._id) return;

    if (!kycDraft.documentNumber.trim()) {
      toast.error('Document number is required');
      return;
    }

    try {
      await uploadKycDocument({
        userId: user._id,
        documentType: kycDraft.documentType,
        documentNumber: kycDraft.documentNumber.trim(),
        verified: kycDraft.verified,
        document: kycDraft.document,
      }).unwrap();

      toast.success('KYC document updated');
      setKycDraft(createKycDraft());
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to upload KYC document');
    }
  };

  const onToggleDocumentVerification = async (document: IKycDocument) => {
    if (!user?._id) return;

    try {
      await uploadKycDocument({
        userId: user._id,
        documentType: document.documentType,
        documentNumber: document.documentNumber,
        verified: !document.verified,
      }).unwrap();
      toast.success('Document verification updated');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update document verification');
    }
  };

  if (!email) {
    return (
      <div className="content-body">
        <div className="container-fluid py-4">
          <div className="alert alert-warning mb-0">Invalid user email in route.</div>
        </div>
      </div>
    );
  }

  if (isFetching) {
    return (
      <div className="content-body">
        <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content-body">
        <div className="container-fluid py-4">
          <div className="alert alert-light d-flex justify-content-between align-items-center">
            <span>User not found.</span>
            <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => navigate(allUserAccountUrl)}>
              Back to User List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-body user-list-page">
      <div className="container-fluid">
        <div className="row page-titles mx-0 mb-3">
          <div className="col-sm-12 p-md-0 d-flex justify-content-between align-items-center flex-wrap">
            <div className="welcome-text">
              <h4 className="mb-1">Manage User</h4>
              <span className="text-muted">
                {user.firstName} {user.lastName || ''} - {email}
              </span>
            </div>
            <button className="btn btn-outline-secondary" type="button" onClick={() => navigate(allUserAccountUrl)}>
              Back to User List
            </button>
          </div>
        </div>

        <div className="row">
          <div className="col-xl-8">
            <div className="card users-table-card mb-3">
              <div className="card-header border-0 pb-0">
                <h5 className="mb-0">Profile Details</h5>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>First Name</label>
                    <input className="form-control" value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-6">
                    <label>Last Name</label>
                    <input className="form-control" value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-6">
                    <label>Email</label>
                    <input className="form-control" value={email} disabled />
                  </div>
                  <div className="form-group col-md-6">
                    <label>Phone</label>
                    <input className="form-control" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Role</label>
                    <select className="form-control text-capitalize" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as EditUserFormState['role'] }))}>
                      {USER_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {formatRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-4">
                    <label>GST Number</label>
                    <input className="form-control" value={form.gstNumber} onChange={(event) => setForm((prev) => ({ ...prev, gstNumber: event.target.value.toUpperCase() }))} />
                  </div>
                  <div className="form-group col-md-4">
                    <label>PAN Number</label>
                    <input className="form-control" value={form.panNumber} onChange={(event) => setForm((prev) => ({ ...prev, panNumber: event.target.value.toUpperCase() }))} />
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

                <div className="form-row">
                  <div className="col-md-4 mb-2">
                    <div className="custom-control custom-switch">
                      <input type="checkbox" className="custom-control-input" id="is-active-toggle" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                      <label className="custom-control-label" htmlFor="is-active-toggle">
                        Active
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4 mb-2">
                    <div className="custom-control custom-switch">
                      <input type="checkbox" className="custom-control-input" id="is-blocked-toggle" checked={form.isBlocked} onChange={(event) => setForm((prev) => ({ ...prev, isBlocked: event.target.checked }))} />
                      <label className="custom-control-label" htmlFor="is-blocked-toggle">
                        Blocked
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4 mb-2">
                    <div className="custom-control custom-switch">
                      <input type="checkbox" className="custom-control-input" id="is-kyc-verified-toggle" checked={form.kycVerified} onChange={(event) => setForm((prev) => ({ ...prev, kycVerified: event.target.checked }))} />
                      <label className="custom-control-label" htmlFor="is-kyc-verified-toggle">
                        KYC Verified
                      </label>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-3">
                  <button className="btn btn-primary" type="button" onClick={onSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card users-table-card mb-3">
              <div className="card-header border-0 pb-0">
                <h5 className="mb-0">Audit Snapshot</h5>
              </div>
              <div className="card-body">
                <div className="mb-2">
                  <small className="text-muted d-block">Created</small>
                  <div>{formatDateTime(user.createdAt)}</div>
                </div>
                <div className="mb-2">
                  <small className="text-muted d-block">Updated</small>
                  <div>{formatDateTime(user.updatedAt)}</div>
                </div>
                <div className="mb-2">
                  <small className="text-muted d-block">Business Name</small>
                  <div>{user.businessName || '-'}</div>
                </div>
              </div>
            </div>

            <div className="card users-table-card mb-3">
              <div className="card-header border-0 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">KYC Documents</h5>
                <span className="badge badge-light">{userDocs.length}</span>
              </div>
              <div className="card-body">
                {userDocs.length === 0 && <div className="text-muted">No documents uploaded yet.</div>}
                {userDocs.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Number</th>
                          <th>Verified</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDocs.map((doc) => (
                          <tr key={`${doc.documentType}-${doc.documentNumber}`}>
                            <td className="text-capitalize">{doc.documentType}</td>
                            <td>{doc.documentNumber}</td>
                            <td>
                              <span className={`badge ${doc.verified ? 'badge-success' : 'badge-warning'}`}>{doc.verified ? 'Yes' : 'No'}</span>
                            </td>
                            <td>
                              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => onToggleDocumentVerification(doc)} disabled={isUploadingKyc}>
                                Toggle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <hr />
                <form onSubmit={onUploadKyc}>
                  <div className="form-group">
                    <label>Document Type</label>
                    <select className="form-control" value={kycDraft.documentType} onChange={(event) => setKycDraft((prev) => ({ ...prev, documentType: event.target.value as KycUploadDraft['documentType'] }))}>
                      {KYC_DOCUMENT_OPTIONS.map((docType) => (
                        <option key={docType} value={docType}>
                          {docType.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Document Number</label>
                    <input className="form-control" value={kycDraft.documentNumber} onChange={(event) => setKycDraft((prev) => ({ ...prev, documentNumber: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Document File (optional for existing type)</label>
                    <input type="file" className="form-control" onChange={(event) => setKycDraft((prev) => ({ ...prev, document: event.target.files?.[0] || null }))} />
                  </div>
                  <div className="form-group">
                    <div className="custom-control custom-switch">
                      <input type="checkbox" className="custom-control-input" id="kyc-draft-verified" checked={kycDraft.verified} onChange={(event) => setKycDraft((prev) => ({ ...prev, verified: event.target.checked }))} />
                      <label className="custom-control-label" htmlFor="kyc-draft-verified">
                        Verified
                      </label>
                    </div>
                  </div>
                  <button className="btn btn-outline-primary btn-sm" type="submit" disabled={isUploadingKyc}>
                    {isUploadingKyc ? 'Uploading...' : 'Upsert Document'}
                  </button>
                </form>
              </div>
            </div>

            <div className="card border-danger">
              <div className="card-body">
                <h6 className="text-danger">Danger Zone</h6>
                <p className="text-muted mb-3">Delete this user account permanently.</p>
                <button className="btn btn-outline-danger btn-sm" type="button" onClick={onDelete} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

