import { useEffect, useMemo, useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Header } from '@common/header';
import {
  useCreateDiamondRateChartMutation,
  useListDiamondRateChartMutation,
  useUpdateDiamondRateChartMutation,
  useDeleteDiamondRateChartMutation,
  useCreateOtherRateChartMutation,
  useListOtherRateChartMutation,
  useUpdateOtherRateChartMutation,
  useDeleteOtherRateChartMutation,
  useListMissingDiamondRatesQuery,
} from '@api/apiHooks/product';

const emptyDiamond = {
  clarity: '',
  size: '',
  shape: '',
  ratePerCarat: '',
  currency: 'INR',
  effectiveDate: '',
  remark: '',
  isActive: true,
};

const emptyOther = {
  name: '',
  category: '',
  unit: '',
  rate: '',
  currency: 'INR',
  effectiveDate: '',
  remark: '',
  isActive: true,
};

export const RateChartsPage = () => {
  const [activeTab, setActiveTab] = useState<'diamond' | 'other'>('diamond');

  const [diamondForm, setDiamondForm] = useState<any>(emptyDiamond);
  const [diamondEditId, setDiamondEditId] = useState<string | null>(null);
  const [diamondRates, setDiamondRates] = useState<any[]>([]);
  const { data: missingDiamondData, isFetching: loadingMissing } = useListMissingDiamondRatesQuery();

  const [otherForm, setOtherForm] = useState<any>(emptyOther);
  const [otherEditId, setOtherEditId] = useState<string | null>(null);
  const [otherRates, setOtherRates] = useState<any[]>([]);

  const [listDiamondRates, { isLoading: loadingDiamond }] = useListDiamondRateChartMutation();
  const [createDiamondRate, { isLoading: creatingDiamond }] = useCreateDiamondRateChartMutation();
  const [updateDiamondRate, { isLoading: updatingDiamond }] = useUpdateDiamondRateChartMutation();
  const [deleteDiamondRate, { isLoading: deletingDiamond }] = useDeleteDiamondRateChartMutation();

  const [listOtherRates, { isLoading: loadingOther }] = useListOtherRateChartMutation();
  const [createOtherRate, { isLoading: creatingOther }] = useCreateOtherRateChartMutation();
  const [updateOtherRate, { isLoading: updatingOther }] = useUpdateOtherRateChartMutation();
  const [deleteOtherRate, { isLoading: deletingOther }] = useDeleteOtherRateChartMutation();

  const loadDiamond = async () => {
    try {
      const response: any = await listDiamondRates({ page: 1, limit: 50 }).unwrap();
      setDiamondRates(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load diamond rates');
    }
  };

  const loadOther = async () => {
    try {
      const response: any = await listOtherRates({ page: 1, limit: 50 }).unwrap();
      setOtherRates(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load other rates');
    }
  };

  useEffect(() => {
    void loadDiamond();
    void loadOther();
  }, []);

  const onSubmitDiamond = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (diamondEditId) {
        await updateDiamondRate({ id: diamondEditId, payload: diamondForm }).unwrap();
        toast.success('Diamond rate updated');
      } else {
        await createDiamondRate(diamondForm).unwrap();
        toast.success('Diamond rate created');
      }
      setDiamondForm(emptyDiamond);
      setDiamondEditId(null);
      await loadDiamond();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save diamond rate');
    }
  };

  const onSubmitOther = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (otherEditId) {
        await updateOtherRate({ id: otherEditId, payload: otherForm }).unwrap();
        toast.success('Rate updated');
      } else {
        await createOtherRate(otherForm).unwrap();
        toast.success('Rate created');
      }
      setOtherForm(emptyOther);
      setOtherEditId(null);
      await loadOther();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save rate');
    }
  };

  const isSavingDiamond = useMemo(() => creatingDiamond || updatingDiamond, [creatingDiamond, updatingDiamond]);
  const isSavingOther = useMemo(() => creatingOther || updatingOther, [creatingOther, updatingOther]);

  return (
    <>
      <Header />
      <div className="content-body">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-3">
            <div className="col-sm-12 p-md-0 d-flex justify-content-between align-items-center flex-wrap">
              <div className="welcome-text">
                <h4 className="mb-1">Rate Charts</h4>
                <p className="text-muted mb-0">Manage diamond and other rate charts with quick inline edits.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'diamond' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('diamond')}>
                    Diamond Rates
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'other' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('other')}>
                    Other Rates
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body">
              {activeTab === 'diamond' ? (
                <>
                  <form className="mb-4" onSubmit={onSubmitDiamond}>
                    <div className="row g-3">
                      <div className="col-sm-6 col-md-3">
                        <label className="form-label">Clarity</label>
                        <input className="form-control" required value={diamondForm.clarity} onChange={(e) => setDiamondForm({ ...diamondForm, clarity: e.target.value.toUpperCase() })} />
                      </div>
                      <div className="col-sm-6 col-md-3">
                        <label className="form-label">Size Bracket</label>
                        <input
                          className="form-control"
                          required
                          placeholder="e.g. 0.18 - 0.22"
                          value={diamondForm.size}
                          onChange={(e) => setDiamondForm({ ...diamondForm, size: e.target.value })}
                        />
                      </div>
                      <div className="col-sm-6 col-md-3">
                        <label className="form-label">Shape</label>
                        <input className="form-control" value={diamondForm.shape} onChange={(e) => setDiamondForm({ ...diamondForm, shape: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-3">
                        <label className="form-label">Rate / Carat</label>
                        <input className="form-control" type="number" step="0.01" required value={diamondForm.ratePerCarat} onChange={(e) => setDiamondForm({ ...diamondForm, ratePerCarat: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Currency</label>
                        <input className="form-control" value={diamondForm.currency} onChange={(e) => setDiamondForm({ ...diamondForm, currency: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Effective Date</label>
                        <input className="form-control" type="date" value={diamondForm.effectiveDate} onChange={(e) => setDiamondForm({ ...diamondForm, effectiveDate: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Active</label>
                        <select className="form-control" value={diamondForm.isActive ? 'true' : 'false'} onChange={(e) => setDiamondForm({ ...diamondForm, isActive: e.target.value === 'true' })}>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Remark</label>
                        <input className="form-control" value={diamondForm.remark} onChange={(e) => setDiamondForm({ ...diamondForm, remark: e.target.value })} />
                      </div>
                    </div>
                    <div className="mt-3 d-flex gap-2">
                      <button className="btn btn-primary" type="submit" disabled={isSavingDiamond}>
                        {isSavingDiamond ? 'Saving...' : diamondEditId ? 'Update Rate' : 'Create Rate'}
                      </button>
                      {diamondEditId ? (
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => {
                            setDiamondEditId(null);
                            setDiamondForm(emptyDiamond);
                          }}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>Clarity</th>
                          <th>Shape</th>
                          <th>Size / Range</th>
                          <th>Rate / Ct</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDiamond ? (
                          <tr>
                            <td colSpan={7} className="text-center text-muted py-3">
                              Loading diamond rates...
                            </td>
                          </tr>
                        ) : diamondRates.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-muted py-3">
                              No diamond rates found.
                            </td>
                          </tr>
                        ) : (
                          diamondRates.map((rate) => (
                            <tr key={rate._id}>
                              <td>{rate.size}</td>
                              <td>{rate.clarity || '-'}</td>
                              <td>{rate.shape || '-'}</td>
                              <td>
                                {rate.size}
                              </td>
                              <td>
                                {rate.currency || 'INR'} {rate.ratePerCarat}
                              </td>
                              <td>
                                <span className={`badge badge-${rate.isActive ? 'success' : 'secondary'}`}>{rate.isActive ? 'Active' : 'Inactive'}</span>
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    type="button"
                                    onClick={() => {
                                      setDiamondEditId(rate._id);
                                      setDiamondForm({
                                        clarity: rate.clarity || '',
                                        size: rate.size || '',
                                        shape: rate.shape || '',
                                        ratePerCarat: rate.ratePerCarat,
                                        currency: rate.currency || 'INR',
                                        effectiveDate: rate.effectiveDate ? rate.effectiveDate.substring(0, 10) : '',
                                        remark: rate.remark || '',
                                        isActive: !!rate.isActive,
                                      });
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    type="button"
                                    disabled={deletingDiamond}
                                    onClick={async () => {
                                      try {
                                        await deleteDiamondRate(rate._id).unwrap();
                                        toast.success('Deleted');
                                        await loadDiamond();
                                      } catch (error: any) {
                                        toast.error(error?.data?.message || 'Failed to delete');
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4">
                    <h6 className="mb-2">Unpriced diamond components (missing rates)</h6>
                    {loadingMissing ? (
                      <p className="text-muted">Loading...</p>
                    ) : Array.isArray(missingDiamondData?.data?.data) && missingDiamondData.data.data.length ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Item Code</th>
                              <th>Clarity</th>
                              <th>Shape</th>
                              <th>Per Stone (ct)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {missingDiamondData.data.data.map((row: any) => (
                              <tr key={`${row.productId}-${row.itemCode}-${row.perStone}`}>
                                <td>{row.jewelCode || row.productId}</td>
                                <td>{row.itemCode || '-'}</td>
                                <td>{row.clarity || '-'}</td>
                                <td>{row.shape || '-'}</td>
                                <td>{Number(row.perStone || 0).toFixed(4)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted mb-0">All diamond components are priced.</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <form className="mb-4" onSubmit={onSubmitOther}>
                    <div className="row g-3">
                      <div className="col-sm-6 col-md-3">
                        <label className="form-label">Name</label>
                        <input className="form-control" required value={otherForm.name} onChange={(e) => setOtherForm({ ...otherForm, name: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-3">
                        <label className="form-label">Category</label>
                        <input className="form-control" value={otherForm.category} onChange={(e) => setOtherForm({ ...otherForm, category: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Unit</label>
                        <input className="form-control" value={otherForm.unit} onChange={(e) => setOtherForm({ ...otherForm, unit: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Rate</label>
                        <input className="form-control" type="number" step="0.01" required value={otherForm.rate} onChange={(e) => setOtherForm({ ...otherForm, rate: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Currency</label>
                        <input className="form-control" value={otherForm.currency} onChange={(e) => setOtherForm({ ...otherForm, currency: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Effective Date</label>
                        <input className="form-control" type="date" value={otherForm.effectiveDate} onChange={(e) => setOtherForm({ ...otherForm, effectiveDate: e.target.value })} />
                      </div>
                      <div className="col-sm-6 col-md-2">
                        <label className="form-label">Active</label>
                        <select className="form-control" value={otherForm.isActive ? 'true' : 'false'} onChange={(e) => setOtherForm({ ...otherForm, isActive: e.target.value === 'true' })}>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Remark</label>
                        <input className="form-control" value={otherForm.remark} onChange={(e) => setOtherForm({ ...otherForm, remark: e.target.value })} />
                      </div>
                    </div>
                    <div className="mt-3 d-flex gap-2">
                      <button className="btn btn-primary" type="submit" disabled={isSavingOther}>
                        {isSavingOther ? 'Saving...' : otherEditId ? 'Update Rate' : 'Create Rate'}
                      </button>
                      {otherEditId ? (
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => {
                            setOtherEditId(null);
                            setOtherForm(emptyOther);
                          }}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Unit</th>
                          <th>Rate</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingOther ? (
                          <tr>
                            <td colSpan={6} className="text-center text-muted py-3">
                              Loading rates...
                            </td>
                          </tr>
                        ) : otherRates.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center text-muted py-3">
                              No rates found.
                            </td>
                          </tr>
                        ) : (
                          otherRates.map((rate) => (
                            <tr key={rate._id}>
                              <td>{rate.name}</td>
                              <td>{rate.category || '-'}</td>
                              <td>{rate.unit || '-'}</td>
                              <td>
                                {rate.currency || 'INR'} {rate.rate}
                              </td>
                              <td>
                                <span className={`badge badge-${rate.isActive ? 'success' : 'secondary'}`}>{rate.isActive ? 'Active' : 'Inactive'}</span>
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    type="button"
                                    onClick={() => {
                                      setOtherEditId(rate._id);
                                      setOtherForm({
                                        name: rate.name || '',
                                        category: rate.category || '',
                                        unit: rate.unit || '',
                                        rate: rate.rate,
                                        currency: rate.currency || 'INR',
                                        effectiveDate: rate.effectiveDate ? rate.effectiveDate.substring(0, 10) : '',
                                        remark: rate.remark || '',
                                        isActive: !!rate.isActive,
                                      });
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    type="button"
                                    disabled={deletingOther}
                                    onClick={async () => {
                                      try {
                                        await deleteOtherRate(rate._id).unwrap();
                                        toast.success('Deleted');
                                        await loadOther();
                                      } catch (error: any) {
                                        toast.error(error?.data?.message || 'Failed to delete');
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RateChartsPage;
