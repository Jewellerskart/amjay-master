import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { AuthApi } from '@api/api.index';
import { TApiResponse } from '@types';
import { allUserAccountUrl, commissionControlUrl, onBoardingPageUrl } from '@variable';
import { useGetCommissionsByUserQuery } from '@api/apiHooks/commission';
import { isAdminRole } from '@shared/utils/roles';
import '@styles/pages/dashboard.css';
import { IndNumberFormat } from '@utils/formateDate';

type DashboardData = {
  users: any[];
  totalUsers: number;
  verifiedUsers: number;
  totalCreditLimit: number;
  totalWalletBalance: number;
};

export const Home = () => {
  const { data: currentUser, isLoading: isUserLoading } = useAuthSellerLogin();
  const isAdminUser = isAdminRole(currentUser?.role);
  const [fetchUsers] = AuthApi.useGetUsersMutation();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    users: [],
    totalUsers: 0,
    verifiedUsers: 0,
    totalCreditLimit: 0,
    totalWalletBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const { data: commissionResponse } = useGetCommissionsByUserQuery(`${currentUser?._id || ''}`, {
    skip: !currentUser?._id,
  });

  const commissions = useMemo(() => commissionResponse?.data?.commissions || [], [commissionResponse]);
  const recentCommissions = commissions.slice(0, 5);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!currentUser) return;

      setIsLoading(true);
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
          totalCreditLimit: Number(usersSummary?.totalCreditLimit || 0),
          totalWalletBalance: Number(usersSummary?.totalWalletBalance || 0),
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [currentUser, fetchUsers]);

  const verifiedUsersCount = useMemo(() => dashboardData.verifiedUsers, [dashboardData.verifiedUsers]);

  if (isUserLoading || isLoading) {
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
                  <span className="hero-tag">User Ops</span>
                  <span className="hero-tag">Commission Ledger</span>
                  <span className="hero-tag">Inventory Sync</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Total Users</small>
                  <h3 className="mb-0">{dashboardData.totalUsers}</h3>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Verified Users</small>
                  <h3 className="mb-0 text-success">{verifiedUsersCount}</h3>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Commission Entries</small>
                  <h3 className="mb-0 text-primary">{commissions.length}</h3>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 dashboard-stat">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">Quick Actions</small>
                  <div className="mt-2 mb-2">
                    <small className="d-block text-muted">Credit: {IndNumberFormat(dashboardData.totalCreditLimit)}</small>
                    <small className="d-block text-muted">Wallet: {IndNumberFormat(dashboardData.totalWalletBalance)}</small>
                  </div>
                  <div className="mt-2">
                    <Link to={isAdminUser ? onBoardingPageUrl : allUserAccountUrl} className="btn btn-sm btn-primary mr-2">
                      {isAdminUser ? 'Onboard' : 'Users'}
                    </Link>
                    <Link to={commissionControlUrl} className="btn btn-sm btn-outline-primary">
                      Commission Control
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-xl-6">
              <div className="card dashboard-table-card">
                <div className="card-header d-flex justify-content-between">
                  <h5 className="mb-0">Recent Users</h5>
                  <Link to={allUserAccountUrl}>View all</Link>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive table-ui-responsive">
                    <table className="table table-ui mb-0">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.users.slice(0, 5).map((user) => (
                          <tr key={user?._id || user?.email}>
                            <td>
                              {user?.firstName || ''} {user?.lastName || ''}
                            </td>
                            <td>{user?.email || '-'}</td>
                            <td className="text-capitalize">{user?.role || '-'}</td>
                          </tr>
                        ))}
                        {dashboardData.users.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center text-muted">
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

            <div className="col-xl-6">
              <div className="card dashboard-table-card">
                <div className="card-header d-flex justify-content-between">
                  <h5 className="mb-0">Recent Commissions</h5>
                  <Link to={commissionControlUrl}>View all</Link>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive table-ui-responsive">
                    <table className="table table-ui mb-0">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Product</th>
                          <th>Amount</th>
                          <th>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentCommissions.map((item) => (
                          <tr key={item?._id || `${item?.invoiceId}-${item?.productId}`}>
                            <td>{item?.invoiceId || '-'}</td>
                            <td>{item?.productId || '-'}</td>
                            <td>₹{IndNumberFormat(item?.commissionAmount || 0)}</td>
                            <td>{item?.commissionRate ?? '-'}%</td>
                          </tr>
                        ))}
                        {!recentCommissions.length && (
                          <tr>
                            <td colSpan={4} className="text-center text-muted">
                              No commission data available.
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
        </div>
      </div>
    </>
  );
};
