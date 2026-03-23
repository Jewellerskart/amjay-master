import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { Header } from '@common/header';
import { useProductMarketplace, useProductActions } from '../utils/hook';
import { useListProductsMutation } from '@api/apiHooks/product';
import { FilterPanel } from '../components/FilterPanel';
import { ProductGrid } from '../components/ProductGrid';
import { ActiveFilters } from '../components/ActiveFilters';
import { Product, ProductListResponse, FilterState } from '../utils/type';
import { ProductListUrl } from '@variable';
import { useProductFilters } from '../hooks/useProductFilters';

export const ProductMarketplacePage: React.FC = () => {
  const { data: user } = useAuthSellerLogin();
  const isJewelerRole = user?.role?.toLowerCase() === 'jeweler';

  const { filters, setFilters, updateFilter, toggleFilterSelection, clearFilterSelection, resetFilters } = useProductFilters();

  const { products, hasMore, totalCount, facets, bounds, isLoading, loadMore, applyFilters, fetchProducts } = useProductMarketplace({
    includeAssignedClones: false,
    filters,
    setFilters,
  });

  const [assignProducts, setAssignProducts] = useState<Product[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [fetchAssignProducts, { isLoading: isLoadingAssign }] = useListProductsMutation();

  const { qtyByProductId, isAccepting, updateQuantity, handleInquiry } = useProductActions({
    userId: user?._id,
    onProductAccepted: () => {
      // handled via state update in hook
    },
  });

  const loadAssignList = useCallback(
    async (searchTerm?: string) => {
      try {
        const response = (await fetchAssignProducts({
          page: 1,
          limit: 12,
          search: searchTerm?.trim() || undefined,
        }).unwrap()) as ProductListResponse;
        const items = Array.isArray(response?.data?.data) ? response.data.data : [];
        setAssignProducts(items);
      } catch (error: any) {
        const errorMessage = error?.data?.message || 'Failed to load assign products';
        toast.error(errorMessage);
        setAssignProducts([]);
      }
    },
    [fetchAssignProducts],
  );

  useEffect(() => {
    if (!isJewelerRole) {
      setAssignProducts([]);
      return;
    }

    void loadAssignList('');
  }, [isJewelerRole, loadAssignList]);

  const onAssignSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void loadAssignList(assignSearch);
    },
    [assignSearch, loadAssignList],
  );

  const onResetAssignSearch = useCallback(() => {
    setAssignSearch('');
    void loadAssignList('');
  }, [loadAssignList]);

  const handleSortChange = useCallback(
    (value: string) => {
      const [sortBy, sortDir] = value.split('-') as [FilterState['sortBy'], FilterState['sortDir']];
      const nextFilters = { ...filters, sortBy: sortBy || 'createdAt', sortDir: sortDir || 'desc' };
      setFilters(nextFilters);
      fetchProducts({ reset: true, overrideFilters: nextFilters });
    },
    [fetchProducts, filters, setFilters],
  );

  return (
    <div className="content-body product-marketplace-page">
      <Header />

      <div className="container-fluid py-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h4 className="mb-0">Product Marketplace</h4>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">Sort</label>
            <select className="form-control form-control-sm" value={`${filters.sortBy || 'createdAt'}-${filters.sortDir || 'desc'}`} onChange={(e) => handleSortChange(e.target.value)} style={{ minWidth: 180 }}>
              <option value="createdAt-desc">Newest first</option>
              <option value="livePrice-desc">Price: High to Low</option>
              <option value="livePrice-asc">Price: Low to High</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-3 mb-3">
            <FilterPanel
              filters={filters}
              facets={facets}
              bounds={bounds}
              totalCount={totalCount}
              displayedCount={products.length}
              isLoading={isLoading}
              onFilterChange={updateFilter}
              onToggleSelection={toggleFilterSelection}
              onClearSelection={clearFilterSelection}
              onApplyFilters={applyFilters}
              onResetFilters={resetFilters}
            />
          </div>

          <div className="col-lg-9">
            <ActiveFilters filters={filters} onRemoveFilter={toggleFilterSelection} />

            <ProductGrid
              products={products}
              isJewelerRole={isJewelerRole}
              qtyByProductId={qtyByProductId}
              isLoading={isLoading}
              hasMore={hasMore}
              isAccepting={isAccepting}
              onQuantityChange={updateQuantity}
              onInquiry={handleInquiry}
              onLoadMore={loadMore}
            />

            {isJewelerRole && (
              <div className="mt-5">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <h5 className="mb-1">Assign Product</h5>
                      <small className="text-muted">Search catalog items to request assignment.</small>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                      <form className="d-flex align-items-center gap-2" onSubmit={onAssignSearchSubmit}>
                        <input type="search" className="form-control form-control-sm" placeholder="Search products" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} style={{ minWidth: 220 }} />
                        <button className="btn btn-primary btn-sm" type="submit" disabled={isLoadingAssign}>
                          {isLoadingAssign ? 'Searching…' : 'Search'}
                        </button>
                        <button className="btn btn-link btn-sm" type="button" onClick={onResetAssignSearch} disabled={isLoadingAssign && assignSearch === ''}>
                          Reset
                        </button>
                      </form>
                      <div className="d-flex align-items-center text-muted small">
                        <span className="badge badge-light mr-2">{assignProducts.length}</span>
                        results
                      </div>
                      <Link to={ProductListUrl} className="btn btn-outline-secondary btn-sm">
                        Open Product List
                      </Link>
                    </div>
                  </div>

                  <div className="card-body">
                    {assignProducts.length === 0 && !isLoadingAssign ? <div className="text-center text-muted py-3">No products found. Try a different search.</div> : null}

                    <ProductGrid
                      products={assignProducts}
                      isJewelerRole={isJewelerRole}
                      qtyByProductId={qtyByProductId}
                      isLoading={isLoadingAssign}
                      hasMore={false}
                      isAccepting={isAccepting}
                      onQuantityChange={updateQuantity}
                      onInquiry={handleInquiry}
                      onLoadMore={() => {}}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductMarketplacePage;
