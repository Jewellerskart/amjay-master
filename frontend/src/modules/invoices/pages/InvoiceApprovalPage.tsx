import { useEffect, useState } from 'react';
import { useApproveInvoiceMutation, useListInvoicesMutation } from '@api/apiHooks/invoice';
import { Header } from '@common/header';

export const InvoiceApprovalPage = () => {
  const [filters, setFilters] = useState({ status: 'PURCHASE_PENDING_PAYMENT', type: 'purchase' });
  const [listInvoices, { data, isLoading }] = useListInvoicesMutation();
  const [approveInvoice, { isLoading: approving }] = useApproveInvoiceMutation();

  useEffect(() => {
    listInvoices({ page: 1, limit: 25, status: filters.status, type: filters.type });
  }, [filters.status, filters.type]);

  const onApprove = async (id: string) => {
    await approveInvoice(id);
    await listInvoices({ page: 1, limit: 25, status: filters.status, type: filters.type });
  };

  const invoices = data?.data?.data || [];

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid py-3">
        <h4 className="mb-3">Invoice Approvals</h4>
        <div className="row g-2 mb-3">
          <div className="col-md-3">
            <select className="form-select" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="PURCHASE_PENDING_PAYMENT">Pending Payment</option>
              <option value="RENTED">Rented</option>
              <option value="ACTIVE">Active</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
              <option value="purchase">Purchase</option>
              <option value="rent">Rent</option>
            </select>
          </div>
        </div>

        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-sm mb-0">
            <thead className="table-light">
              <tr>
                <th>Invoice</th>
                <th>User</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7}>Loading...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7}>No invoices found</td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv._id}>
                    <td>{inv._id}</td>
                    <td>{inv.userId}</td>
                    <td>{inv.productId}</td>
                    <td>{inv.amount}</td>
                    <td>{inv.status}</td>
                    <td>{inv.type}</td>
                    <td>
                      {inv.status !== 'PAID' && (
                        <button className="btn btn-sm btn-success" disabled={approving} onClick={() => onApprove(inv._id)}>
                          Approve & Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
