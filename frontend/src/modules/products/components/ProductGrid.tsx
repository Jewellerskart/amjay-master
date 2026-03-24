import React from 'react';
import { ProductGridProps } from '../utils/type';
import { ProductCard } from './ProductCard';
import { ProductDetailUrl } from '@variable';

export const ProductGrid: React.FC<ProductGridProps> = ({ products, isJewelerRole, isLoading, hasMore, onQuantityChange, onInquiry, onLoadMore }) => {
  const hideOwnership = isJewelerRole;

  if (products.length === 0 && !isLoading) {
    return <div className="alert alert-info">No products found. Try adjusting your filters.</div>;
  }

  return (
    <>
      <div className="position-relative">
        {isLoading && (
          <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center product-grid-loading" style={{ zIndex: 5 }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        <div className="row g-3">
          {products.map((product) => {
            const jewelCode = product?.product?.jewelCode ? encodeURIComponent(product.product.jewelCode) : '';
            const detailHref = jewelCode ? ProductDetailUrl.replace(':jewelCode', jewelCode) : undefined;

            return (
              <div key={product._id} className="col-12 col-sm-6 col-md-4 mt-2">
                <ProductCard product={product} hideOwnership={hideOwnership} onQuantityChange={(val) => onQuantityChange(product._id, val)} onInquiry={() => onInquiry(product?.product?.styleCode || '')} detailHref={detailHref} />
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
