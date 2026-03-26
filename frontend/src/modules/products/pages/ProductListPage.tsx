import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { useSelection } from '@hooks/useSelection';
import { useProductMaster } from '../hooks/useProductMaster';
import { JewelerSelect } from '../../inventory/hooks/JewelerSelect';
import { Link } from 'react-router-dom';
import { UrlTablePagination } from '@common/TablePagination';
import { useUrlPagination } from '@hooks/useUrlPagination';
import { useExportProductsMutation, useLazyExportProductSampleQuery, useBulkDeleteProductsMutation, usePreviewAssignProductMutation } from '@api/apiHooks/product';
import { resolveProductPricing } from '../utils/pricing';
import * as XLSX from 'xlsx';

type BulkUploadRow = Record<string, any>;

const parseCsv = async (file: File) => {
  const text = await file.text();
  const lines = text
    .trim()
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((header) => header.trim());
  const rows: BulkUploadRow[] = lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: BulkUploadRow = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || '').trim();
    });
    return row;
  });

  return rows;
};

const parseExcel = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<BulkUploadRow>(sheet, { defval: '' });
};

const parseUploadFile = async (file: File) => {
  const filename = file.name.toLowerCase();
  const isCsv = filename.endsWith('.csv') || file.type.includes('csv');
  return isCsv ? parseCsv(file) : parseExcel(file);
};

const formatMoney = (value?: number | string | null) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `Rs. ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const getRoleBadgeClass = (role?: string) => {
  const key = `${role || ''}`.toLowerCase();
  if (key === 'jeweler') return 'badge badge-success';
  if (key === 'distributor') return 'badge badge-info';
  if (key === 'admin' || key === 'super-admin') return 'badge badge-primary';
  return 'badge badge-secondary';
};

const getUsageBadgeClass = (usage?: string) => {
  const key = `${usage || ''}`.toLowerCase();
  if (key === 'outright') return 'badge badge-warning';
  if (key === 'memo' || key === 'rented') return 'badge badge-success';
  if (key === 'pending') return 'badge badge-info';
  return 'badge badge-secondary';
};

const getUsageLabel = (usage?: string) => {
  const key = `${usage || ''}`.toLowerCase();
  if (key === 'memo' || key === 'rented' || key === 'rent') return 'memo';
  return key || '-';
};

export const ProductCatalogPage = () => {
  const { data: user } = useAuthSellerLogin();
  const { page, limit, setPage: setUrlPage, setLimit: setUrlLimit } = useUrlPagination();
  const [exportProducts, { isLoading: exporting }] = useExportProductsMutation();
  const [triggerSample, { isFetching: downloadingSample }] = useLazyExportProductSampleQuery();
  const [bulkDeleteProducts, { isLoading: deletingProducts }] = useBulkDeleteProductsMutation();
  const [previewAssignProduct, { isLoading: isAssignPreviewLoading }] = usePreviewAssignProductMutation();
  const [assignModalProductId, setAssignModalProductId] = useState('');
  const [assignModalJewelerId, setAssignModalJewelerId] = useState('');
  const [assignPreview, setAssignPreview] = useState<any | null>(null);
  const [assignPreviewError, setAssignPreviewError] = useState('');
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkAssignJewelerId, setBulkAssignJewelerId] = useState('');
  const [bulkAssignPreview, setBulkAssignPreview] = useState<any | null>(null);
  const [bulkAssignPreviewError, setBulkAssignPreviewError] = useState('');
  const [isBulkAssignPreviewLoading, setIsBulkAssignPreviewLoading] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ title: string; message: string; ids: string[] } | null>(null);
  const bulkUploadFileRef = useRef<HTMLInputElement | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadPreview, setBulkUploadPreview] = useState<BulkUploadRow[]>([]);
  const [bulkUploadFormat, setBulkUploadFormat] = useState<'default' | 'gati'>('default');
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const {
    canAssign,
    isAdmin,
    products,
    totalProducts,
    search,
    holderRole,
    sortBy,
    sortDir,
    setPage,
    setSearch,
    setHolderRole,
    setSortBy,
    setSortDir,
    onSearch,
    loadProducts,
    isLoadingProducts,
    summary,
    jewelers,
    assignByProductId,
    setAssignByProductId,
    onAssignProduct,
    isAssigningProduct,
  } = useProductMaster(user, {
    page,
    limit,
    onPageChange: setUrlPage,
    onLimitChange: setUrlLimit,
  });

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const blob: any = await exportProducts({ search, holderRole, sortBy, sortDir }).unwrap();
      downloadBlob(blob as Blob, 'products.xlsx');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to export');
    }
  };

  const handleSample = async () => {
    try {
      const blob: any = await triggerSample().unwrap();
      downloadBlob(blob as Blob, 'products-sample.xlsx');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to download sample');
    }
  };

  const resetBulkUploadState = () => {
    setBulkUploadFile(null);
    setBulkUploadPreview([]);
    setBulkUploadFormat('default');
    if (bulkUploadFileRef.current) {
      bulkUploadFileRef.current.value = '';
    }
  };

  const openBulkUploadModal = () => {
    setIsBulkUploadOpen(true);
  };

  const forceCloseBulkUploadModal = () => {
    setIsBulkUploadOpen(false);
    resetBulkUploadState();
  };

  const closeBulkUploadModal = () => {
    if (isBulkUploading) return;
    forceCloseBulkUploadModal();
  };

  const handleBulkUploadFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setBulkUploadFile(null);
      setBulkUploadPreview([]);
      return;
    }

    setBulkUploadFile(file);
    try {
      const rows = await parseUploadFile(file);
      setBulkUploadPreview(rows.slice(0, 10));
    } catch {
      toast.error('Unable to parse the selected file');
      setBulkUploadPreview([]);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      toast.error('Please choose a CSV or Excel file');
      return;
    }

    try {
      setIsBulkUploading(true);
      const formData = new FormData();
      formData.append('file', bulkUploadFile);
      formData.append('importFormat', bulkUploadFormat);

      const response = await fetch('/api/v1/product/bulk-import/file', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const payload = await response.json();
      const inserted = Number(payload?.data?.inserted || 0);
      const modified = Number(payload?.data?.modified || 0);

      if (!response.ok || (inserted === 0 && modified === 0)) {
        const errors = payload?.data?.errors;
        const errorMessage =
          errors && errors.length ? errors[0]?.errmsg || errors[0]?.message || 'Upload failed' : payload?.message || 'Upload failed';
        throw new Error(errorMessage);
      }

      toast.success(`Imported ${inserted} and updated ${modified} product(s)`);
      forceCloseBulkUploadModal();
      await loadProducts({ page: 1 });
      setPage(1);
    } catch (error: any) {
      toast.error(error?.message || 'Bulk upload failed');
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    setDeleteModal({
      title: 'Delete Selected Products',
      message: `Delete ${selectedIds.length} product(s)? This action cannot be undone.`,
      ids: [...selectedIds],
    });
  };

  const handleDeleteOne = async (id: string) => {
    setDeleteModal({
      title: 'Delete Product',
      message: 'Delete this product? This action cannot be undone.',
      ids: [id],
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal?.ids?.length) return;
    try {
      await bulkDeleteProducts({ ids: deleteModal.ids }).unwrap();
      toast.success(deleteModal.ids.length > 1 ? 'Deleted selected products' : 'Product deleted');
      setDeleteModal(null);
      await loadProducts();
      clearSelection();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete products');
    }
  };

  const getProductId = useCallback((product: (typeof products)[number]) => product._id, []);
  const { selectedIds, allSelected, toggleAll, toggleOne, clearSelection } = useSelection(products, getProductId);
  const totalColumns = 11 + (canAssign ? 2 : 0) + (isAdmin ? 1 : 0);
  const selectedCount = selectedIds.length;
  const sortLabelMap: Record<string, string> = {
    createdAt: 'Created',
    jewelCode: 'Jewel Code',
    styleCode: 'Style',
    qty: 'Qty',
    weight: 'Weight',
    price: 'Price',
    livePrice: 'Sale Amount',
  };
  const sortLabel = `${sortLabelMap[sortBy] || sortBy} (${sortDir.toUpperCase()})`;
  const selectedProductsForBulkAssign = useMemo(() => products.filter((product) => selectedIds.includes(product._id)), [products, selectedIds]);

  useEffect(() => {
    clearSelection();
  }, [products, clearSelection]);

  const toggleSort = (column: 'createdAt' | 'jewelCode' | 'styleCode' | 'qty' | 'livePrice') => {
    const nextDir = sortBy === column ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortBy(column);
    setSortDir(nextDir);
    setPage(1);
  };

  const renderSort = (column: 'createdAt' | 'jewelCode' | 'styleCode' | 'qty' | 'livePrice') => {
    if (sortBy !== column) return <i className="fa fa-sort text-muted ml-1" />;
    return sortDir === 'asc' ? <i className="fa fa-sort-asc ml-1" /> : <i className="fa fa-sort-desc ml-1" />;
  };

  const openBulkAssignModal = () => {
    if (!selectedIds.length) {
      toast.error('Select at least one product');
      return;
    }
    setIsBulkAssignModalOpen(true);
    setBulkAssignJewelerId('');
    setBulkAssignPreview(null);
    setBulkAssignPreviewError('');
    setIsBulkAssignPreviewLoading(false);
  };

  const closeBulkAssignModal = (force = false) => {
    if (!force && isBulkAssigning) return;
    setIsBulkAssignModalOpen(false);
    setBulkAssignJewelerId('');
    setBulkAssignPreview(null);
    setBulkAssignPreviewError('');
    setIsBulkAssignPreviewLoading(false);
  };

  const handleAssignSelected = () => {
    openBulkAssignModal();
  };

  const resetFilters = async () => {
    setSearch('');
    setHolderRole('');
    setPage(1);
    await loadProducts({ page: 1, search: '', holderRole: '' });
  };

  const openAssignModal = (productId: string) => {
    setAssignModalProductId(productId);
    setAssignModalJewelerId(assignByProductId[productId] || '');
    setAssignPreview(null);
    setAssignPreviewError('');
  };

  const closeAssignModal = () => {
    setAssignModalProductId('');
    setAssignModalJewelerId('');
    setAssignPreview(null);
    setAssignPreviewError('');
  };

  const selectedAssignProduct = products.find((item) => item._id === assignModalProductId) || null;
  const bulkPreviewHeaders = Object.keys(bulkUploadPreview[0] || {});

  useEffect(() => {
    let mounted = true;
    const runPreview = async () => {
      if (!assignModalProductId || !assignModalJewelerId) {
        if (!mounted) return;
        setAssignPreview(null);
        setAssignPreviewError('');
        return;
      }

      try {
        const response: any = await previewAssignProduct({ id: assignModalProductId, jewelerId: assignModalJewelerId }).unwrap();
        if (!mounted) return;
        setAssignPreview(response?.data || null);
        setAssignPreviewError('');
      } catch (error: any) {
        if (!mounted) return;
        setAssignPreview(error?.data?.data || null);
        setAssignPreviewError(error?.data?.message || 'Unable to load assign preview');
      }
    };

    runPreview();
    return () => {
      mounted = false;
    };
  }, [assignModalProductId, assignModalJewelerId, previewAssignProduct]);

  useEffect(() => {
    let mounted = true;
    const runBulkPreview = async () => {
      if (!isBulkAssignModalOpen || !bulkAssignJewelerId) {
        if (!mounted) return;
        setBulkAssignPreview(null);
        setBulkAssignPreviewError('');
        setIsBulkAssignPreviewLoading(false);
        return;
      }

      if (!selectedProductsForBulkAssign.length) {
        if (!mounted) return;
        setBulkAssignPreview(null);
        setBulkAssignPreviewError('Select at least one product');
        setIsBulkAssignPreviewLoading(false);
        return;
      }

      try {
        if (!mounted) return;
        setIsBulkAssignPreviewLoading(true);
        setBulkAssignPreviewError('');

        const previews = await Promise.all(
          selectedProductsForBulkAssign.map(async (product) => {
            try {
              const response: any = await previewAssignProduct({ id: product._id, jewelerId: bulkAssignJewelerId }).unwrap();
              return { ok: true, data: response?.data || null };
            } catch (error: any) {
              return { ok: false, data: error?.data?.data || null };
            }
          }),
        );

        if (!mounted) return;
        const firstPreview = previews.find((item) => item?.data)?.data || null;
        const failedCount = previews.filter((item) => !item.ok).length;
        const blockedCount = previews.filter((item) => item?.data?.canAssignForLimit === false).length;

        if (!firstPreview) {
          setBulkAssignPreview({
            creditLimit: 0,
            walletBalance: 0,
            currentProductAmount: 0,
            assignProductAmount: 0,
            projectedProductAmount: 0,
            thresholdAmount: 0,
            utilizationPercent: 0,
            canAssignForLimit: false,
            gstPercent: 3,
            selectedCount: selectedProductsForBulkAssign.length,
            blockedCount: selectedProductsForBulkAssign.length,
            failedCount: selectedProductsForBulkAssign.length,
            reason: 'Unable to evaluate bulk assignment preview',
          });
          setBulkAssignPreviewError('Unable to load bulk assign preview');
          setIsBulkAssignPreviewLoading(false);
          return;
        }

        const creditLimit = Number(firstPreview?.creditLimit || 0);
        const walletBalance = Number(firstPreview?.walletBalance || 0);
        const currentProductAmount = Number(firstPreview?.currentProductAmount || 0);
        const thresholdAmount = Number(firstPreview?.thresholdAmount || (creditLimit > 0 ? creditLimit * 0.75 : 0));
        const selectedProductAmount = previews.reduce((sum, item) => {
          const value = Number(item?.data?.assignProductAmount || 0);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0);
        const projectedProductAmount = currentProductAmount + selectedProductAmount;
        const canAssignForLimit = creditLimit > 0 ? projectedProductAmount <= thresholdAmount : true;
        const utilizationPercent = creditLimit > 0 ? (projectedProductAmount / creditLimit) * 100 : 0;

        setBulkAssignPreview({
          ...firstPreview,
          creditLimit,
          walletBalance,
          currentProductAmount,
          assignProductAmount: selectedProductAmount,
          projectedProductAmount,
          thresholdAmount,
          utilizationPercent,
          canAssignForLimit,
          selectedCount: selectedProductsForBulkAssign.length,
          blockedCount,
          failedCount,
          reason: canAssignForLimit ? firstPreview?.reason || 'Assignment allowed' : 'Bulk assignment blocked by 75% limit rule',
        });

        if (failedCount > 0) {
          setBulkAssignPreviewError(`${failedCount} product(s) preview unavailable`);
        }
      } catch (error: any) {
        if (!mounted) return;
        setBulkAssignPreview(null);
        setBulkAssignPreviewError(error?.data?.message || 'Unable to load bulk assign preview');
      } finally {
        if (!mounted) return;
        setIsBulkAssignPreviewLoading(false);
      }
    };

    runBulkPreview();
    return () => {
      mounted = false;
    };
  }, [bulkAssignJewelerId, isBulkAssignModalOpen, previewAssignProduct, selectedProductsForBulkAssign]);

  const handleAssignFromModal = async () => {
    if (!selectedAssignProduct) return;
    if (assignPreview?.canAssignForLimit === false) {
      toast.error(assignPreview?.reason || 'Assignment blocked by 75% limit rule');
      return;
    }
    const success = await onAssignProduct(selectedAssignProduct, { toUserId: assignModalJewelerId, quantity: 1 });
    if (success) {
      setAssignByProductId((prev) => ({ ...prev, [selectedAssignProduct._id]: assignModalJewelerId }));
      closeAssignModal();
    }
  };

  const handleBulkAssignFromModal = async () => {
    if (!bulkAssignJewelerId) {
      toast.error('Select jeweler first');
      return;
    }
    if (!selectedProductsForBulkAssign.length) {
      toast.error('Select at least one product');
      return;
    }
    if (bulkAssignPreview?.canAssignForLimit === false) {
      toast.error(bulkAssignPreview?.reason || 'Assignment blocked by 75% limit rule');
      return;
    }

    try {
      setIsBulkAssigning(true);
      let assignedCount = 0;
      for (const product of selectedProductsForBulkAssign) {
        const success = await onAssignProduct(product, {
          toUserId: bulkAssignJewelerId,
          quantity: 1,
          silent: true,
          skipReload: true,
        });
        if (success) {
          assignedCount += 1;
        }
      }

      await loadProducts();
      if (assignedCount > 0) {
        toast.success(`${assignedCount} product(s) assigned`);
        clearSelection();
        closeBulkAssignModal(true);
      } else {
        toast.error('No products were assigned');
      }
    } finally {
      setIsBulkAssigning(false);
    }
  };

  return (
    <>
      <Header />
      <div className="content-body product-master-page">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-3">
            <div className="col-sm-12 p-md-0 d-flex justify-content-between align-items-center flex-wrap">
              <div className="welcome-text pm-hero">
                <h4 className="mb-1">Product Master</h4>
                <span className="text-muted">Product catalog, pricing view, and assignment workflow.</span>
              </div>
              <div className="d-flex gap-2 pm-top-actions">
                {isAdmin && (
                  <button className="btn btn-outline-danger btn-sm" type="button" onClick={handleDeleteSelected} disabled={deletingProducts || selectedIds.length === 0}>
                    {deletingProducts ? 'Deleting...' : `Delete Selected${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
                  </button>
                )}
                {canAssign && (
                  <button className="btn btn-outline-primary btn-sm" type="button" onClick={openBulkUploadModal}>
                    <i className="fa fa-cloud-upload mr-1" aria-hidden="true" />
                    Bulk Upload
                  </button>
                )}
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={handleSample} disabled={downloadingSample}>
                  {downloadingSample ? 'Preparing...' : 'Sample Excel'}
                </button>
                <button className="btn btn-primary btn-sm" type="button" onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-3 mb-2">
              <div className="card pm-summary-card pm-summary-card--one">
                <div className="card-body py-3">
                  <div className="pm-summary-head">
                    <small>Total Products</small>
                    <i className="fa fa-cubes" aria-hidden="true" />
                  </div>
                  <h3>{totalProducts}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card pm-summary-card pm-summary-card--two">
                <div className="card-body py-3">
                  <div className="pm-summary-head">
                    <small>Total Inventory Qty</small>
                    <i className="fa fa-balance-scale" aria-hidden="true" />
                  </div>
                  <h3>{summary.totalQty}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card pm-summary-card pm-summary-card--three">
                <div className="card-body py-3">
                  <div className="pm-summary-head">
                    <small>With Jeweler</small>
                    <i className="fa fa-user-circle" aria-hidden="true" />
                  </div>
                  <h3>{summary.jewelerHeld}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card pm-summary-card pm-summary-card--four">
                <div className="card-body py-3">
                  <div className="pm-summary-head">
                    <small>With Distributor</small>
                    <i className="fa fa-truck" aria-hidden="true" />
                  </div>
                  <h3>{summary.distributorHeld}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card product-master-table-card">
            <div className="card-body py-2 d-flex align-items-center flex-wrap">
              <span className="pm-pill">Visible: {products.length}</span>
              <span className="pm-pill">Selected: {selectedCount}</span>
              <span className="pm-pill">Sort: {sortLabel}</span>
              <span className="pm-pill">
                Total Inventory Price ({summary.inventoryQty} Qty): {formatMoney(summary.inventoryPrice)}
              </span>
              <span className="pm-pill">
                Total Memo Price ({summary.memoQty} Qty): {formatMoney(summary.memoPrice)}
              </span>
              <span className="pm-pill">
                Total Purchased Price ({summary.purchasedQty} Qty): {formatMoney(summary.purchasedPrice)}
              </span>
              <span className="pm-pill">Page: {page}</span>
            </div>
            <div className="card-header">
              <div className="row align-items-end w-100">
                <div className="col-lg-4 mb-2">
                  <label className="small text-muted mb-1">Search</label>
                  <div className="pm-input-wrap">
                    <input
                      className="form-control pm-search-input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') onSearch();
                      }}
                      placeholder="Search jewel code, style code, trans no, remarks"
                    />
                    <button type="button" className="pm-input-icon pm-input-action" onClick={onSearch} aria-label="Search">
                      <i className="fa fa-search" aria-hidden="true" />
                    </button>
                    <button type="button" className="pm-input-clear" onClick={resetFilters} aria-label="Reset filters">
                      <i className="fa fa-times" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="col-lg-2 mb-2">
                  <label className="small text-muted mb-1">Holder Role</label>
                  <select className="form-control" value={holderRole} onChange={(e) => setHolderRole(e.target.value as '' | 'super-admin' | 'admin' | 'distributor' | 'jeweler')}>
                    <option value="">All</option>
                    <option value="distributor">Distributor</option>
                    <option value="jeweler">Jeweler</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {canAssign && (
                  <>
                    <div className="col-lg-4 mb-2">
                      <div className="pm-bulk-assign-help">
                        <div className="small text-muted">Bulk action: assignment is jewel-code-wise (qty fixed to 1).</div>
                        <div className="small font-weight-bold mt-1">Selected rows: {selectedCount}</div>
                      </div>
                    </div>
                    <div className="col-lg-2 mb-2">
                      <label className="small text-muted mb-1 d-block">Bulk Assign</label>
                      <button className="btn btn-sm btn-success w-100 pm-bulk-assign-btn" type="button" onClick={handleAssignSelected} disabled={isAssigningProduct || isBulkAssigning || selectedIds.length === 0}>
                        {isBulkAssigning ? 'Assigning...' : `Assign selected${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive table-ui-responsive users-table-wrapper">
                <table className="table table-ui product-master-table mb-0">
                  <thead>
                    <tr>
                      {canAssign && (
                        <th>
                          <input type="checkbox" checked={allSelected && products.length > 0} onChange={(e) => toggleAll(e.target.checked)} />
                        </th>
                      )}
                      <th className="sortable" onClick={() => toggleSort('jewelCode')}>
                        Jewel Code {renderSort('jewelCode')}
                      </th>
                      <th>Trans No</th>
                      <th>Order No</th>
                      <th>Image</th>
                      <th className="sortable" onClick={() => toggleSort('styleCode')}>
                        Style {renderSort('styleCode')}
                      </th>
                      <th>Live Metal Rate</th>
                      <th className="sortable" onClick={() => toggleSort('livePrice')}>
                        Total Sale Amt {renderSort('livePrice')}
                      </th>
                      <th>Holder</th>
                      <th className="sortable" onClick={() => toggleSort('qty')}>
                        Qty {renderSort('qty')}
                      </th>
                      <th>Diamond</th>
                      <th className="sortable" onClick={() => toggleSort('createdAt')}>
                        Created / Usage {renderSort('createdAt')}
                      </th>
                      {canAssign && <th>Assign</th>}
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingProducts && (
                      <>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <tr key={`loading-row-${index}`} className="pm-loading-row">
                            <td colSpan={totalColumns}>
                              <div className="pm-row-skeleton">
                                <span className="pm-cell-skeleton pm-cell-skeleton--long" />
                                <span className="pm-cell-skeleton" />
                                <span className="pm-cell-skeleton pm-cell-skeleton--short" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                    {!isLoadingProducts && products.length === 0 && (
                      <tr>
                        <td colSpan={totalColumns} className="text-muted py-4">
                          No inventory items found.
                        </td>
                      </tr>
                    )}
                    {!isLoadingProducts &&
                      products.map((item) => {
                        const pricing = resolveProductPricing(item);
                        return (
                          <tr key={item._id} className="product-master-row">
                            {canAssign && (
                              <td>
                                <input type="checkbox" checked={selectedIds.includes(item._id)} onChange={(e) => toggleOne(item, e.target.checked)} />
                              </td>
                            )}
                            <td>
                              <Link to={`/product/detail/${encodeURIComponent(item?.product?.jewelCode || '')}`}>{item?.product?.jewelCode || '-'}</Link>
                            </td>
                            <td>{item?.product?.transNo || '-'}</td>
                            <td>{item?.product?.orderNo || '-'}</td>
                            <td>{item?.image ? <img src={item.image} alt={item?.product?.jewelCode || 'product'} className="pm-thumb" /> : <div className="pm-thumb pm-thumb--fallback">No image</div>}</td>
                            <td>{item?.product?.styleCode || '-'}</td>
                            <td>{formatMoney(pricing.liveMetal)}</td>
                            <td>{formatMoney(pricing.finalPrice)}</td>
                            <td>
                              <span className={getRoleBadgeClass(item?.currentHolder?.role)}>{item?.currentHolder?.role || 'unknown'}</span>
                              {item?.currentHolder?.name ? <div className="small text-muted mt-1">{item.currentHolder.name}</div> : null}
                            </td>
                            <td>{item?.qty ?? item?.product?.qty ?? 0}</td>
                            <td>{Number(item?.diamond?.pieces || 0) > 0 || Number(item?.diamond?.weight || 0) > 0 ? `${item?.diamond?.pieces || 0} pcs / ${item?.diamond?.weight || 0} ct` : 'No Diamond'}</td>
                            <td>
                              <span className={getUsageBadgeClass(item?.usage?.type)}>{getUsageLabel(item?.usage?.type)}</span>
                              <div className="small text-muted mt-1">{formatDateTime(item?.createdAt)}</div>
                            </td>
                            {canAssign && (
                              <td>
                                <button className="btn btn-sm btn-outline-success pm-assign-btn" onClick={() => openAssignModal(item._id)} disabled={isAssigningProduct}>
                                  Assign
                                </button>
                              </td>
                            )}
                            {isAdmin && (
                              <td>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteOne(item._id)} disabled={deletingProducts}>
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <UrlTablePagination total={totalProducts} />
            </div>
          </div>

          {isBulkUploadOpen && (
            <div className="pm-modal-backdrop" onClick={closeBulkUploadModal}>
              <div className="card pm-modal-card pm-modal-card--lg pm-bulk-upload-modal" onClick={(event) => event.stopPropagation()}>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="mb-1">Bulk Upload Products</h5>
                    <div className="small text-muted">Upload CSV or Excel file and import into inventory.</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-light" onClick={closeBulkUploadModal} disabled={isBulkUploading}>
                    <i className="fa fa-times" />
                  </button>
                </div>
                <div className="card-body">
                  <div className="pm-bulk-upload-topbar">
                    <a className="btn btn-outline-secondary btn-sm" href="/docs/products-import-template.csv" download>
                      <i className="fa fa-download mr-1" aria-hidden="true" />
                      Download Template
                    </a>
                    <div className="pm-format-switch" role="group" aria-label="Import format">
                      <button
                        type="button"
                        className={`btn btn-sm ${bulkUploadFormat === 'default' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setBulkUploadFormat('default')}
                        disabled={isBulkUploading}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${bulkUploadFormat === 'gati' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setBulkUploadFormat('gati')}
                        disabled={isBulkUploading}
                      >
                        Gati
                      </button>
                    </div>
                  </div>

                  <div className="small text-muted mb-3 mt-2">First sheet will be imported. Keep headers exactly as template for best results.</div>

                  <div className="pm-upload-zone" onClick={() => bulkUploadFileRef.current?.click()} role="button" tabIndex={0}>
                    <input
                      ref={bulkUploadFileRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="d-none"
                      onChange={handleBulkUploadFileChange}
                      disabled={isBulkUploading}
                    />
                    <div className="pm-upload-zone__icon">
                      <i className="fa fa-file-excel-o" aria-hidden="true" />
                    </div>
                    <div className="pm-upload-zone__content">
                      <strong>{bulkUploadFile?.name || 'Choose CSV or Excel file'}</strong>
                      <div className="small text-muted">{bulkUploadFile ? 'File selected. Review preview below.' : 'Click here to browse your file'}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        bulkUploadFileRef.current?.click();
                      }}
                      disabled={isBulkUploading}
                    >
                      Choose File
                    </button>
                  </div>

                  {bulkUploadPreview.length > 0 && (
                    <div className="pm-upload-preview mt-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="mb-0">Preview (first 10 rows)</h6>
                        <span className="badge badge-light">Columns: {bulkPreviewHeaders.length}</span>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              {bulkPreviewHeaders.map((header) => (
                                <th key={header}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {bulkUploadPreview.map((row, index) => (
                              <tr key={`preview-row-${index}`}>
                                {bulkPreviewHeaders.map((header) => (
                                  <td key={`${header}-${index}`}>{`${row?.[header] ?? ''}`}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-footer d-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary mr-2" onClick={closeBulkUploadModal} disabled={isBulkUploading}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleBulkUpload} disabled={!bulkUploadFile || isBulkUploading}>
                    {isBulkUploading ? 'Uploading...' : 'Upload Products'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isBulkAssignModalOpen && (
            <div className="pm-modal-backdrop" onClick={() => closeBulkAssignModal()}>
              <div className="card pm-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Bulk Assign Products</h5>
                  <button type="button" className="btn btn-sm btn-light" onClick={() => closeBulkAssignModal()} disabled={isBulkAssigning}>
                    <i className="fa fa-times" />
                  </button>
                </div>
                <div className="card-body">
                  <div className="small text-muted mb-3">
                    Selected Products: <strong>{selectedProductsForBulkAssign.length}</strong>
                  </div>
                  <label className="small text-muted mb-1 d-block">Select Jeweler</label>
                  <JewelerSelect value={bulkAssignJewelerId} onChange={setBulkAssignJewelerId} jewelers={jewelers as any} placeholder="Select jeweler" className="pm-jeweler-select" />
                  {bulkAssignJewelerId && (
                    <div className="pm-assign-preview mt-3">
                      <div className="pm-assign-preview-grid">
                        <div>
                          <small>Credit Limit</small>
                          <strong>{formatMoney(bulkAssignPreview?.creditLimit)}</strong>
                        </div>
                        <div>
                          <small>Wallet Balance</small>
                          <strong>{formatMoney(bulkAssignPreview?.walletBalance)}</strong>
                        </div>
                        <div>
                          <small>Current Product Amount</small>
                          <strong>{formatMoney(bulkAssignPreview?.currentProductAmount)}</strong>
                        </div>
                        <div>
                          <small>Selected Product Amount</small>
                          <strong>{formatMoney(bulkAssignPreview?.assignProductAmount)}</strong>
                        </div>
                        <div>
                          <small>Projected Product Amount</small>
                          <strong>{formatMoney(bulkAssignPreview?.projectedProductAmount)}</strong>
                        </div>
                        <div>
                          <small>75% Limit Threshold</small>
                          <strong>{formatMoney(bulkAssignPreview?.thresholdAmount)}</strong>
                        </div>
                        <div>
                          <small>GST</small>
                          <strong>{Number(bulkAssignPreview?.gstPercent || 3)}%</strong>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="small text-muted">
                          Utilization: {Number(bulkAssignPreview?.utilizationPercent || 0).toFixed(2)}% | Previewed: {bulkAssignPreview?.selectedCount || 0}
                        </span>
                        <span className={`badge ${bulkAssignPreview?.canAssignForLimit ? 'badge-success' : 'badge-danger'}`}>
                          {bulkAssignPreview?.canAssignForLimit ? 'Allowed' : 'Blocked (75% Rule)'}
                        </span>
                      </div>
                      {Number(bulkAssignPreview?.failedCount || 0) > 0 ? <div className="small text-warning mt-2">Preview unavailable for {bulkAssignPreview?.failedCount} product(s)</div> : null}
                      {Number(bulkAssignPreview?.blockedCount || 0) > 0 ? <div className="small text-danger mt-2">Blocked preview count: {bulkAssignPreview?.blockedCount}</div> : null}
                      {bulkAssignPreviewError ? <div className="small text-danger mt-2">{bulkAssignPreviewError}</div> : null}
                      {isBulkAssignPreviewLoading ? <div className="small text-muted mt-2">Checking wallet and limit...</div> : null}
                    </div>
                  )}
                </div>
                <div className="card-footer d-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary mr-2" onClick={() => closeBulkAssignModal()} disabled={isBulkAssigning}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={!bulkAssignJewelerId || isAssigningProduct || isBulkAssigning || isBulkAssignPreviewLoading || bulkAssignPreview?.canAssignForLimit === false}
                    onClick={handleBulkAssignFromModal}
                  >
                    {isBulkAssigning ? 'Assigning...' : `Assign ${selectedProductsForBulkAssign.length} Product${selectedProductsForBulkAssign.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedAssignProduct && (
            <div className="pm-modal-backdrop" onClick={closeAssignModal}>
              <div className="card pm-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Assign Product</h5>
                  <button type="button" className="btn btn-sm btn-light" onClick={closeAssignModal}>
                    <i className="fa fa-times" />
                  </button>
                </div>
                <div className="card-body">
                  <div className="small text-muted mb-3">
                    Jewel Code: <strong>{selectedAssignProduct?.product?.jewelCode || '-'}</strong>
                    {'  '}
                    Style: <strong>{selectedAssignProduct?.product?.styleCode || '-'}</strong>
                  </div>
                  <label className="small text-muted mb-1 d-block">Select Jeweler</label>
                  <JewelerSelect
                    value={assignModalJewelerId}
                    onChange={(value) => {
                      setAssignModalJewelerId(value);
                      setAssignByProductId((prev) => ({ ...prev, [selectedAssignProduct._id]: value }));
                    }}
                    jewelers={jewelers as any}
                    placeholder="Select jeweler"
                    className="pm-jeweler-select"
                  />
                  {assignModalJewelerId && (
                    <div className="pm-assign-preview mt-3">
                      <div className="pm-assign-preview-grid">
                        <div>
                          <small>Credit Limit</small>
                          <strong>{formatMoney(assignPreview?.creditLimit)}</strong>
                        </div>
                        <div>
                          <small>Wallet Balance</small>
                          <strong>{formatMoney(assignPreview?.walletBalance)}</strong>
                        </div>
                        <div>
                          <small>Current Product Amount</small>
                          <strong>{formatMoney(assignPreview?.currentProductAmount)}</strong>
                        </div>
                        <div>
                          <small>This Product Amount</small>
                          <strong>{formatMoney(assignPreview?.assignProductAmount)}</strong>
                        </div>
                        <div>
                          <small>Projected Product Amount</small>
                          <strong>{formatMoney(assignPreview?.projectedProductAmount)}</strong>
                        </div>
                        <div>
                          <small>75% Limit Threshold</small>
                          <strong>{formatMoney(assignPreview?.thresholdAmount)}</strong>
                        </div>
                        <div>
                          <small>GST</small>
                          <strong>{Number(assignPreview?.gstPercent || 3)}%</strong>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="small text-muted">Utilization: {Number(assignPreview?.utilizationPercent || 0).toFixed(2)}%</span>
                        <span className={`badge ${assignPreview?.canAssignForLimit ? 'badge-success' : 'badge-danger'}`}>
                          {assignPreview?.canAssignForLimit ? 'Allowed' : 'Blocked (75% Rule)'}
                        </span>
                      </div>
                      {assignPreviewError ? <div className="small text-danger mt-2">{assignPreviewError}</div> : null}
                      {isAssignPreviewLoading ? <div className="small text-muted mt-2">Checking wallet and limit...</div> : null}
                    </div>
                  )}
                </div>
                <div className="card-footer d-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary mr-2" onClick={closeAssignModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={!assignModalJewelerId || isAssigningProduct || isAssignPreviewLoading || assignPreview?.canAssignForLimit === false}
                    onClick={handleAssignFromModal}
                  >
                    {isAssigningProduct ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteModal && (
            <div className="pm-modal-backdrop" onClick={() => setDeleteModal(null)}>
              <div className="card pm-modal-card pm-modal-card--sm" onClick={(event) => event.stopPropagation()}>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">{deleteModal.title}</h5>
                  <button type="button" className="btn btn-sm btn-light" onClick={() => setDeleteModal(null)}>
                    <i className="fa fa-times" />
                  </button>
                </div>
                <div className="card-body">
                  <p className="mb-0">{deleteModal.message}</p>
                </div>
                <div className="card-footer d-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary mr-2" onClick={() => setDeleteModal(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleConfirmDelete} disabled={deletingProducts}>
                    {deletingProducts ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductCatalogPage;
