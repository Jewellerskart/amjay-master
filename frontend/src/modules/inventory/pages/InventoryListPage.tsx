import { Link } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { ProductListUrl } from '@variable';
import { useMyInventory } from '../hooks/useMyInventory';
import { UrlTablePagination } from '@common/TablePagination';
import { useUrlParams } from '@hooks/useUrlParams';
import { IndNumberFormat } from '@utils/formateDate';

type AcceptMode = 'rent' | 'outright';
type InventoryParam = {
  item: any;
  index: number;
  page: number;
  limit: number;
  actionable: boolean;
  selectedMode: AcceptMode;
  isAccepting: boolean;
  isRejecting: boolean;
  onModeChange: (mode: AcceptMode) => void;
  onAccept: () => void;
  onReject: () => void;
};

const EmptyState = ({ message }: { message: string }) => (
  <tr>
    <td colSpan={9} className="text-muted py-4">
      {message}
    </td>
  </tr>
);

const InventoryRow = ({ item, index, page, limit, actionable, selectedMode, isAccepting, isRejecting, onModeChange, onAccept, onReject }: InventoryParam) => {
  const rowNumber = (page - 1) * limit + index + 1;
  return (
    <tr>
      <td>{rowNumber}</td>
      <td>{item.product.jewelCode || '-'}</td>
      <td>{item.product.styleCode || '-'}</td>
      <td>{IndNumberFormat(item.finalPrice)}</td>
      <td className="p-0">{item.image ? <img src={item.image} alt={item.jewelCode || 'Product'} width={50} height={50} loading="lazy" className="object-fit-cover" /> : '-'}</td>
      <td>{item.qty || 0}</td>
      <td className="text-capitalize">{item.status?.toLowerCase() || '-'}</td>
      <td className="text-capitalize">{item?.usage?.type?.toLowerCase() || '-'}</td>
      <td>
        {actionable ? (
          <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
            <select className="form-control form-control-sm" style={{ width: 130, minHeight: '35px' }} value={selectedMode} onChange={(e) => onModeChange(e.target.value as AcceptMode)} disabled={isAccepting || isRejecting}>
              <option value="rent">Accept as Rent</option>
              <option value="outright">Accept Outright</option>
            </select>
            <button className="btn btn-success btn-sm" onClick={onAccept} disabled={isAccepting || isRejecting} aria-label={`Accept ${item.jewelCode}`}>
              {isAccepting ? 'Accepting...' : 'Accept'}
            </button>
            <button className="btn btn-outline-danger btn-sm" onClick={onReject} disabled={isRejecting || isAccepting} aria-label={`Reject ${item.jewelCode}`}>
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
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
  const { page, limit, setSearchParams } = useUrlParams();

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

  const isAdminLike = useMemo(() => {
    const role = `${user?.role || ''}`.toLowerCase();
    return ['admin', 'super-admin', 'distributor'].includes(role);
  }, [user?.role]);

  const {
    list: { items, total, isLoading },
    pagination: { setPage },
    searchState: { search, setSearch, loadInventory },
    responses: { acceptModeById, setAcceptModeById, onAccept, onReject, isAccepting, isRejecting, canRespond },
  } = useMyInventory(user, view, {
    page,
    limit,
    onPageChange: setUrlPage,
    onLimitChange: setUrlLimit,
  });

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPage(1);
      loadInventory({ page: 1, search });
    },
    [setPage, loadInventory, search],
  );

  const handleReset = useCallback(() => {
    setSearch('');
    setPage(1);
    loadInventory({ page: 1, search: '' });
  }, [setSearch, setPage, loadInventory]);

  const rowsData = useMemo(
    () =>
      items.map((item) => ({
        item,
        selectedMode: acceptModeById[item._id] || 'rent',
        actionable: !!canRespond[item._id],
      })),
    [items, acceptModeById, canRespond],
  );
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
                <input type="search" className="form-control" placeholder="Search by jewel or style code" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} aria-label="Search inventory" />

                <button type="submit" className="btn btn-outline-primary" disabled={isLoading}>
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
                <button type="button" className="btn btn-link" onClick={handleReset} disabled={isLoading} aria-label="Reset search">
                  Reset
                </button>
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
                      rowsData.map(({ item, selectedMode, actionable }, idx) => (
                        <InventoryRow
                          key={item._id}
                          item={item}
                          index={idx}
                          page={page}
                          limit={limit}
                          actionable={actionable}
                          selectedMode={selectedMode}
                          isAccepting={isAccepting}
                          isRejecting={isRejecting}
                          onModeChange={(mode) =>
                            setAcceptModeById((prev) => ({
                              ...prev,
                              [item._id]: mode,
                            }))
                          }
                          onAccept={() => onAccept(item._id, selectedMode)}
                          onReject={() => onReject(item._id)}
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
  <InventoryPage view="accepted" pageTitle="My Inventory" description="Showing only products you accepted as outright or rented." heroTitle="My Inventory" heroDescription="Items you already accepted as outright or rented." />
);

export const PendingAssignmentsPage = () => (
  <InventoryPage view="pending" pageTitle="Pending Assignments" description="Accept or reject products newly assigned to you." heroTitle="Pending Assignments" heroDescription="Review products assigned to you and respond." />
);

export default InventoryListPage;
