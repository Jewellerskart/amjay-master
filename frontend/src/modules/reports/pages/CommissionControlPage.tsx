import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { useGetCommissionsByInvoiceQuery, useGetCommissionsByUserQuery } from '@api/apiHooks/commission';
import '@styles/pages/dashboard.css';

export const CommissionControlPage = () => {
  const { data: user } = useAuthSellerLogin();
  const userId = user?._id || '';
  const [invoiceQueryId, setInvoiceQueryId] = useState('');
  const [lookupInvoice, setLookupInvoice] = useState('');

  const {
    data: userCommissionData,
    isFetching: isUserCommissionsLoading,
  } = useGetCommissionsByUserQuery(userId, { skip: !userId });
  const {
    data: invoiceCommissionData,
    isFetching: isInvoiceCommissionsLoading,
  } = useGetCommissionsByInvoiceQuery(lookupInvoice, { skip: !lookupInvoice });

  const commissions = useMemo(() => userCommissionData?.data?.commissions || [], [userCommissionData]);
  const invoiceCommissions = useMemo(() => invoiceCommissionData?.data?.commissions || [], [invoiceCommissionData]);

  const totalCommissionAmount = useMemo(
    () => commissions.reduce((total, item) => total + (Number(item?.commissionAmount) || 0), 0),
    [commissions]
  );

  const averageRate = useMemo(() => {
    if (!commissions.length) return 0;
    const sumRate = commissions.reduce((total, item) => total + (Number(item?.commissionRate) || 0), 0);
    return Number(sumRate / commissions.length).toFixed(2);
  }, [commissions]);

  const onLookupInvoice = () => {
    if (!invoiceQueryId.trim()) {
      toast.error('Enter an invoice id to lookup');
      return;
    }
    setLookupInvoice(invoiceQueryId.trim());
  };

  const isBusy = isUserCommissionsLoading || isInvoiceCommissionsLoading;

  return (
    <>
      <Header />
      <div className="content-body">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-4 dashboard-hero">
            <div className="col-sm-12 p-md-0">
              <div className="welcome-text">
                <h4 className="mb-1">Commissions Control</h4>
                <span className="text-muted text-capitalize">
                  {user?.role || 'User'} • {user?.businessName || 'General'}
                </span>
                <div className="hero-tags mt-3">
                  <span className="hero-tag">Commission Ledger</span>
                  <span className="hero-tag">POS Sell Sync</span>
                  <span className="hero-tag">Auto Assignment</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <small className="text-muted">Recorded Entries</small>
                  <h3 className="mb-1">{commissions.length}</h3>
                  <p className="mb-0 text-capitalize">Total nodes recorded</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <small className="text-muted">Total Commission</small>
                  <h3 className="mb-1">?{totalCommissionAmount.toLocaleString('en-IN')}</h3>
                  <p className="mb-0 text-capitalize">Revenue collected</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <small className="text-muted">Avg. Rate</small>
                  <h3 className="mb-1">{averageRate}%</h3>
                  <p className="mb-0 text-capitalize">Commission rate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card dashboard-table-card mt-3">
            <div className="card-header d-flex justify-content-between">
              <h5 className="mb-0">Recent Commissions</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive table-ui-responsive">
                <table className="table table-ui mb-0">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Product</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.slice(0, 6).map((item) => (
                      <tr key={item?._id || `${item?.invoiceId}-${item?.productId}`}>
                        <td>{item?.invoiceId || '-'}</td>
                        <td>{item?.productId || '-'}</td>
                        <td>{item?.commissionRate ?? '-'}%</td>
                        <td>?{(item?.commissionAmount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {!commissions.length && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          No commissions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-header d-flex flex-wrap align-items-center">
              <h5 className="mb-0 mr-auto">Invoice Lookup</h5>
              <div className="d-flex align-items-center">
                <input
                  type="text"
                  className="form-control mr-2"
                  placeholder="Enter invoice ID"
                  value={invoiceQueryId}
                  onChange={(event) => setInvoiceQueryId(event.target.value)}
                />
                <button className="btn btn-sm btn-primary" onClick={onLookupInvoice} disabled={isBusy}>
                  {isBusy ? 'Searching…' : 'Fetch invoice'}
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive table-ui-responsive">
                <table className="table table-ui mb-0">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Product</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceCommissions.length > 0 ? (
                      invoiceCommissions.map((item) => (
                        <tr key={item?._id || `${item?.invoiceId}-${item?.productId}`}>
                          <td>{item?.invoiceId || '-'}</td>
                          <td>{item?.productId || '-'}</td>
                          <td>{item?.commissionRate ?? '-'}%</td>
                          <td>?{(item?.commissionAmount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          {lookupInvoice ? 'No commission records for this invoice.' : 'Search for an invoice to inspect its commissions.'}
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
    </>
  );
};
