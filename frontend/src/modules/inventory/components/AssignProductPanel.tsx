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
  finalPrice?: number;
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

const getProgress = (request?: InventoryRequestRecord) => {
  const required = Math.max(1, Number(request?.requiredProducts || 1));
  const assigned = Math.min(required, Math.max(0, Number(request?.assignedCount ?? request?.assignedProductIds?.length ?? 0)));
  const remaining = Math.max(0, required - assigned);
  const percentage = Math.min(100, Math.round((assigned / required) * 100));
  return { required, assigned, remaining, percentage };
};

export const AssignProductPanel = ({ control, usageOptions, requestOptions, productOptions, selectedRequest, isAssigning, isLoadingProducts, onChange, onAssign, onRefreshProducts }: Props) => {
  const progress = getProgress(selectedRequest);
  const assignedIdSet = new Set((selectedRequest?.assignedProductIds || []).map((id) => `${id}`.trim()).filter(Boolean));
  const selectedProductMatchesAssigned = !!control.productId && assignedIdSet.has(control.productId);
  const disableAssign = isAssigning || !selectedRequest || progress.remaining <= 0 || selectedProductMatchesAssigned;

  const usageLabel = (value?: string) => {
    const key = `${value || ''}`.toUpperCase();
    return key === 'MEMO' || key === 'RENT' ? 'MEMO' : key || '-';
  };

  return (
    <div className="card mb-0 inventory-panel-card inventory-assign-panel">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-1">Assign Product</h5>
          <p className="text-muted mb-0 small">Assign one product at a time until pending quantity reaches zero.</p>
        </div>
        <button className="btn btn-sm btn-outline-primary" disabled={isLoadingProducts} onClick={onRefreshProducts}>
          {isLoadingProducts ? 'Refreshing...' : 'Refresh Available'}
        </button>
      </div>
      <div className="card-body">
        {!selectedRequest && <div className="alert alert-info mb-3">Select a request first, then assign one product per click. Multi-qty requests can be fulfilled in multiple assignments.</div>}

        {selectedRequest && (
          <div className="inventory-assign-summary mb-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap">
              <div>
                <h6 className="mb-1 text-uppercase inventory-assign-summary__title">{selectedRequest.styleCode || '-'}</h6>
                <p className="mb-1 text-muted small">Request ID: {selectedRequest._id?.slice(0, 8)} | {usageLabel(selectedRequest.usageChoice)}</p>
                <p className="mb-0 text-muted small">Requested by: {selectedRequest.requestedByName || selectedRequest.requestedBy || '-'}</p>
              </div>
              <div className="d-flex flex-column align-items-md-end mt-2 mt-md-0">
                <span className="badge badge-light mb-1 inventory-pill">Required: {progress.required}</span>
                <span className="badge badge-success mb-1 inventory-pill">Assigned: {progress.assigned}</span>
                <span className="badge badge-warning inventory-pill">Remaining: {progress.remaining}</span>
              </div>
            </div>
            <div className="progress mt-3" style={{ height: 8 }}>
              <div className="progress-bar bg-success" role="progressbar" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>
        )}

        <div className="form-group mb-3">
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
        <div className="form-group mb-3">
          <label>Product ID / Code</label>
          <input className="form-control" list="available-products" value={control.productId} onChange={(e) => onChange('productId', e.target.value)} placeholder="Choose product id from the list below" />
          <datalist id="available-products">
            {productOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {`${item.jewelCode || item.id} (${item.status || 'status'})`}
              </option>
            ))}
          </datalist>
        </div>
        <div className="form-row align-items-end">
          <div className="form-group col-md-6">
            <label>Usage</label>
            <select className="form-control" value={control.usageChoice} onChange={(e) => onChange('usageChoice', e.target.value as InventoryUsageChoice)}>
              {usageOptions.map((option) => (
                <option key={option} value={option}>
                  {usageLabel(option)}
                </option>
                ))}
              </select>
          </div>
          <div className="form-group col-md-6 d-flex align-items-end">
            <small className="text-muted mb-2">Each click assigns 1 piece. Use the remaining count to finish multi-qty requests.</small>
          </div>
        </div>
        <div className="form-group mb-3">
          <label>Remark</label>
          <textarea className="form-control" rows={2} placeholder="Optional assignment note" value={control.remark} onChange={(e) => onChange('remark', e.target.value)} />
        </div>
        {selectedProductMatchesAssigned && <small className="text-danger d-block mb-2">This product is already assigned to the selected request.</small>}
        <button className="btn btn-success inventory-panel-action" disabled={disableAssign} onClick={() => onAssign()}>
          {isAssigning ? 'Assigning...' : selectedRequest ? `Assign 1 Product${progress.remaining > 0 ? ` (Remaining ${progress.remaining})` : ''}` : 'Assign Product'}
        </button>

        {productOptions.length > 0 && (
          <div className="mt-4 table-responsive inventory-assign-table-wrap">
            <table className="table table-sm table-ui mb-0 inventory-assign-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Jewel Code</th>
                  <th>Style</th>
                  <th>Status</th>
                  <th>Holder</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {productOptions.map((product) => {
                  const isAlreadyAssigned = assignedIdSet.has(product.id);
                  return (
                    <tr key={product.id}>
                      <td>{product.id.slice(0, 8)}</td>
                      <td className="text-uppercase">{product.jewelCode || '-'}</td>
                      <td className="text-uppercase">{product.styleCode || '-'}</td>
                      <td className="text-capitalize">{product.status?.toLowerCase() || '-'}</td>
                      <td>{product.holder || product.holderRole ? `${product.holder || ''}${product.holderRole ? ` (${product.holderRole})` : ''}` : 'Unassigned'}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-link btn-sm p-0 mr-2" onClick={() => onChange('productId', product.id)}>
                            Use
                          </button>
                          <button className="btn btn-primary btn-sm" disabled={isAssigning || isAlreadyAssigned || progress.remaining <= 0} onClick={() => onAssign(product.id)}>
                            {isAlreadyAssigned ? 'Assigned' : isAssigning ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {assignedIdSet.size > 0 && (
        <div className="card-footer inventory-assign-footer">
          <small className="text-muted">Already assigned to this request</small>
          <div className="mt-2 d-flex flex-wrap">
            {Array.from(assignedIdSet).map((id) => (
              <span key={id} className="badge badge-light mr-2 mb-1">
                {id.slice(0, 8)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
