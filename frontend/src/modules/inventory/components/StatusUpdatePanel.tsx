import type { InventoryRequestStatus } from '../hooks';
import type { InventoryStatusControlState } from '../types/forms';

interface Option {
  id: string;
  label: string;
}

interface Props {
  control: InventoryStatusControlState;
  statusOptions: InventoryRequestStatus[];
  requestOptions: Option[];
  isUpdating: boolean;
  onChange: <K extends keyof InventoryStatusControlState>(key: K, value: InventoryStatusControlState[K]) => void;
  onSubmit: () => void;
}

export const StatusUpdatePanel = ({ control, statusOptions, requestOptions, isUpdating, onChange, onSubmit }: Props) => (
  <div className="card mb-0 inventory-panel-card inventory-status-panel">
    <div className="card-header">
      <h5 className="mb-1">Update Request Status</h5>
      <p className="text-muted mb-0 small">Move requests between workflow stages with a traceable remark.</p>
    </div>
    <div className="card-body">
      <div className="form-group mb-3">
        <label>Request ID</label>
        <select className="form-control" value={control.requestId} onChange={(e) => onChange('requestId', e.target.value)}>
          <option value="">Select request</option>
          {requestOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group mb-3">
        <label>Status</label>
        <select className="form-control" value={control.status} onChange={(e) => onChange('status', e.target.value as InventoryRequestStatus)}>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group mb-3">
        <label>Remark</label>
        <textarea className="form-control" rows={2} placeholder="Reason for this status update" value={control.remark} onChange={(e) => onChange('remark', e.target.value)} />
      </div>
      <div className="d-flex justify-content-end">
        <button className="btn btn-primary inventory-panel-action" disabled={isUpdating} onClick={onSubmit}>
          {isUpdating ? 'Saving...' : 'Update Status'}
        </button>
      </div>
    </div>
  </div>
);
