import type { InventoryUsageChoice } from '../hooks';
import type { InventoryAssignControlState } from '../types/forms';
import type { InventoryRequestRecord } from '../hooks';

interface Option {
  id: string;
  label: string;
}

interface ProductOption {
  id: string;
  jewelCode: string;
  styleCode: string;
  status: string;
  holder?: string;
  holderRole?: string;
  origin?: string;
}

interface Props {
  control: InventoryAssignControlState;
  usageOptions: InventoryUsageChoice[];
  requestOptions: Option[];
  productOptions: ProductOption[];
  selectedRequest?: InventoryRequestRecord;
  isAssigning: boolean;
  isLoadingProducts: boolean;
  onChange: <K extends keyof InventoryAssignControlState>(key: K, value: InventoryAssignControlState[K]) => void | Promise<void>;
  onAssign: (productIdOverride?: string) => void;
  onRefreshProducts: () => void;
}

export const AssignProductPanel = ({ control, usageOptions, requestOptions, productOptions, selectedRequest, isAssigning, isLoadingProducts, onChange, onAssign, onRefreshProducts }: Props) => (
  <div className="card mb-3">
    <div className="card-header d-flex justify-content-between align-items-center">
      <h5 className="mb-0">Assign Product</h5>
      <button className="btn btn-sm btn-outline-secondary" disabled={isLoadingProducts} onClick={onRefreshProducts}>
        {isLoadingProducts ? 'Refreshing...' : 'Refresh Available'}
      </button>
    </div>
    <div className="card-body">
      {!selectedRequest && <div className="alert alert-info">Select a request to load products for its style code.</div>}

      {selectedRequest && (
        <div className="alert alert-light border mb-3">
          <div className="d-flex justify-content-between flex-wrap">
            <div>
              <strong>Requested Style:</strong> <span className="text-uppercase">{selectedRequest.styleCode || '-'}</span>
              <span className="ml-2 text-muted">Qty: {selectedRequest.requiredProducts}</span>
            </div>
            <div className="text-muted small">Request ID: {selectedRequest._id?.slice(0, 8)}</div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Request</label>
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
        <label>Product ID</label>
        <input className="form-control" list="available-products" value={control.productId} onChange={(e) => onChange('productId', e.target.value)} placeholder="Select jewel or assignment id" />
        <datalist id="available-products">
          {productOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {`${item.jewelCode || item.id} (${item.status || 'status'})`}
            </option>
          ))}
        </datalist>
      </div>
      <div className="form-row">
        <div className="form-group col-md-6">
          <label>Usage</label>
          <select className="form-control" value={control.usageChoice} onChange={(e) => onChange('usageChoice', e.target.value as InventoryUsageChoice)}>
            {usageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group col-md-6">
          <label>Amount</label>
          <input type="number" min={0} className="form-control" value={control.amount} onChange={(e) => onChange('amount', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Remark</label>
        <input className="form-control" value={control.remark} onChange={(e) => onChange('remark', e.target.value)} />
      </div>
      <button className="btn btn-success" disabled={isAssigning} onClick={onAssign}>
        {isAssigning ? 'Assigning...' : 'Assign Product'}
      </button>

      {productOptions.length > 0 && (
        <div className="mt-4 table-responsive">
          <table className="table table-sm table-striped mb-0">
            <thead>
              <tr>
                <th>Jewel Code</th>
                <th>Style</th>
                <th>MRP</th>
                <th>Status</th>
                <th>Holder</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {productOptions.map((product) => (
                <tr key={product.id}>
                  <td className="text-uppercase">{product.jewelCode || product.id}</td>
                  <td className="text-uppercase">{product.styleCode || '-'}</td>
                  <td className="text-capitalize">{product.status?.toLowerCase() || '-'}</td>
                  <td>{product.holder || product.holderRole ? `${product.holder || ''}${product.holderRole ? ` (${product.holderRole})` : ''}` : 'Unassigned'}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-link btn-sm p-0 mr-2" onClick={() => onChange('productId', product.id)}>
                        Use
                      </button>
                      <button className="btn btn-primary btn-sm" disabled={isAssigning} onClick={() => onAssign(product.id)}>
                        {isAssigning ? 'Assigning...' : 'Assign/Reassign'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    {productOptions.length > 0 && (
      <div className="card-footer">
        <small className="text-muted">Available products</small>
        <div className="mt-2 d-flex flex-wrap">
          {productOptions.slice(0, 6).map((product) => (
            <span key={product.id} className="badge badge-light mr-2 mb-1">
              {product.id.slice(0, 6)} {product.jewelCode ? `(${product.jewelCode})` : ''}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);
