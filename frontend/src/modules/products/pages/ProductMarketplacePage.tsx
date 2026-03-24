import React, { useCallback } from 'react';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { Header } from '@common/header';
import { useProductMarketplace, useProductActions } from '../utils/hook';
import { FilterPanel } from '../components/FilterPanel';
import { ProductGrid } from '../components/ProductGrid';
import { ActiveFilters } from '../components/ActiveFilters';
import { FilterState } from '../utils/type';
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

  const { qtyByProductId, isAccepting, updateQuantity, handleInquiry } = useProductActions({
    userId: user?._id,
    onProductAccepted: () => {
      // handled via state update in hook
    },
  });

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductMarketplacePage;
