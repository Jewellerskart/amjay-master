import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { AuthApi } from '@api/index';
import { useGetPosReportQuery } from '@api/apiHooks/pos';
import type { TApiResponse } from '@types';
import { allUserAccountUrl, invoicePageUrl, onBoardingPageUrl, posSaleUrl } from '@variable';
import { isAdminRole } from '@shared/utils/roles';
import '@styles/pages/dashboard.css';
import { IndNumberFormat } from '@utils/formateDate';

type DashboardData = {
  users: any[];
  totalUsers: number;
  verifiedUsers: number;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const modeLabel = (mode: string) => (mode === 'MEMO' ? 'Memo' : mode === 'PURCHASE' ? 'Outright' : mode || '-');

export const Home = () => {
  const { data: currentUser, isLoading: isUserLoading } = useAuthSellerLogin();
  const isAdminUser = isAdminRole(currentUser?.role);
  const [fetchUsers] = AuthApi.useGetUsersMutation();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    users: [],
    totalUsers: 0,
    verifiedUsers: 0,
  });
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  const { data: posReportResponse, isFetching: isPosReportLoading } = useGetPosReportQuery(
    { limit: 8 },
    { skip: !currentUser?._id }
  );

  const reportMetrics = posReportResponse?.data?.metrics;
  const recentTransactions = useMemo(() => posReportResponse?.data?.recentTransactions || [], [posReportResponse]);
  const memoAging = useMemo(() => posReportResponse?.data?.memoAging || [], [posReportResponse]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!currentUser || !isAdminUser) {
        setIsUsersLoading(false);
        return;
      }

      setIsUsersLoading(true);
      try {
        const payload = {
          page: 1,
          limit: 10,
          sort: 'createdAt',
          order: 'DESC',
          search: '',
          search_by: '',
        };

        const usersRes = await fetchUsers(payload)
          .unwrap()
          .catch(() => ({}) as TApiResponse);
        const usersData = usersRes?.data?.data || [];
        const usersSummary = usersRes?.data?.summary || {};

        setDashboardData({
          users: Array.isArray(usersData) ? usersData : [],
          totalUsers: Number(usersSummary?.totalUsers || 0) || usersRes?.data?.count || (Array.isArray(usersData) ? usersData.length : 0),
          verifiedUsers: Number(usersSummary?.verifiedUsers || 0),
        });
      } finally {
        setIsUsersLoading(false);
      }
    };

    loadUsers();
  }, [currentUser, fetchUsers, isAdminUser]);

  const isLoading = isUserLoading || isUsersLoading || isPosReportLoading;

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="content-body">
          <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="content-body dashboard-page">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-4 dashboard-hero">
            <div className="col-sm-12 p-md-0">
              <div className="welcome-text">
                <h4 className="mb-1">
                  Welcome, {currentUser?.firstName || 'User'} {currentUser?.lastName || ''}
                </h4>
                <span className="text-muted text-capitalize">Role: {currentUser?.role || 'member'}</span>
                <div className="hero-tags mt-3">
                  <span className="hero-tag">Sold: {reportMetrics?.soldCount || 0}</span>
                  <span className="hero-tag">On Memo: {reportMetrics?.activeMemoCount || 0}</span>
                  <span className="hero-tag">Pending: {reportMetrics?.pendingInvoiceCount || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Sold Products</small>
                  <h3 className="mb-0">{reportMetrics?.soldCount || 0}</h3>
                  <small className="text-muted">
                    Outright {reportMetrics?.soldOutrightCount || 0} | Memo {reportMetrics?.soldMemoCount || 0}
                  </small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Inventory In Use</small>
                  <h3 className="mb-0">{reportMetrics?.activeOutrightCount || 0}</h3>
                  <small className="text-muted">Active Outright</small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Memo Aging</small>
                  <h3 className="mb-0">{reportMetrics?.activeMemoCount || 0}</h3>
                  <small className="text-muted">
                    Avg {reportMetrics?.avgMemoDays || 0}d | Max {reportMetrics?.maxMemoDays || 0}d
                  </small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Pending Receivable</small>
                  <h3 className="mb-0">Rs {IndNumberFormat(reportMetrics?.pendingInvoiceAmount || 0)}</h3>
                  <small className="text-muted">{reportMetrics?.pendingInvoiceCount || 0} invoices</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Gross Sales</small>
                  <h3 className="mb-0">Rs {IndNumberFormat(reportMetrics?.totalGrossSales || 0)}</h3>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Net Payable</small>
                  <h3 className="mb-0">Rs {IndNumberFormat(reportMetrics?.totalNetPayable || 0)}</h3>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Commission Deduction</small>
                  <h3 className="mb-0">Rs {IndNumberFormat(reportMetrics?.totalCommissionDeduction || 0)}</h3>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Quick Actions</small>
                  <div className="mt-2">
                    <Link to={invoicePageUrl} className="btn btn-sm btn-primary mr-2">
                      Invoices
                    </Link>
                    <Link to={posSaleUrl} className="btn btn-sm btn-outline-primary">
                      Sell Product
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-xl-7">
              <div className="card dashboard-table-card">
                <div className="card-header d-flex justify-content-between">
                  <h5 className="mb-0">Recent Order Transactions</h5>
                  <Link to={invoicePageUrl}>View all</Link>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive table-ui-responsive">
                    <table className="table table-ui mb-0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Product</th>
                          <th>Mode</th>
                          <th>Gross</th>
                          <th>Payable</th>
                          <th>Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((item) => (
                          <tr key={item?._id || item?.invoiceId}>
                            <td>{formatDateTime(item?.createdAt)}</td>
                            <td>
                              <div className="font-weight-bold">{item?.jewelCode || '-'}</div>
                              <small className="text-muted">{item?.styleCode || '-'}</small>
                            </td>
                            <td>{modeLabel(item?.choice || '')}</td>
                            <td>Rs {IndNumberFormat(item?.finalPrice || 0)}</td>
                            <td>Rs {IndNumberFormat(item?.amount || 0)}</td>
                            <td>Rs {IndNumberFormat(item?.commissionDeduction || 0)}</td>
                          </tr>
                        ))}
                        {recentTransactions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-muted">
                              No transactions available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-5">
              <div className="card dashboard-table-card">
                <div className="card-header d-flex justify-content-between">
                  <h5 className="mb-0">Memo Aging Report</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive table-ui-responsive">
                    <table className="table table-ui mb-0">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Holder</th>
                          <th>Days</th>
                          <th>Since</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memoAging.map((item) => (
                          <tr key={item?._id}>
                            <td>
                              <div className="font-weight-bold">{item?.jewelCode || '-'}</div>
                              <small className="text-muted">{item?.styleCode || '-'}</small>
                            </td>
                            <td>{item?.holderName || '-'}</td>
                            <td>{item?.memoDays || 0}d</td>
                            <td>{formatDateTime(item?.memoSince)}</td>
                          </tr>
                        ))}
                        {memoAging.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center text-muted">
                              No active memo products.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isAdminUser && (
            <div className="row mt-2">
              <div className="col-xl-12">
                <div className="card dashboard-table-card">
                  <div className="card-header d-flex justify-content-between">
                    <h5 className="mb-0">Recent Users</h5>
                    <div>
                      <Link to={allUserAccountUrl} className="mr-3">
                        View all
                      </Link>
                      <Link to={onBoardingPageUrl}>Onboard</Link>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive table-ui-responsive">
                      <table className="table table-ui mb-0">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>KYC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.users.slice(0, 6).map((user) => (
                            <tr key={user?._id || user?.email}>
                              <td>
                                {user?.firstName || ''} {user?.lastName || ''}
                              </td>
                              <td>{user?.email || '-'}</td>
                              <td className="text-capitalize">{user?.role || '-'}</td>
                              <td>{user?.kycVerified ? 'Verified' : 'Pending'}</td>
                            </tr>
                          ))}
                          {dashboardData.users.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                No users available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
