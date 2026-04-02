import { Link, useParams } from 'react-router-dom';
import { Header } from '@common/header';
import { useGetProductByIdQuery } from '@api/apiHooks/product';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { ProductListUrl } from '@variable';
import { resolveProductPricing } from '../utils/pricing';
import { getClarityFromItemCode, getShapeFromItemCode } from '../utils/diamondItemCode';

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="d-flex justify-content-between py-1 product-detail__row">
    <span className="text-muted small">{label}</span>
    <span className="font-weight-bold text-nowrap">{value ?? '-'}</span>
  </div>
);

const formatMoney = (value?: number | string | null) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `Rs. ${Math.round(num).toLocaleString('en-IN')}`;
};

const formatDate = (date?: string) => {
  if (!date) return '-';
  const dt = new Date(date);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleString();
};

const getDiamondComponent = (product: any) => {
  const components = Array.isArray(product?.components) ? product.components : [];
  return components.find((component: any) => `${component?.type || ''}`.trim().toLowerCase() === 'diamond') || null;
};

const getDiamondSpec = (product: any) => {
  const component = getDiamondComponent(product);
  const clarity = `${component?.clarity || getClarityFromItemCode(component?.itemCode) || ''}`.trim().toUpperCase();
  const shape = `${component?.shape || getShapeFromItemCode(component?.itemCode) || ''}`.trim().toUpperCase();
  const explicitPointer = Number(component?.pointer);
  const pieces = Number(component?.pieces ?? product?.diamond?.pieces);
  const weight = Number(component?.weight ?? product?.diamond?.weight);
  const pointer =
    Number.isFinite(explicitPointer) && explicitPointer > 0
      ? explicitPointer
      : Number.isFinite(pieces) && Number.isFinite(weight) && pieces > 0 && weight > 0
        ? Number(((weight / pieces) * 100).toFixed(2))
        : null;

  return {
    clarity: clarity || '-',
    shape: shape || '-',
    pointer: Number.isFinite(pointer as number) ? Number(pointer).toFixed(2) : '-',
  };
};

export const ProductDetailPage = () => {
  const { data: user } = useAuthSellerLogin();
  const { jewelCode = '' } = useParams<{ jewelCode: string }>();
  const identifier = decodeURIComponent(jewelCode || '');
  const { data, isLoading, isError, refetch } = useGetProductByIdQuery(identifier, { skip: !identifier });
  const product = data?.data?.product;
  const isJewelerView = `${user?.role || ''}`.trim().toLowerCase() === 'jeweler';

  const [coverImage, displayName] = [product?.image, product?.product?.jewelCode];
  const pricing = resolveProductPricing(product);
  const diamondSpec = getDiamondSpec(product);

  return (
    <div className="content-body product-detail-page">
      <Header />
      <div className="container-fluid py-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="mb-0">Product Detail</h4>
            <small className="text-muted">Full inventory record with weight, stone, and ownership history.</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm mr-2" onClick={() => refetch()} disabled={isLoading}>
              Refresh
            </button>
            <Link className="btn btn-primary btn-sm" to={ProductListUrl}>
              Back to Catalog
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="card">
            <div className="card-body py-5 text-center text-muted">Loading product...</div>
          </div>
        )}

        {(isError || (!isLoading && !product)) && (
          <div className="card">
            <div className="card-body py-5 text-center text-muted">Product not found.</div>
          </div>
        )}

        {!isLoading && product && (
          <>
            <div className="card product-detail-hero mb-3 shadow-sm">
              <div className="row g-0">
                <div className="col-lg-5">
                  <div className="pd-visual">
                    {coverImage ? <img src={coverImage} alt={displayName} className="pd-visual__img" loading="lazy" /> : <div className="pd-visual__fallback">Image unavailable</div>}
                    <span className="pd-pill pd-pill--status">{product?.status || 'Status N/A'}</span>
                    {product?.usage?.type ? <span className="pd-pill pd-pill--usage">{product.usage.type}</span> : null}
                  </div>
                </div>

                <div className="col-lg-7">
                  <div className="pd-hero-body">
                    <div className="pd-eyebrow">Design {product?.product?.styleCode || '-'}</div>
                    <h3 className="pd-title mb-1"># {displayName}</h3>
                    <div className="text-muted small mb-3">{(product?.product?.categoryGroupName || product?.category?.group || 'Category N/A') + ' | ' + (product?.product?.subCategory || product?.category?.subCategory || 'Sub category N/A')}</div>

                    <div className="pd-hero-chips">
                      <span className="pd-chip">
                        <i className="fa fa-balance-scale mr-1" aria-hidden="true" />
                        {product?.weight?.grossWeight ? `${product.weight.grossWeight} g gross` : 'Weight N/A'}
                      </span>
                      <span className="pd-chip">
                        <i className="fa fa-diamond mr-1" aria-hidden="true" />
                        {product?.diamond?.weight || 'Stone N/A'} ({product?.diamond?.pieces} )
                      </span>
                      <span className="pd-chip">
                        <i className="fa fa-certificate mr-1" aria-hidden="true" />
                        {product?.material?.metalGroupName || product?.material?.baseMetal || 'Metal N/A'}
                      </span>
                    </div>

                    <div className="pd-metrics">
                      {!isJewelerView && (
                        <div className="pd-metric">
                          <p className="label">Total Cost</p>
                          <h5 className="value">{formatMoney(product?.cost?.totalCost)}</h5>
                          <small className="text-muted">Includes labor & metals</small>
                        </div>
                      )}
                      <div className="pd-metric">
                        <p className="label">Live Metal Rate</p>
                        <h5 className="value">{formatMoney(pricing.liveMetal)}</h5>
                        <small className="text-muted">Real-time rate for this SKU</small>
                      </div>
                      <div className="pd-metric">
                        <p className="label">{isJewelerView ? 'Amount Payable' : 'Total Price'}</p>
                        <h5 className="value text-success">{formatMoney(pricing.finalPrice) || 'N/A'}</h5>
                        <small className="text-muted">
                          {isJewelerView ? `Tax: ${formatMoney(pricing.taxAmount)} | Commission: ${formatMoney(pricing.commissionTotal)}` : `Usage: ${product?.usage?.type || 'N/A'}`}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="row m-1">
                    <div className="col-lg-6">
                      <div className="card h-100 shadow-sm pd-card">
                        <div className="card-header bg-white border-0 pb-1">
                          <h6 className="mb-0">Identifiers</h6>
                        </div>
                        <div className="card-body pt-2">
                          <InfoRow label="Trans No" value={product?.product?.transNo || '-'} />
                          <InfoRow label="Order No" value={product?.product?.orderNo || '-'} />
                          <InfoRow label="Style Code" value={product?.product?.styleCode || '-'} />
                          <InfoRow label="Quantity" value={product?.qty ?? product?.product?.qty ?? '-'} />
                          <InfoRow label="Created" value={formatDate(product?.uploadedBy?.at)} />
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="card h-100 shadow-sm pd-card">
                        <div className="card-header bg-white border-0 pb-1">
                          <h6 className="mb-0">Material</h6>
                        </div>
                        <div className="card-body pt-2">
                          <InfoRow label="Base Metal" value={product?.material?.baseMetal || '-'} />
                          <InfoRow label="Metal Group" value={product?.material?.metalGroupName || '-'} />
                          <InfoRow label="Base Quality" value={product?.material?.baseQuality || '-'} />
                          <InfoRow label="Base Stone" value={product?.material?.baseStone || '-'} />
                          <InfoRow label="Stone Quality" value={product?.material?.stoneQuality || '-'} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4 mb-3">
                <div className="card h-100 shadow-sm pd-card">
                  <div className="card-header bg-white border-0 pb-1">
                    <h6 className="mb-0">Ownership</h6>
                  </div>
                  <div className="card-body pt-2">
                    <InfoRow label="Current Holder" value={product?.currentHolder?.name || product?.currentHolder?.role || '-'} />
                    <InfoRow label="Holder Business" value={product?.currentHolder?.businessName || '-'} />
                    <InfoRow label="Uploaded By" value={product?.uploadedBy?.name || '-'} />
                    <InfoRow label="Uploader Business" value={product?.uploadedBy?.businessName || '-'} />
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card h-100 shadow-sm pd-card">
                  <div className="card-header bg-white border-0 pb-1 d-flex align-items-center justify-content-between">
                    <h6 className="mb-0">{isJewelerView ? 'Weights & Pricing' : 'Weights & Cost'}</h6>
                    <span className="badge bg-light text-secondary">{isJewelerView ? 'grams / payable' : 'grams / Rs.'}</span>
                  </div>
                  <div className="card-body pt-2">
                    <InfoRow label="Gross Weight" value={product?.weight?.grossWeight ?? '-'} />
                    <InfoRow label="Net Weight" value={product?.weight?.netWeight ?? '-'} />
                    <InfoRow label="Pure Weight" value={product?.weight?.pureWeight ?? '-'} />
                    <InfoRow label="Live Metal Rate" value={formatMoney(pricing.liveMetal)} />
                    {isJewelerView ? (
                      <>
                        <InfoRow label="Base Amount" value={formatMoney(pricing.baseAmount)} />
                        <InfoRow label="Commission" value={formatMoney(pricing.commissionTotal)} />
                        <InfoRow label="Tax" value={formatMoney(pricing.taxAmount)} />
                        <InfoRow label="Final Amount" value={formatMoney(pricing.finalPrice)} />
                      </>
                    ) : (
                      <>
                        <InfoRow label="Piece Value" value={formatMoney(product?.cost?.pieceValue)} />
                        <InfoRow label="Metal Value" value={formatMoney(product?.cost?.metalValue)} />
                        <InfoRow label="Diamond Value" value={formatMoney(product?.cost?.diamondValue)} />
                        <InfoRow label="Color Stone Value" value={formatMoney(product?.cost?.colorStoneValue)} />
                        <InfoRow label="Other Metal Value" value={formatMoney(product?.cost?.otherMetalValue)} />
                        <InfoRow label="Set Amount" value={formatMoney(product?.cost?.setAmount)} />
                        <InfoRow label="Hand Amount" value={formatMoney(product?.cost?.handAmount)} />
                        <InfoRow label="Total Cost" value={formatMoney(product?.cost?.totalCost)} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card h-100 shadow-sm pd-card">
                  <div className="card-header bg-white border-0 pb-1 d-flex align-items-center justify-content-between">
                    <h6 className="mb-0">Diamonds & Stones</h6>
                    <span className="badge bg-light text-secondary">pcs / ct / Rs.</span>
                  </div>
                  <div className="card-body pt-2">
                    <InfoRow
                      label="Diamond"
                      value={
                        isJewelerView
                          ? `${product?.diamond?.pieces || 0} pcs / ${product?.diamond?.weight || 0} ct`
                          : `${product?.diamond?.pieces || 0} pcs / ${product?.diamond?.weight || 0} ct / ${formatMoney(product?.diamond?.costAmount)}`
                      }
                    />
                    <InfoRow label="Diamond Clarity" value={diamondSpec.clarity} />
                    <InfoRow label="Diamond Shape" value={diamondSpec.shape} />
                    <InfoRow label="Diamond Pointer" value={diamondSpec.pointer} />
                    <InfoRow
                      label="Color Diamond"
                      value={
                        isJewelerView
                          ? `${product?.colorDiamond?.pieces || 0} pcs / ${product?.colorDiamond?.weight || 0} ct`
                          : `${product?.colorDiamond?.pieces || 0} pcs / ${product?.colorDiamond?.weight || 0} ct / ${formatMoney(product?.colorDiamond?.costAmount)}`
                      }
                    />
                    <InfoRow
                      label="Cubic Zirconia"
                      value={
                        isJewelerView
                          ? `${product?.cubicZirconia?.pieces || 0} pcs / ${product?.cubicZirconia?.weight || 0} ct`
                          : `${product?.cubicZirconia?.pieces || 0} pcs / ${product?.cubicZirconia?.weight || 0} ct / ${formatMoney(product?.cubicZirconia?.costAmount)}`
                      }
                    />
                    <InfoRow
                      label="Stone"
                      value={
                        isJewelerView
                          ? `${product?.stone?.pieces || 0} pcs / ${product?.stone?.weight || 0} ct`
                          : `${product?.stone?.pieces || 0} pcs / ${product?.stone?.weight || 0} ct / ${formatMoney(product?.stone?.costAmount)}`
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card shadow-sm pd-card">
              <div className="card-header bg-white border-0 pb-1 d-flex align-items-center justify-content-between">
                <h6 className="mb-0">Components</h6>
                <small className="text-muted">Metals / Diamonds / Stones / Charges</small>
              </div>
              <div className="card-body">
                {Array.isArray(product?.components) && product.components.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm mb-3">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Item</th>
                          <th>Item Code</th>
                          <th>Pieces</th>
                          <th>Weight</th>
                          <th>sizeCode</th>
                          <th>sizeName</th>
                          {!isJewelerView && <th>Cost Amt</th>}
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.components.map((comp: any, idx: number) => (
                          <tr key={`${comp?.itemCode || comp?.itemName || idx}-${idx}`}>
                            <td className="text-capitalize">{comp?.type || '-'}</td>
                            <td>{comp?.itemName || '-'}</td>
                            <td>{comp?.itemCode || '-'}</td>
                            <td>{comp?.pieces ?? '-'}</td>
                            <td>{comp?.weight ?? '-'}</td>
                            <td>{comp?.sizeCode ?? '-'}</td>
                            <td> {comp?.sizeName ?? '-'}</td>
                            {!isJewelerView && <td>{formatMoney(comp?.costAmt)}</td>}
                            <td>{formatMoney(comp?.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted mb-0">No component breakdown.</p>
                )}

                {Array.isArray(product?.charges) && product.charges.length > 0 ? (
                  <div className="mt-3">
                    <h6 className="mb-2">Charges</h6>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.charges.map((c: any, idx: number) => (
                          <tr key={`${c?.type || idx}-${idx}`}>
                            <td>{c?.type || '-'}</td>
                            <td>{formatMoney(c?.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>

            {!isJewelerView && (
              <div className="card shadow-sm pd-card">
                <div className="card-header bg-white border-0 pb-1 d-flex align-items-center justify-content-between">
                  <h6 className="mb-0">Assignment Timeline</h6>
                  <small className="text-muted">Latest first</small>
                </div>
                <div className="card-body">
                  {Array.isArray(product?.assignmentLogs) && product.assignmentLogs.length > 0 ? (
                    <div className="pd-timeline">
                      {product.assignmentLogs.map((log: any, idx: number) => (
                        <div className="pd-timeline__item" key={`${log?.assignedAt || idx}-${idx}`}>
                          <div className="pd-timeline__dot" />
                          <div className="pd-timeline__content">
                            <div className="d-flex justify-content-between align-items-center">
                              <strong>{log?.fromName || log?.fromRole || '-'}</strong>
                              <span className="text-muted small">{formatDate(log?.assignedAt)}</span>
                            </div>
                            <div className="text-primary small mb-1">to {log?.toName || log?.toRole || '-'}</div>
                            <div className="text-muted small">{log?.remark || 'No remarks'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted mb-0">No assignment history.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
