import { useRef, useState, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Header } from '@common/header';

type Row = Record<string, any>;

export const ProductBulkUploadPage = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importFormat, setImportFormat] = useState<'default' | 'gati'>('default');
  const [preview, setPreview] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);

  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text
      .trim()
      .split('\n')
      .filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows: Row[] = lines.slice(1).map((line) => {
      const values = line.split(',');
      const row: Row = {};
      headers.forEach((h, idx) => (row[h] = (values[idx] || '').trim()));
      return row;
    });
    return rows;
  };

  const parseExcel = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });
    return rows;
  };

  const parseFile = async (file: File) => {
    const ext = file.name.toLowerCase();
    const isCsv = ext.endsWith('.csv') || file.type.includes('csv');
    const rows = isCsv ? await parseCsv(file) : await parseExcel(file);
    return rows;
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview([]);
      return;
    }
    try {
      const rows = await parseFile(file);
      setPreview(rows.slice(0, 10));
    } catch (error) {
      toast.error('Unable to read that file. Please check the format.');
      setPreview([]);
    }
  };

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Please choose a CSV or Excel file');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importFormat', importFormat);

      const resp = await fetch('/api/v1/product/bulk-import/file', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await resp.json();
      if (!resp.ok || data?.data?.inserted === 0) {
        const errors = data?.data?.errors;
        const msg = errors && errors.length ? `No items imported. First error: ${errors[0]?.errmsg || errors[0]?.message || 'unknown'}` : data?.message || 'Upload failed';
        throw new Error(msg);
      }
      toast.success(`Imported ${data?.data?.inserted || 0} items And Updated ${data?.data?.received || 0} items Successfully`);
    } catch (err: any) {
      toast.error(err?.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid py-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Bulk Upload Products</h4>
          <a className="btn btn-outline-secondary btn-sm" href="/docs/products-import-template.csv" download>
            Download CSV Template
          </a>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="row g-2 align-items-center mb-2">
              <div className="col-md-4">
                <label className="form-label mb-1 small">Import format</label>
                <select className="form-select" value={importFormat} onChange={(e) => setImportFormat(e.target.value as any)}>
                  <option value="default">Default template (products-import-template.csv)</option>
                  <option value="gati">Gati export format</option>
                </select>
              </div>
            </div>
            <p className="text-muted small mb-2">Upload CSV or Excel (.xlsx/.xls). The first sheet will be imported. Gati format expects the provided export headers.</p>
            <div className="mb-3">
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="form-control" onChange={onFileChange} />
            </div>
            <button className="btn btn-primary" onClick={onUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="card mt-3">
            <div className="card-header">Preview (first 10 rows)</div>
            <div className="card-body table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    {Object.keys(preview[0] || {}).map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(preview[0] || {}).map((h) => (
                        <td key={h}>{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
