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

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h5 className="mb-1">Requests</h5>
          <p className="text-muted mb-0">Adjust pagination or status to narrow down requests.</p>
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
                <th>Style Code</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Qty</th>
                <th>Preferred Note</th>
                <th>Assigned Product</th>
                <th>Assigned To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    Loading requests...
                  </td>
                </tr>
              )}
              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-muted py-4">
                    No requests available.
                  </td>
                </tr>
              )}
              {!isLoading &&
                requests.map((request) => (
                  <tr key={request._id}>
                    <td>{request._id.slice(0, 6)}</td>
                    <td className="text-uppercase">{request.styleCode || '-'}</td>
                    <td className="text-capitalize">{request.status.toLowerCase()}</td>
                    <td className="text-capitalize">{request.usageChoice.toLowerCase()}</td>
                    <td>{request.requiredProducts}</td>
                    <td>{request.preferredUsageNote || '-'}</td>
                    <td>{request.assignedProductId || '-'}</td>
                    <td>{request.assignedTo || '-'}</td>
                    <td>{formatTimeDate(request.createdAt) || '-'}</td>
                  </tr>
                ))}
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
