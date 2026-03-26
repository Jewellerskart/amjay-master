import { useEffect, useMemo } from 'react';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { useListInvoicesMutation, type InvoiceListItem } from '@api/apiHooks/invoice';
import { IndNumberFormat } from '@utils/formateDate';

const normalizeInvoiceType = (value?: string) => {
  const key = `${value || ''}`.trim().toLowerCase();
  if (key === 'memo' || key === 'rent') return 'Memo';
  if (key === 'purchase') return 'Outright';
  return value || '-';
};

const normalizeInvoiceStatus = (value?: string) => {
  const key = `${value || ''}`.trim().toUpperCase();
  if (key === 'MEMO_PENDING_PAYMENT') return 'MEMO_PENDING_PAYMENT';
  if (key === 'PURCHASE_PENDING_PAYMENT') return 'PURCHASE_PENDING_PAYMENT';
  return value || '-';
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatComponentLabel = (value: string) => {
  const key = `${value || ''}`.trim().toLowerCase();
  if (!key) return '-';
  return key
    .split('_')
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

const getInvoiceGrossAmount = (invoice: InvoiceListItem) => {
  const grossValue = Number(invoice?.grossAmount);
  if (Number.isFinite(grossValue)) return grossValue;
  const snapshotValue = Number(invoice?.liveRateAtCreation);
  if (Number.isFinite(snapshotValue)) return snapshotValue;
  return Number(invoice?.amount || 0);
};

const getInvoiceCommissionAmount = (invoice: InvoiceListItem) => {
  const configured = Number(invoice?.commissionTotal);
  if (Number.isFinite(configured)) return configured;
  const grossAmount = getInvoiceGrossAmount(invoice);
  const payableAmount = Number(invoice?.amount || 0);
  return Math.max(0, grossAmount - payableAmount);
};

const InvoiceTable = ({ title, invoices }: { title: string; invoices: InvoiceListItem[] }) => {
  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        <span className="badge bg-light text-dark">{invoices.length}</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Gross</th>
                <th>Commission</th>
                <th>Payable</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No records in this section.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const productInfo = (invoice.product || invoice.productSnapshot || {}) as Record<string, unknown>;
                  const productMeta = ((productInfo?.product as Record<string, unknown>) || productInfo) as Record<string, unknown>;
                  const imageUrl = `${(productInfo?.image as string) || (productMeta?.image as string) || ''}`.trim();
                  const grossAmount = getInvoiceGrossAmount(invoice);
                  const commissionAmount = getInvoiceCommissionAmount(invoice);
                  const payableAmount = Number(invoice?.amount || 0);
                  const breakdown = Array.isArray(invoice?.commissionBreakdown) ? invoice.commissionBreakdown : [];

                  return (
                    <tr key={invoice._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="mr-2">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={`${productMeta?.jewelCode || 'product'}`}
                                style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover' }}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 8,
                                  background: '#f1f3f5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  color: '#6c757d',
                                }}
                              >
                                N/A
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-weight-bold">{`${productMeta?.jewelCode || invoice.productId || '-'}`}</div>
                            <small className="text-muted">{`${productMeta?.styleCode || '-'}`}</small>
                          </div>
                        </div>
                      </td>
                      <td>{normalizeInvoiceType(invoice?.type)}</td>
                      <td>Rs {IndNumberFormat(grossAmount)}</td>
                      <td>
                        <div className="font-weight-bold">Rs {IndNumberFormat(commissionAmount)}</div>
                        {breakdown.length > 0 && (
                          <div>
                            {breakdown.map((item) => (
                              <small className="d-block text-muted" key={`${invoice._id}-${item.componentKey}`}>
                                {formatComponentLabel(item.componentKey)} {item.rate}% (-Rs {IndNumberFormat(item.deductionAmount || 0)})
                              </small>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>Rs {IndNumberFormat(payableAmount)}</td>
                      <td>{normalizeInvoiceStatus(invoice?.status)}</td>
                      <td>{formatDateTime(invoice?.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const InvoicePage = () => {
  const { data: user, isLoading: isUserLoading } = useAuthSellerLogin();
  const [listInvoices, { data, isLoading }] = useListInvoicesMutation();

  useEffect(() => {
    if (!user?.email) return;
    listInvoices({ page: 1, limit: 250, userEmail: user.email });
  }, [listInvoices, user?.email]);

  const invoices = useMemo(() => (Array.isArray(data?.data?.data) ? data?.data?.data : []), [data]) as InvoiceListItem[];
  const paidInvoices = useMemo(() => invoices.filter((invoice) => `${invoice?.status || ''}`.toUpperCase() === 'PAID'), [invoices]);
  const pendingInvoices = useMemo(() => invoices.filter((invoice) => `${invoice?.status || ''}`.toUpperCase() !== 'PAID'), [invoices]);

  const totalPayable = useMemo(() => {
    const responseTotal = Number(data?.data?.totalAmount);
    if (Number.isFinite(responseTotal)) return responseTotal;
    return invoices.reduce((sum, invoice) => sum + Number(invoice?.amount || 0), 0);
  }, [data?.data?.totalAmount, invoices]);

  const totalGross = useMemo(() => {
    const responseTotal = Number(data?.data?.totalGrossAmount);
    if (Number.isFinite(responseTotal)) return responseTotal;
    return invoices.reduce((sum, invoice) => sum + getInvoiceGrossAmount(invoice), 0);
  }, [data?.data?.totalGrossAmount, invoices]);

  const totalCommission = useMemo(() => {
    const responseTotal = Number(data?.data?.totalCommissionTotal);
    if (Number.isFinite(responseTotal)) return responseTotal;
    return invoices.reduce((sum, invoice) => sum + getInvoiceCommissionAmount(invoice), 0);
  }, [data?.data?.totalCommissionTotal, invoices]);

  const pendingPayable = useMemo(
    () => pendingInvoices.reduce((sum, invoice) => sum + Number(invoice?.amount || 0), 0),
    [pendingInvoices]
  );

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid">
        <div className="row mb-3">
          <div className="col-xl-3 col-md-6 mb-2">
            <div className="card h-100">
              <div className="card-body">
                <small className="text-muted">Total Gross</small>
                <h5 className="mb-0">Rs {IndNumberFormat(totalGross)}</h5>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-2">
            <div className="card h-100">
              <div className="card-body">
                <small className="text-muted">Total Commission</small>
                <h5 className="mb-0">Rs {IndNumberFormat(totalCommission)}</h5>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-2">
            <div className="card h-100">
              <div className="card-body">
                <small className="text-muted">Total Payable</small>
                <h5 className="mb-0">Rs {IndNumberFormat(totalPayable)}</h5>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-2">
            <div className="card h-100">
              <div className="card-body">
                <small className="text-muted">Pending Payable</small>
                <h5 className="mb-0">Rs {IndNumberFormat(pendingPayable)}</h5>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h4 className="card-title mb-0">Orders Transactions</h4>
          </div>
          <div className="card-body">
            {isUserLoading || isLoading ? (
              <p className="text-muted mb-0">Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className="text-muted mb-0">No invoices found.</p>
            ) : (
              <>
                <InvoiceTable title="Pending / Unpaid Invoices" invoices={pendingInvoices} />
                <InvoiceTable title="Paid Invoices" invoices={paidInvoices} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
