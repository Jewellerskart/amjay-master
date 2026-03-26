import React from 'react';
import { ProductGridProps } from '../utils/type';
import { ProductCard } from './ProductCard';
import { ProductDetailUrl } from '@variable';

export const ProductGrid: React.FC<ProductGridProps> = ({ products, isJewelerRole, qtyByProductId, isLoading, hasMore, onQuantityChange, onInquiry, onLoadMore }) => {
  const hideOwnership = isJewelerRole;
  const showInitialLoading = isLoading && products.length === 0;
  const showOverlayLoading = isLoading && products.length > 0;

  if (showInitialLoading) {
    return (
      <div className="row g-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`product-skeleton-${index}`} className="col-12 col-sm-6 col-md-4 mt-2">
            <div className="product-card-skeleton">
              <div className="product-card-skeleton__image shimmer" />
              <div className="product-card-skeleton__body">
                <div className="product-card-skeleton__line shimmer" />
                <div className="product-card-skeleton__line product-card-skeleton__line--short shimmer" />
                <div className="product-card-skeleton__chip-row">
                  <span className="product-card-skeleton__chip shimmer" />
                  <span className="product-card-skeleton__chip shimmer" />
                </div>
                <div className="product-card-skeleton__actions">
                  <span className="product-card-skeleton__button shimmer" />
                  <span className="product-card-skeleton__button product-card-skeleton__button--light shimmer" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <div className="alert alert-info">No products found. Try adjusting your filters.</div>;
  }

  return (
    <>
      <div className="position-relative">
        {showOverlayLoading && (
          <div className="product-grid-loading-ribbon" style={{ zIndex: 5 }}>
            <div className="product-grid-loading-ribbon__bar" />
          </div>
        )}

        <div className="row g-3">
          {products.map((product) => {
            const primaryJewelCode = product?.jewelCodes?.[0]?.jewelCode || product?.product?.jewelCode || '';
            const jewelCode = primaryJewelCode ? encodeURIComponent(primaryJewelCode) : '';
            const styleCode = product?.product?.styleCode || '';
            const quantityKey = styleCode || product._id;
            const detailHref = jewelCode ? ProductDetailUrl.replace(':jewelCode', jewelCode) : undefined;

            return (
              <div key={product._id} className="col-12 col-sm-6 col-md-4 mt-2">
                <ProductCard
                  product={product}
                  hideOwnership={hideOwnership}
                  quantity={qtyByProductId[quantityKey] || 1}
                  onQuantityChange={(val) => onQuantityChange(quantityKey, val)}
                  onInquiry={() => onInquiry(styleCode)}
                  detailHref={detailHref}
                />
              </div>
            );
          })}
        </div>
      </div>
      {hasMore && (
        <div className="d-flex justify-content-center mt-4">
          <button className="btn btn-outline-secondary" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </>
  );
};
