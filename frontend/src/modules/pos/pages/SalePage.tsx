import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSellProductMutation } from '@api/apiHooks/pos';
import { Header } from '@common/header';

export const SalePage = () => {
  const [form, setForm] = useState({ productId: '', jewelerId: '', salePrice: 0, choice: 'PURCHASE' });
  const [sellProduct, { isLoading, data }] = useSellProductMutation();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
        await sellProduct({
          productId: form.productId,
          jewelerId: form.jewelerId,
          salePrice: Number(form.salePrice),
          choice: form.choice as 'PURCHASE' | 'MEMO' | 'RENT',
        }).unwrap();
      toast.success('Sale recorded');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Sale failed');
    }
  };

  const onChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="card-title mb-0">POS Sale</h4>
            <small className="text-muted">Scan or enter product to sell</small>
          </div>
          <div className="card-body">
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label>Product ID</label>
                <input className="form-control" value={form.productId} onChange={(e) => onChange('productId', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Jeweler ID</label>
                <input className="form-control" value={form.jewelerId} onChange={(e) => onChange('jewelerId', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Sale Price</label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={form.salePrice}
                  onChange={(e) => onChange('salePrice', Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Choice</label>
                <select className="form-control" value={form.choice} onChange={(e) => onChange('choice', e.target.value)}>
                  <option value="PURCHASE">Purchase</option>
                  <option value="MEMO">Memo</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Submitting…' : 'Record sale'}
              </button>
            </form>
            {data?.data?.invoice && (
              <div className="mt-4">
                <h6>Invoice created: {data.data.invoice._id}</h6>
                <p className="mb-0">Status: {data.data.invoice.status}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
