import { useEffect, useState } from 'react';
import { useListTicketsQuery, useUpdateTicketMutation } from '@api/apiHooks/ticket';
import { Header } from '@common/header';

const readAmount = (component: any) => {
  const amount = Number(component?.amount);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const costAmt = Number(component?.costAmt);
  return Number.isFinite(costAmt) && costAmt > 0 ? costAmt : 0;
};

const formatComponents = (components: any[]) => {
  const list = Array.isArray(components) ? components : [];
  if (!list.length) return '-';
  const previews = list.slice(0, 3).map((component: any) => {
    const type = `${component?.type || component?.materialType || 'other'}`.toLowerCase();
    const amount = readAmount(component);
    return amount > 0 ? `${type}: Rs. ${amount.toLocaleString('en-IN')}` : type;
  });
  return `${previews.join(', ')}${list.length > 3 ? ` +${list.length - 3} more` : ''}`;
};

export const PurchaseQueuePage = () => {
  const [filters, setFilters] = useState({ status: 'OPEN', priority: '' });
  const { data, isLoading, refetch } = useListTicketsQuery({
    status: filters.status,
    priority: filters.priority,
  });
  const [updateStatus, { isLoading: updating }] = useUpdateTicketMutation();
  useEffect(() => {
    refetch();
  }, [filters.status, filters.priority]);

  const tickets = data?.data?.data || [];

  const handleUpdate = async (id: string, status: string) => {
    await updateStatus({ ticketId: id, status: status as any });
    await refetch();
  };

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid py-3">
        <h4 className="mb-3">Purchase Team Tickets</h4>
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="">Any priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="table-responsive bg-white rounded shadow-sm">
        <table className="table table-sm mb-0">
          <thead className="table-light">
            <tr>
              <th>Design No</th>
              <th>Image</th>
              <th>Components</th>
              <th>Requested By</th>
              <th>Uploaded By</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8}>Loading...</td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={8}>No tickets found</td>
              </tr>
            ) : (
              tickets.map((t: any) => (
                <tr key={t._id}>
                  <td>
                    <div className="font-weight-bold">{t?.product?.design || t?.product?.styleCode || '-'}</div>
                    <small className="text-muted">{t?.product?.jewelCode || '-'}</small>
                  </td>
                  <td>
                    {t?.product?.image ? (
                      <img src={t.product.image} alt={t?.product?.design || 'Product'} width={44} height={44} style={{ objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ minWidth: 260 }}>
                    <small className="text-muted">{formatComponents(t?.product?.components)}</small>
                  </td>
                  <td>
                    <div>{t?.requestedByDetails?.email || '-'}</div>
                    <small className="text-muted">{t?.requestedByDetails?.businessName || '-'}</small>
                  </td>
                  <td>{t?.product?.uploadedByBusinessName || '-'}</td>
                  <td>{t.status}</td>
                  <td>{t.priority}</td>
                  <td className="d-flex gap-1">
                    {t.status !== 'RESOLVED' && (
                      <button
                        className="btn btn-sm btn-success"
                        disabled={updating}
                        onClick={() => handleUpdate(t._id, 'RESOLVED')}
                      >
                        Resolve
                      </button>
                    )}
                    {t.status === 'OPEN' && (
                      <button
                        className="btn btn-sm btn-warning"
                        disabled={updating}
                        onClick={() => handleUpdate(t._id, 'IN_PROGRESS')}
                      >
                        Start
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
