import { formatTimeDate } from '@utils/formateDate';
import type { InventoryRequestRecord, InventoryRequestStatus } from '../hooks';

interface Props {
  requests: InventoryRequestRecord[];
  statusOptions: InventoryRequestStatus[];
  statusFilter: InventoryRequestStatus | '';
  limit: number;
  page: number;
  total: number;
  isLoading: boolean;
  onStatusFilterChange: (value: InventoryRequestStatus | '') => void;
  onLimitChange: (value: number) => void;
  onPageChange: (page: number) => void;
}

export const RequestsTable = ({ requests, statusOptions, statusFilter, limit, page, total, isLoading, onStatusFilterChange, onLimitChange, onPageChange }: Props) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const getProgress = (request: InventoryRequestRecord) => {
    const required = Math.max(1, Number(request.requiredProducts || 1));
    const assigned = Math.min(required, Math.max(0, Number(request.assignedCount ?? request.assignedProductIds?.length ?? 0)));
    const pending = Math.max(0, required - assigned);
    const percentage = Math.min(100, Math.round((assigned / required) * 100));
    return { required, assigned, pending, percentage };
  };

  const getStatusBadge = (status: InventoryRequestStatus) => {
    switch (status) {
      case 'FULFILLED':
        return 'badge badge-success';
      case 'IN_PROGRESS':
        return 'badge badge-info';
      case 'CANCELLED':
        return 'badge badge-danger';
      case 'OPEN':
      default:
        return 'badge badge-warning';
    }
  };

  const getUsageLabel = (usageChoice: string) => {
    const key = `${usageChoice || ''}`.toUpperCase();
    return key === 'MEMO' || key === 'RENT' ? 'Memo' : key === 'PURCHASE' ? 'Purchase' : key || '-';
  };

  return (
    <div className="card inventory-requests-table-card">
      <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h5 className="mb-1">Requests</h5>
          <p className="text-muted mb-0">Track request fulfilment by quantity, then assign one matching product at a time.</p>
        </div>
        <div className="form-inline">
          <select className="form-control mr-2" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value as InventoryRequestStatus | '')}>
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select className="form-control" value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
            {[10, 20, 30].map((size) => (
              <option key={size} value={size}>
                {size} rows
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card-body">
        <div className="table-responsive table-ui-responsive">
          <table className="table table-ui mb-0">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Requested By</th>
                <th>Style Code</th>
                <th>Qty Progress</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Preferred Note</th>
                <th>Assigned Products</th>
                <th>Assigned To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-4">
                    Loading requests...
                  </td>
                </tr>
              )}
              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-muted py-4">
                    No requests available.
                  </td>
                </tr>
              )}
              {!isLoading &&
                requests.map((request) => {
                  const progress = getProgress(request);
                  const assignedIds = (request.assignedProductIds || []).filter(Boolean);
                  return (
                    <tr key={request._id}>
                      <td>{request._id.slice(0, 8)}</td>
                      <td>{request.requestedByName || request.requestedBy || '-'}</td>
                      <td className="text-uppercase">{request.styleCode || '-'}</td>
                      <td className="inventory-qty-progress">
                        <div className="d-flex justify-content-between">
                          <span>{progress.assigned}/{progress.required}</span>
                          <span className="text-muted">Pending: {progress.pending}</span>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div className="progress-bar bg-success" role="progressbar" style={{ width: `${progress.percentage}%` }} />
                        </div>
                      </td>
                      <td>
                        <span className={getStatusBadge(request.status)}>{request.status.replace('_', ' ')}</span>
                      </td>
                      <td>{getUsageLabel(request.usageChoice)}</td>
                      <td>{request.preferredUsageNote || '-'}</td>
                      <td>
                        {assignedIds.length ? (
                          <div className="d-flex flex-wrap">
                            {assignedIds.slice(0, 4).map((id) => (
                              <span key={id} className="badge badge-light mr-1 mb-1">
                                {id.slice(0, 8)}
                              </span>
                            ))}
                            {assignedIds.length > 4 && <span className="text-muted small">+{assignedIds.length - 4} more</span>}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{request.assignedToName || request.assignedTo || '-'}</td>
                      <td>{formatTimeDate(request.createdAt) || '-'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Showing page {page} of {totalPages} ({total} requests)
          </small>
          <div>
            <button className="btn btn-sm btn-outline-secondary mr-2" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
              Previous
            </button>
            <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
