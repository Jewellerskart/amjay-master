import type { InventoryUsageChoice } from '../hooks';
import type { FormEvent } from 'react';
import type { InventoryRequestFormState } from '../types/forms';

interface Props {
  form: InventoryRequestFormState;
  usageOptions: InventoryUsageChoice[];
  isSubmitting: boolean;
  onChange: <K extends keyof InventoryRequestFormState>(key: K, value: InventoryRequestFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export const InventoryRequestForm = ({ form, usageOptions, isSubmitting, onChange, onSubmit }: Props) => (
  <div className="card mb-3">
    <div className="card-header">
      <h5 className="mb-0">Request Product</h5>
    </div>
    <div className="card-body">
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-group col-md-5">
            <label>Style Code</label>
            <input className="form-control" value={form.styleCode} onChange={(e) => onChange('styleCode', e.target.value.toUpperCase())} required />
          </div>
          <div className="form-group col-md-2">
            <label>Qty</label>
            <input
              type="number"
              min={1}
              className="form-control"
              value={form.requiredProducts}
              onChange={(e) => onChange('requiredProducts', Number(e.target.value))}
              required
            />
          </div>
          <div className="form-group col-md-3">
            <label>Usage</label>
              <select className="form-control" value={form.usageChoice} onChange={(e) => onChange('usageChoice', e.target.value as InventoryUsageChoice)}>
                {usageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'MEMO' || option === 'RENT' ? 'MEMO' : option}
                  </option>
                ))}
              </select>
          </div>
          <div className="form-group col-md-2">
            <label>Preferred Note</label>
            <input className="form-control" value={form.preferredUsageNote} onChange={(e) => onChange('preferredUsageNote', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Remark</label>
          <input className="form-control" value={form.remark} onChange={(e) => onChange('remark', e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  </div>
);
