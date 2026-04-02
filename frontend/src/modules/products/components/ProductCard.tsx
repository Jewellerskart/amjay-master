import { IndNumberFormat } from '@utils/formateDate';
import { Link } from 'react-router-dom';
import { ProductCardProps } from '../utils/type';
import { resolveProductPricing } from '../utils/pricing';
import { getClarityFromItemCode, getShapeFromItemCode } from '../utils/diamondItemCode';

const MAX_VISIBLE_JEWEL_CODES = 4;
const MAX_JEWEL_CODE_LENGTH = 10;

const truncateJewelCode = (value?: string) => {
  const jewelCode = `${value || ''}`.trim();
  if (!jewelCode) return '-';
  return jewelCode.length > MAX_JEWEL_CODE_LENGTH ? `${jewelCode.slice(0, MAX_JEWEL_CODE_LENGTH)}...` : jewelCode;
};

const getDiamondComponent = (product: any) => {
  const components = Array.isArray(product?.components) ? product.components : [];
  return components.find((component: any) => `${component?.type || ''}`.trim().toLowerCase() === 'diamond') || null;
};

const getDiamondPointer = (product: any, component: any) => {
  const explicitPointer = Number(component?.pointer);
  if (Number.isFinite(explicitPointer) && explicitPointer > 0) return explicitPointer;
  const pieces = Number(component?.pieces ?? product?.diamond?.pieces);
  const weight = Number(component?.weight ?? product?.diamond?.weight);
  if (!Number.isFinite(pieces) || !Number.isFinite(weight) || pieces <= 0 || weight <= 0) return null;
  return Number(((weight / pieces) * 100).toFixed(2));
};

export const ProductCard = ({ product, onInquiry, hideOwnership, detailHref, quantity = 1, onQuantityChange }: ProductCardProps) => {
  const id = product?._id;
  const styleCode = product?.product?.styleCode || product?.styleCode || 'N/A';
  const jewelCodes = Array.isArray(product?.jewelCodes) ? product.jewelCodes : [];
  const hasOverflowJewelCodes = jewelCodes.length > MAX_VISIBLE_JEWEL_CODES;
  const visibleCount = hasOverflowJewelCodes ? MAX_VISIBLE_JEWEL_CODES - 1 : MAX_VISIBLE_JEWEL_CODES;
  const visibleJewelCodes = jewelCodes.slice(0, Math.max(0, visibleCount));
  const remainingJewelCodes = Math.max(0, jewelCodes.length - visibleJewelCodes.length);
  const primaryJewelCode = jewelCodes[0]?.jewelCode || product?.product?.jewelCode || 'Product';
  const metal = product?.material?.baseMetal || '';
  const diamond = product?.diamond;
  const weight = product?.weight?.grossWeight ? `${product.weight.grossWeight} g` : '';
  const { finalPrice } = resolveProductPricing(product);
  const distributor = product?.uploadedBy?.businessName || 'Owner';
  const image = product?.image || product?.media?.[0];
  const formattedPrice = IndNumberFormat(finalPrice as number | string) || 0;
  const diamondComponent = getDiamondComponent(product);
  const diamondClarity = `${diamondComponent?.clarity || getClarityFromItemCode(diamondComponent?.itemCode) || ''}`.trim().toUpperCase();
  const diamondShape = `${diamondComponent?.shape || getShapeFromItemCode(diamondComponent?.itemCode) || ''}`.trim().toUpperCase();
  const diamondPointer = getDiamondPointer(product, diamondComponent);

  return (
    <div className="product-card card border-0 shadow-sm">
      <div className="product-card__image-wrap">
        {image ? <img src={image} alt={primaryJewelCode} className="product-card__image" loading="lazy" /> : <div className="product-card__image-fallback">No image</div>}
        <span className="product-card__price-pill product-card__price-pill--live d-flex">
          <span className="live-dot d-flex" aria-hidden="true" />
          Rs. {formattedPrice}
        </span>
        {weight ? <span className="product-card__weight-pill">{weight}</span> : null}
      </div>

      <div className="card-body product-card__body">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div className="product-chip product-chip--live">{styleCode}</div>
          {detailHref ? (
            <Link className="product-card__link" to={detailHref} aria-label={`Open details for ${primaryJewelCode}`}>
              <i className="fa fa-arrow-right" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <div className="product-card__chips">
          <span className="product-chip">{metal || 'Metal N/A'}</span>
          {diamond ? (
            <span className="product-chip product-chip--muted">
              {diamond.pieces} <i className="fa fa-diamond mr-1"></i> | {diamond.weight} Cts
            </span>
          ) : null}
          {(diamondClarity || diamondShape || Number.isFinite(diamondPointer as number)) && (
            <span className="product-chip product-chip--muted">
              {diamondClarity || '-'} / {diamondShape || '-'} / {Number.isFinite(diamondPointer as number) ? `${Number(diamondPointer).toFixed(2)} pt` : '-'}
            </span>
          )}
        </div>

        {jewelCodes.length > 0 ? (
          <div className="product-card__jewel-list">
            {visibleJewelCodes.map((item: any) => (
              <span key={`${item?.jewelCode || ''}-${item?.productId || ''}`} className="product-chip product-chip--muted">
                {truncateJewelCode(item?.jewelCode)} ({item?.qty || 0})
              </span>
            ))}
            {remainingJewelCodes > 0 ? <span className="product-chip product-chip--muted">+{remainingJewelCodes} more</span> : null}
          </div>
        ) : (
          <div className="product-card__meta">Jewel Code: {primaryJewelCode}</div>
        )}

        {!hideOwnership && distributor ? (
          <div className="product-card__meta">
            <i className="fa fa-store mr-1" aria-hidden="true" />
            {distributor}
          </div>
        ) : null}

        <div className="d-flex align-items-center mt-3 flex-wrap" style={{ gap: '8px' }}>
          <div className="d-flex align-items-center product-card__qty">
            <label htmlFor={`qty-${id || primaryJewelCode}`} className="text-muted small mb-0 mr-1">
              Qty
            </label>
            <input
              id={`qty-${id || primaryJewelCode}`}
              type="number"
              min={1}
              max={9999}
              className="form-control form-control-sm"
              value={Math.max(1, Number(quantity) || 1)}
              onChange={(e) => onQuantityChange?.(Math.max(1, Number(e.target.value) || 1))}
              style={{ width: 78 }}
            />
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
