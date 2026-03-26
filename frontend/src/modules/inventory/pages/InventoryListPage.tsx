import { Link } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { ProductListUrl } from '@variable';
import { useMyInventory } from '../hooks/useMyInventory';
import { UrlTablePagination } from '@common/TablePagination';
import { useUrlPagination } from '@hooks/useUrlPagination';
import { IndNumberFormat } from '@utils/formateDate';
import { resolveProductPricing } from '../../products/utils/pricing';

type AcceptMode = 'memo' | 'outright';
type InventoryParam = {
  item: any;
  index: number;
  page: number;
  limit: number;
  actionable: boolean;
  canMarkSold: boolean;
  selectedMode: AcceptMode;
  isAccepting: boolean;
  isRejecting: boolean;
  isSelling: boolean;
  onModeChange: (mode: AcceptMode) => void;
  onAccept: () => void;
  onReject: () => void;
  onMarkSold: () => void;
};

const EmptyState = ({ message }: { message: string }) => (
  <tr>
    <td colSpan={11} className="text-muted py-4">
      {message}
    </td>
  </tr>
);

const getUsageLabel = (usage?: string) => {
  const key = `${usage || ''}`.trim().toLowerCase();
  if (key === 'memo' || key === 'rented' || key === 'rent') return 'Memo';
  if (key === 'outright') return 'Outright';
  if (!key) return '-';
  return key;
};

const getStatusLabel = (status?: string) => {
  const key = `${status || ''}`.trim().toUpperCase();
  if (key === 'RENTED') return 'MEMO';
  if (key === 'PURCHASE_PENDING_PAYMENT') return 'PURCHASE PENDING PAYMENT';
  return key || '-';
};

const InventoryRow = ({ item, index, page, limit, actionable, canMarkSold, selectedMode, isAccepting, isRejecting, isSelling, onModeChange, onAccept, onReject, onMarkSold }: InventoryParam) => {
  const rowNumber = (page - 1) * limit + index + 1;
  const pricing = resolveProductPricing(item);
  const netWeight = Number(item?.weight?.netWeight);
  const diamondCt = Number(item?.diamond?.weight);

  return (
    <tr>
      <td>{rowNumber}</td>
      <td>{item?.product?.jewelCode || '-'}</td>
      <td>{item?.product?.styleCode || '-'}</td>
      <td>{Number.isFinite(netWeight) ? netWeight : '-'}</td>
      <td>{Number.isFinite(diamondCt) ? diamondCt : '-'}</td>
      <td>{IndNumberFormat(pricing.finalPrice)}</td>
      <td className="p-0">{item.image ? <img src={item.image} alt={item?.product?.jewelCode || 'Product'} width={50} height={50} loading="lazy" className="object-fit-cover" /> : '-'}</td>
      <td>{item.qty || 0}</td>
      <td>{getStatusLabel(item.status)}</td>
      <td>{getUsageLabel(item?.usage?.type || item?.usageType)}</td>
      <td>
        {actionable ? (
          <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
            <select className="form-control form-control-sm" style={{ width: 130, minHeight: '35px' }} value={selectedMode} onChange={(e) => onModeChange(e.target.value as AcceptMode)} disabled={isAccepting || isRejecting}>
              <option value="memo">Accept as Memo</option>
              <option value="outright">Accept Outright</option>
            </select>
            <button className="btn btn-success btn-sm" onClick={onAccept} disabled={isAccepting || isRejecting} aria-label={`Accept ${item?.product?.jewelCode || item?._id}`}>
              {isAccepting ? 'Accepting...' : 'Accept'}
            </button>
            <button className="btn btn-outline-danger btn-sm" onClick={onReject} disabled={isRejecting || isAccepting} aria-label={`Reject ${item?.product?.jewelCode || item?._id}`}>
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        ) : canMarkSold ? (
          <button className="btn btn-outline-primary btn-sm" onClick={onMarkSold} disabled={isSelling} aria-label={`Mark ${item?.product?.jewelCode || item?._id} sold`}>
            {isSelling ? 'Processing...' : 'Mark Sold'}
          </button>
        ) : (
          <span className="text-muted">-</span>
        )}
      </td>
    </tr>
  );
};

type InventoryPageProps = {
  view: 'accepted' | 'pending';
  pageTitle: string;
  description: string;
  heroTitle: string;
  heroDescription: string;
};

const InventoryPage = ({ view, pageTitle, description, heroTitle, heroDescription }: InventoryPageProps) => {
  const { data: user } = useAuthSellerLogin();
  const { page, limit, setPage: setUrlPage, setLimit: setUrlLimit } = useUrlPagination();

  const isAdminLike = useMemo(() => {
    const role = `${user?.role || ''}`.toLowerCase();
    return ['admin', 'super-admin', 'distributor'].includes(role);
  }, [user?.role]);

  const {
    list: { items, total, isLoading },
    pagination: { setPage },
    searchState: { search, setSearch, loadInventory },
    responses: { acceptModeById, setAcceptModeById, onAccept, onReject, onMarkSold, isAccepting, isRejecting, isSelling, canRespond },
  } = useMyInventory(user, view, {
    page,
    limit,
    onPageChange: setUrlPage,
    onLimitChange: setUrlLimit,
  });
  const runSearch = useCallback(() => {
    setPage(1);
    loadInventory({ page: 1, search });
  }, [setPage, loadInventory, search]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      runSearch();
    },
    [runSearch],
  );

  const handleReset = useCallback(() => {
    setSearch('');
    setPage(1);
    loadInventory({ page: 1, search: '' });
  }, [setSearch, setPage, loadInventory]);

  const rowsData = useMemo(() => {
    return items.map((item) => {
      const statusKey = `${item?.status || ''}`.toUpperCase();
      const usageKey = `${item?.usage?.type || item?.usageType || ''}`.toLowerCase();
      const canSellOutright = usageKey === 'outright' && (statusKey === 'ACTIVE' || statusKey === 'PURCHASE_PENDING_PAYMENT');
      const canSellMemo = (usageKey === 'memo' || usageKey === 'rented' || usageKey === 'rent') && statusKey === 'RENTED';
      const canMarkSold = view === 'accepted' && (canSellOutright || canSellMemo);
      return {
        item,
        selectedMode: acceptModeById[item._id] || 'memo',
        actionable: !!canRespond[item._id],
        canMarkSold,
      };
    });
  }, [items, acceptModeById, canRespond, view]);
  return (
    <>
      <Header />
      <div className="content-body">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-3">
            <div className="col-sm-12 p-md-0 d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="welcome-text">
                <h4 className="mb-1">{heroTitle}</h4>
                <p className="text-muted mb-0">{heroDescription}</p>
              </div>
              {isAdminLike && (
                <Link to={ProductListUrl} className="btn btn-outline-secondary">
                  Go to Product List
                </Link>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex flex-wrap align-items-end justify-content-between gap-3">
              <div>
                <h5 className="mb-1">{pageTitle}</h5>
                <p className="text-muted mb-0">{description}</p>
              </div>

              <form className="d-flex flex-wrap align-items-center gap-2" onSubmit={handleSearch}>
                <div className="pm-input-wrap inventory-search-wrap">
                  <input
                    type="search"
                    className="form-control pm-search-input"
                    placeholder="Search by jewel or style code"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ minWidth: 260 }}
                    aria-label="Search inventory"
                  />
                  <button type="button" className="pm-input-icon pm-input-action" onClick={runSearch} disabled={isLoading} aria-label="Search">
                    <i className="fa fa-search" aria-hidden="true" />
                  </button>
                  <button type="button" className="pm-input-clear" onClick={handleReset} disabled={isLoading} aria-label="Reset search">
                    <i className="fa fa-times" aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>

            <div className="card-body">
              <div className="table-responsive table-ui-responsive">
                <table className="table table-ui mb-0 text-center" aria-label="Inventory table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Jewel Code</th>
                      <th scope="col">Style</th>
                      <th scope="col">Net Wt</th>
                      <th scope="col">Diamond Ct</th>
                      <th scope="col">MRP</th>
                      <th scope="col">Image</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Status</th>
                      <th scope="col">Usage</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && <EmptyState message="Loading inventory..." />}
                    {!isLoading && items.length === 0 && <EmptyState message="No inventory items found." />}
                    {!isLoading &&
                      rowsData.map(({ item, selectedMode, actionable, canMarkSold }, idx) => (
                        <InventoryRow
                          key={item._id}
                          item={item}
                          index={idx}
                          page={page}
                          limit={limit}
                          actionable={actionable}
                          canMarkSold={canMarkSold}
                          selectedMode={selectedMode}
                          isAccepting={isAccepting}
                          isRejecting={isRejecting}
                          isSelling={isSelling}
                          onModeChange={(mode) =>
                            setAcceptModeById((prev) => ({
                              ...prev,
                              [item._id]: mode,
                            }))
                          }
                          onAccept={() => onAccept(item._id, selectedMode)}
                          onReject={() => onReject(item._id)}
                          onMarkSold={() => onMarkSold(item)}
                        />
                      ))}
                  </tbody>
                </table>
              </div>

              <UrlTablePagination total={total} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const InventoryListPage = () => (
  <InventoryPage view="accepted" pageTitle="My Inventory" description="Showing only products you accepted as outright or memo." heroTitle="My Inventory" heroDescription="Items you already accepted as outright or memo." />
);

export const PendingAssignmentsPage = () => (
  <InventoryPage view="pending" pageTitle="Pending Assignments" description="Accept or reject products newly assigned to you." heroTitle="Pending Assignments" heroDescription="Review products assigned to you and respond." />
);

export default InventoryListPage;
