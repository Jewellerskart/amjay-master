import { IndNumberFormat } from '@utils/formateDate';
import { Link } from 'react-router-dom';
import { ProductCardProps } from '../utils/type';

export const ProductCard = ({ product, onInquiry, hideOwnership, detailHref, onQuantityChange }: ProductCardProps) => {
  const id = product._id;
  const name = product.product?.jewelCode || 'Product';
  const metal = product.material?.baseMetal || '';
  const diamond = product.diamond;
  const weight = product.weight?.grossWeight ? `${product.weight.grossWeight} g` : '';
  const price = product.finalPrice;
  const distributor = product.uploadedBy?.businessName || 'Owner';
  const image = product.image || product.media?.[0];
  const quantity = 1;
  const formattedPrice = IndNumberFormat(price as number | string) || 0;
  return (
    <div className="product-card  card border-0 shadow-sm">
      <div className="product-card__image-wrap">
        {image ? <img src={image} alt={name} className="product-card__image" loading="lazy" /> : <div className="product-card__image-fallback">No image</div>}
        <span className="product-card__price-pill product-card__price-pill--live d-flex">
          <span className="live-dot d-flex" aria-hidden="true" />₹ {formattedPrice}
        </span>
        {weight ? <span className="product-card__weight-pill">{weight}</span> : null}
      </div>

      <div className="card-body product-card__body">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div className="product-card__title">Code : {name}</div>
          {detailHref ? (
            <Link className="product-card__link" to={detailHref} aria-label={`Open details for ${name}`}>
              <i className="fa fa-arrow-right" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <div className="product-card__chips">
          <span className="product-chip product-chip--live"> {product.product?.styleCode}</span>
          <span className="product-chip">{metal || 'Metal N/A'}</span>
          {diamond ? (
            <span className="product-chip product-chip--muted">
              {diamond.pieces} <i className="fa fa-diamond mr-1"></i> | {diamond.weight} Cts
            </span>
          ) : null}
        </div>

        {!hideOwnership && distributor ? (
          <div className="product-card__meta">
            <i className="fa fa-store mr-1" aria-hidden="true" />
            {distributor}
          </div>
        ) : null}

        <div className="d-flex align-items-center mt-3   flex-wrap" style={{ gap: '8px' }}>
          <div className="d-flex align-items-center product-card__qty">
            <label htmlFor={`qty-${id || name}`} className="text-muted small mb-0 mr-1">
              Qty
            </label>
            <input id={`qty-${id || name}`} type="number" min={1} max={9999} className="form-control form-control-sm" value={quantity} onChange={(e) => onQuantityChange?.(Math.max(1, Number(e.target.value) || 1))} style={{ width: 78 }} />
          </div>
          <button className="btn btn-primary btn-sm flex-grow-1" onClick={onInquiry}>
            Add to Inquiry
          </button>
          {detailHref ? (
            <Link className="btn btn-outline-secondary btn-sm" to={detailHref} aria-label="View details">
              View
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};
