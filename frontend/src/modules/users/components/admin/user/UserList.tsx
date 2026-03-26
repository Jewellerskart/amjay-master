import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthApi } from '@api/index';
import type { ApiResponse } from '@api/types';
import { UrlTablePagination } from '@common/TablePagination';
import { useUrlPagination } from '@hooks/useUrlPagination';
import { UserAccountUrl } from '@variable';
import type { UserEntity, UsersSummary } from '../../../types';
import { EMPTY_SUMMARY, formatCurrencyInr, formatDateTime, formatRoleLabel, getUserDisplayName } from '../../../utils';

type SearchBy = '' | 'firstName' | 'lastName' | 'email' | 'phone' | 'businessName';

const getKycState = (user: UserEntity) => {
  if (user.kycVerified) return 'verified';
  return Array.isArray(user.kycDocuments) && user.kycDocuments.length > 0 ? 'submitted' : 'missing';
};

const getUserStatus = (user: UserEntity) => {
  if (user.isBlocked) return 'blocked';
  if (user.isActive === false) return 'inactive';
  return 'active';
};

const getStateClass = (state: string) => {
  if (state === 'verified' || state === 'active') return 'badge badge-success';
  if (state === 'submitted' || state === 'inactive') return 'badge badge-warning';
  return 'badge badge-secondary';
};

const formatState = (state: string) => `${state.charAt(0).toUpperCase()}${state.slice(1)}`;
const getUserMetrics = (user: UserEntity) => ({
  outrightProducts: Number(user?.stats?.outrightProducts || 0),
  rentedProducts: Number(user?.stats?.rentedProducts || 0),
  pendingPaymentAmount: Number(user?.stats?.pendingPaymentAmount || 0),
});

export const UserList = () => {
  const [fetchUsers, { isLoading }] = AuthApi.useGetUsersMutation();
  const [deleteUserByEmail, { isLoading: isDeleting }] = AuthApi.useDeleteUserByEmailMutation();
  const { page, limit, setPage } = useUrlPagination();

  const [users, setUsers] = useState<UserEntity[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [summary, setSummary] = useState<UsersSummary>(EMPTY_SUMMARY);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<SearchBy>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');

  const loadUsers = useCallback(async () => {
    const payload = {
      page,
      limit,
      sort: sortBy,
      order,
      search,
      search_by: searchBy,
    };

    const response = await fetchUsers(payload)
      .unwrap()
      .catch(() => ({}) as ApiResponse);
    const list = Array.isArray(response?.data?.data) ? (response.data.data as UserEntity[]) : [];
    const nextSummary = response?.data?.summary || {};

    setUsers(list);
    setTotalUsers(Number(response?.data?.count || 0));
    setSummary({
      totalUsers: Number(nextSummary?.totalUsers || 0),
      verifiedUsers: Number(nextSummary?.verifiedUsers || 0),
      pendingKyc: Number(nextSummary?.pendingKyc || 0),
      totalCreditLimit: Number(nextSummary?.totalCreditLimit || 0),
      totalWalletBalance: Number(nextSummary?.totalWalletBalance || 0),
      displayedOutrightProducts: Number(nextSummary?.displayedOutrightProducts || 0),
      displayedRentedProducts: Number(nextSummary?.displayedRentedProducts || 0),
      displayedPendingPaymentAmount: Number(nextSummary?.displayedPendingPaymentAmount || 0),
    });
  }, [fetchUsers, limit, order, page, search, searchBy, sortBy]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const visibleActiveUsers = useMemo(() => users.filter((item) => !item.isBlocked && item.isActive !== false).length, [users]);
  const visibleBlockedUsers = useMemo(() => users.filter((item) => Boolean(item.isBlocked)).length, [users]);
  const displayedOutrightProducts = useMemo(() => users.reduce((sum, user) => sum + getUserMetrics(user).outrightProducts, 0), [users]);
  const displayedRentedProducts = useMemo(() => users.reduce((sum, user) => sum + getUserMetrics(user).rentedProducts, 0), [users]);
  const displayedPendingPayment = useMemo(() => users.reduce((sum, user) => sum + getUserMetrics(user).pendingPaymentAmount, 0), [users]);

  const onSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetSearchFilters = () => {
    setSearchInput('');
    setSearch('');
    setSearchBy('');
    setSortBy('createdAt');
    setOrder('DESC');
    setPage(1);
  };

  const onDelete = async (email?: string) => {
    const normalizedEmail = `${email || ''}`.trim();
    if (!normalizedEmail) return;
    if (!window.confirm(`Delete user ${normalizedEmail}? This action cannot be undone.`)) return;

    try {
      await deleteUserByEmail({ email: normalizedEmail }).unwrap();
      toast.success('User deleted successfully');
      await loadUsers();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="content-body user-list-page">
      <div className="container-fluid">
        <div className="row mb-3">
          <div className="col-md-4 col-lg-2 stats-card mb-2">
            <div className="card">
              <div className="card-body py-3">
                <small className="text-muted">Total Users</small>
                <h3 className="mb-0">{summary.totalUsers || totalUsers}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-lg-2 stats-card mb-2">
            <div className="card">
              <div className="card-body py-3">
                <small className="text-muted">Verified KYC</small>
                <h3 className="mb-0 text-success">{summary.verifiedUsers}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-lg-2 stats-card mb-2">
            <div className="card">
              <div className="card-body py-3">
                <small className="text-muted">Pending KYC</small>
                <h3 className="mb-0 text-warning">{summary.pendingKyc}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-lg-2 stats-card mb-2">
            <div className="card">
              <div className="card-body py-3">
                <small className="text-muted">Outright (Visible)</small>
                <h3 className="mb-0 text-info">{summary.displayedOutrightProducts || displayedOutrightProducts}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-lg-2 stats-card mb-2">
            <div className="card">
              <div className="card-body py-3">
                <small className="text-muted">Rented (Visible)</small>
                <h3 className="mb-0 text-primary">{summary.displayedRentedProducts || displayedRentedProducts}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-lg-2 stats-card mb-2">
            <div className="card">
              <div className="card-body py-3">
                <small className="text-muted">Pending (Visible)</small>
                <h3 className="mb-0 text-danger">{formatCurrencyInr(summary.displayedPendingPaymentAmount || displayedPendingPayment)}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-end mb-2 text-muted small">
          Visible users: {visibleActiveUsers} active / {visibleBlockedUsers} blocked
        </div>

        <div className="card users-table-card">
          <div className="row page-titles mx-0 mb-1">
            <div className="col-sm-12 p-md-0 d-flex justify-content-between align-items-center flex-wrap">
              <div className="welcome-text">
                <h4 className="mb-1">User Master</h4>
                <span className="text-muted">Browse users, review KYC status, and open full profile management.</span>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => loadUsers()} disabled={isLoading}>
                <i className={`fa ${isLoading ? 'fa-spinner fa-spin' : 'fa-refresh'} mr-1`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row align-items-end">
              <div className="col-md-5 mb-2">
                <label className="mb-1 small text-muted">Search</label>
                <div className="pm-input-wrap">
                  <input
                    className="form-control pm-search-input"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onSearch();
                    }}
                    placeholder="Name, email, phone or business"
                  />
                  <button type="button" className="pm-input-icon pm-input-action" onClick={onSearch} aria-label="Search users">
                    <i className="fa fa-search" aria-hidden="true" />
                  </button>
                  <button type="button" className="pm-input-clear" onClick={resetSearchFilters} aria-label="Reset user filters">
                    <i className="fa fa-times" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="col-md-3 mb-2">
                <label className="mb-1 small text-muted">Search By</label>
                <select className="form-control" value={searchBy} onChange={(event) => setSearchBy(event.target.value as SearchBy)}>
                  <option value="">Any</option>
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="businessName">Business Name</option>
                </select>
              </div>
              <div className="col-md-2 mb-2">
                <label className="mb-1 small text-muted">Sort</label>
                <select className="form-control" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="createdAt">Created At</option>
                  <option value="firstName">First Name</option>
                  <option value="email">Email</option>
                  <option value="creditLimit">Credit Limit</option>
                  <option value="walletBalance">Wallet Balance</option>
                </select>
              </div>
              <div className="col-md-2 mb-2">
                <label className="mb-1 small text-muted">Order</label>
                <select className="form-control" value={order} onChange={(event) => setOrder(event.target.value as 'ASC' | 'DESC')}>
                  <option value="DESC">Desc</option>
                  <option value="ASC">Asc</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive table-ui-responsive users-table-wrapper">
              <table className="table table-ui text-center mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>KYC</th>
                    <th>Status</th>
                    <th>Credit</th>
                    <th>Wallet</th>
                    <th>Outright</th>
                    <th>Rented</th>
                    <th>Pending Payment</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={13} className="text-muted py-4">
                        Loading users...
                      </td>
                    </tr>
                  )}
                  {!isLoading && users.length === 0 && (
                    <tr>
                      <td colSpan={13} className="text-muted py-4">
                        No users found for this query.
                      </td>
                    </tr>
                  )}
                  {!isLoading &&
                    users.map((user) => {
                      const userEmail = `${user.email || ''}`.trim();
                      const detailsLink = userEmail ? UserAccountUrl.replace(':email', encodeURIComponent(userEmail)) : '#';
                      const kycState = getKycState(user);
                      const userStatus = getUserStatus(user);
                      const metrics = getUserMetrics(user);

                      return (
                        <tr key={user._id || userEmail} className="user-row">
                          <td>{getUserDisplayName(user)}</td>
                          <td>{userEmail || '-'}</td>
                          <td>{user.phone || '-'}</td>
                          <td className="text-capitalize">{formatRoleLabel(user.role)}</td>
                          <td>
                            <span className={getStateClass(kycState)}>{formatState(kycState)}</span>
                          </td>
                          <td>
                            <span className={getStateClass(userStatus)}>{formatState(userStatus)}</span>
                          </td>
                          <td>{formatCurrencyInr(user.creditLimit)}</td>
                          <td>{formatCurrencyInr(user.walletBalance)}</td>
                          <td>
                            <span className="badge badge-pill badge-light">{metrics.outrightProducts}</span>
                          </td>
                          <td>
                            <span className="badge badge-pill badge-light">{metrics.rentedProducts}</span>
                          </td>
                          <td className="font-weight-bold text-danger">{formatCurrencyInr(metrics.pendingPaymentAmount)}</td>
                          <td>{formatDateTime(user.createdAt)}</td>
                          <td>
                            <div className="d-flex justify-content-center">
                              <Link
                                to={detailsLink}
                                className={`btn btn-sm btn-outline-primary mr-2 ${!userEmail ? 'disabled' : ''}`}
                                onClick={(event) => {
                                  if (!userEmail) event.preventDefault();
                                }}
                              >
                                Manage
                              </Link>
                              <button className="btn btn-sm btn-outline-danger" type="button" disabled={!userEmail || isDeleting} onClick={() => onDelete(userEmail)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <UrlTablePagination total={totalUsers} pageSizeOptions={[10, 25, 50]} />
            <div className="d-flex justify-content-between mt-3 text-muted small">
              <div>Total credit: {formatCurrencyInr(summary.totalCreditLimit)}</div>
              <div>Total wallet: {formatCurrencyInr(summary.totalWalletBalance)}</div>
              <div>Pending payment: {formatCurrencyInr(summary.displayedPendingPaymentAmount || displayedPendingPayment)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
