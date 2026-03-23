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
  <div className="card mb-3">
    <div className="card-header">
      <h5 className="mb-0">Update Request Status</h5>
    </div>
    <div className="card-body">
      <div className="form-group">
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
      <div className="form-group">
        <label>Status</label>
        <select className="form-control" value={control.status} onChange={(e) => onChange('status', e.target.value as InventoryRequestStatus)}>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Remark</label>
        <input className="form-control" value={control.remark} onChange={(e) => onChange('remark', e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={isUpdating} onClick={onSubmit}>
        {isUpdating ? 'Saving...' : 'Update Status'}
      </button>
    </div>
  </div>
);
