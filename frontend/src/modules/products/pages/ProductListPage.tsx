import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { useSelection } from '@hooks/useSelection';
import { useProductMaster } from '../hooks/useProductMaster';
import { JewelerSelect } from '../../inventory/hooks/JewelerSelect';
import { Link } from 'react-router-dom';
import { useBulkProductAssignment } from '../hooks/useBulkProductAssignment';
import { UrlTablePagination } from '@common/TablePagination';
import { useUrlParams } from '@hooks/useUrlParams';
import { useExportProductsMutation, useLazyExportProductSampleQuery, useBulkDeleteProductsMutation } from '@api/apiHooks/product';

const formatMoney = (value?: number | string | null) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const ProductCatalogPage = () => {
  const { data: user } = useAuthSellerLogin();
  const { page, limit, setSearchParams } = useUrlParams();
  const [exportProducts, { isLoading: exporting }] = useExportProductsMutation();
  const [triggerSample, { isFetching: downloadingSample }] = useLazyExportProductSampleQuery();
  const [bulkDeleteProducts, { isLoading: deletingProducts }] = useBulkDeleteProductsMutation();

  const setUrlPage = (next: number) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', String(next));
      return params;
    });

  const setUrlLimit = (next: number) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('limit', String(next || 10));
      params.set('page', '1');
      return params;
    });

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
    setLimit,
    setSearch,
    setHolderRole,
    setSortBy,
    setSortDir,
    onSearch,
    loadProducts,
    isLoadingProducts,
    summary,
    qtyByProductId,
    setQtyByProductId,
    onUpdateQty,
    isUpdatingProduct,
    jewelers,
    assignByProductId,
    setAssignByProductId,
    assignQtyByProductId,
    setAssignQtyByProductId,
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

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} product(s)?`)) return;
    try {
      await bulkDeleteProducts({ ids: selectedIds }).unwrap();
      toast.success('Deleted selected products');
      setPage(1);
      await loadProducts();
      clearSelection();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete products');
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await bulkDeleteProducts({ ids: [id] }).unwrap();
      toast.success('Product deleted');
      await loadProducts();
      clearSelection();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete product');
    }
  };

  const getProductId = useCallback((product: (typeof products)[number]) => product._id, []);
  const { selectedIds, allSelected, toggleAll, toggleOne, clearSelection } = useSelection(products, getProductId);
  const totalColumns = (canAssign ? 12 : 10) + (isAdmin ? 1 : 0);

  const { bulkJewelerId, setBulkJewelerId, assignSelected } = useBulkProductAssignment({
    canAssign,
    products,
    assignQtyByProductId,
    onAssignProduct,
    onAfterAssign: loadProducts,
  });

  useEffect(() => {
    clearSelection();
  }, [products, clearSelection]);

  const toggleSort = (column: 'createdAt' | 'jewelCode' | 'qty' | 'livePrice') => {
    const nextDir = sortBy === column ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortBy(column);
    setSortDir(nextDir);
    setPage(1);
  };

  const renderSort = (column: 'createdAt' | 'jewelCode' | 'qty' | 'livePrice') => {
    if (sortBy !== column) return <i className="fa fa-sort text-muted ml-1" />;
    return sortDir === 'asc' ? <i className="fa fa-sort-asc ml-1" /> : <i className="fa fa-sort-desc ml-1" />;
  };

  const handleAssignSelected = async () => {
    await assignSelected(selectedIds);
    clearSelection();
  };

  return (
    <>
      <Header />
      <div className="content-body product-master-page">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-3">
            <div className="col-sm-12 p-md-0 d-flex justify-content-between align-items-center flex-wrap">
              <div className="welcome-text">
                <h4 className="mb-1">Product Master</h4>
                <span className="text-muted">Card catalog + inventory operations + assignment workflow.</span>
              </div>
              <div className="d-flex gap-2">
                {isAdmin && (
                  <button className="btn btn-outline-danger btn-sm" type="button" onClick={handleDeleteSelected} disabled={deletingProducts || selectedIds.length === 0}>
                    {deletingProducts ? 'Deleting...' : `Delete Selected${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
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
                  <small>Total Products</small>
                  <h3>{totalProducts}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card pm-summary-card pm-summary-card--two">
                <div className="card-body py-3">
                  <small>Total Inventory Qty</small>
                  <h3>{summary.totalQty}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card pm-summary-card pm-summary-card--three">
                <div className="card-body py-3">
                  <small>With Jeweler</small>
                  <h3>{summary.jewelerHeld}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card pm-summary-card pm-summary-card--four">
                <div className="card-body py-3">
                  <small>With Distributor</small>
                  <h3>{summary.distributorHeld}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="row align-items-end w-100">
                <div className="col-md-4 mb-2">
                  <label className="small text-muted mb-1">Search</label>
                  <input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Jewel code, style, remarks" />
                </div>
                <div className="col-md-2 mb-2">
                  <label className="small text-muted mb-1">Holder Role</label>
                  <select className="form-control" value={holderRole} onChange={(e) => setHolderRole(e.target.value as '' | 'super-admin' | 'admin' | 'distributor' | 'jeweler')}>
                    <option value="">All</option>
                    <option value="distributor">Distributor</option>
                    <option value="jeweler">Jeweler</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="col-md-2 mb-2">
                  <label className="small text-muted mb-1">Rows</label>
                  <select className="form-control" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 mb-2 d-flex product-master-actions">
                  <button className="btn btn-outline-primary" type="button" onClick={onSearch}>
                    <i className="fa fa-search mr-1" /> Search
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setHolderRole('');
                      setPage(1);
                      loadProducts();
                    }}
                  >
                    <i className="fa fa-filter mr-1" /> Reset
                  </button>
                </div>
              </div>
              {canAssign && (
                <div className="row align-items-center w-100 mt-2">
                  <div className="col-md-4 mb-2">
                    <label className="small text-muted mb-1 d-block">Bulk assign jeweler</label>
                    <JewelerSelect value={bulkJewelerId} onChange={setBulkJewelerId} jewelers={jewelers as any} placeholder="Select jeweler" className="form-control-sm" />
                  </div>

                  <div className="col-md-3 mb-2 d-flex align-items-end">
                    <button className="btn btn-sm btn-success w-100" type="button" onClick={handleAssignSelected} disabled={isAssigningProduct}>
                      Assign selected
                    </button>
                  </div>
                  <div className="col-md-2 mb-2 text-muted small">Use qty column per row; select rows then assign.</div>
                </div>
              )}
            </div>
            <div className="card-body">
              <div className="table-responsive table-ui-responsive users-table-wrapper">
                <table className="table table-ui text-center mb-0">
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
                      <th>Style</th>
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
                        Usage {renderSort('createdAt')}
                      </th>
                      {canAssign && <th>Assign</th>}
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingProducts && (
                      <tr>
                        <td colSpan={totalColumns} className="text-muted py-4">
                          Loading inventory...
                        </td>
                      </tr>
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
                        return (
                          <tr key={item._id}>
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
                            <td>
                              <img src={item.image} width={'50px'} />
                            </td>
                            <td>{item?.product?.styleCode || '-'}</td>
                            <td>{formatMoney(item.liveMetal)}</td>
                            <td>{formatMoney(item.finalPrice)}</td>
                            <td className="text-capitalize">
                              {item?.currentHolder?.role || '-'}
                              {item?.currentHolder?.name ? ` | ${item.currentHolder.name}` : ''}
                            </td>
                            <td>
                              <div className="d-flex align-items-center justify-content-center product-qty-wrap">
                                <input
                                  type="number"
                                  min={0}
                                  className="form-control form-control-sm"
                                  value={qtyByProductId[item._id] ?? `${item?.product?.qty || 0}`}
                                  onChange={(e) => setQtyByProductId((prev) => ({ ...prev, [item._id]: e.target.value }))}
                                />
                                <button className="btn btn-sm btn-outline-primary" onClick={() => onUpdateQty(item)} disabled={isUpdatingProduct}>
                                  Save
                                </button>
                              </div>
                            </td>
                            <td>{`${item?.diamond?.pieces || 0} pcs / ${item?.diamond?.weight || 0} ct`}</td>
                            <td className="text-capitalize">{item?.usage?.type || '-'}</td>
                            {canAssign && (
                              <td>
                                <div className="d-flex align-items-center justify-content-center product-assign-wrap">
                                  <input
                                    type="number"
                                    min={1}
                                    className="form-control form-control-sm"
                                    style={{ maxWidth: 90 }}
                                    value={assignQtyByProductId[item._id] || 1}
                                    onChange={(e) => setAssignQtyByProductId((prev) => ({ ...prev, [item._id]: e.target.value }))}
                                    placeholder="Qty"
                                  />
                                  <JewelerSelect
                                    value={assignByProductId[item._id] || ''}
                                    onChange={(value) => setAssignByProductId((prev) => ({ ...prev, [item._id]: value }))}
                                    jewelers={jewelers as any}
                                    placeholder="Jeweler"
                                    className="form-control-sm"
                                  />
                                  <button className="btn btn-sm btn-outline-success" onClick={() => onAssignProduct(item)} disabled={isAssigningProduct}>
                                    Assign
                                  </button>
                                </div>
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
        </div>
      </div>
    </>
  );
};

export default ProductCatalogPage;
