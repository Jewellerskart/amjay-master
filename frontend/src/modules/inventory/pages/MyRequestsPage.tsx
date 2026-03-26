import { useEffect } from 'react';
import { useListInventoryRequestsQuery } from '@api/apiHooks/inventory';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { Header } from '@common/header';

export const MyRequestsPage = () => {
  const { data: user } = useAuthSellerLogin();
  const { data, isLoading, refetch } = useListInventoryRequestsQuery({ page: 1, limit: 20, requestedBy: user?._id });

  useEffect(() => {
    if (user?._id) {
      refetch();
    }
  }, [user?._id]);

  const items = data?.data?.data || [];
  const toStringId = (value: any) => (typeof value === 'string' ? value : `${value?._id || ''}`.trim());
  const toDisplayName = (value: any) => {
    if (!value || typeof value !== 'object') return '';
    const fullName = `${value?.firstName || ''} ${value?.lastName || ''}`.trim();
    return fullName || `${value?.businessName || ''}`.trim() || `${value?.email || ''}`.trim();
  };

  return (
    <div className="content-body inventory-requests-page">
      <Header />
      <div className="container-fluid py-3">
        <h4 className="mb-3">My Product Requests</h4>
        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-sm mb-0">
            <thead className="table-light">
              <tr>
                <th>Request ID</th>
                <th>Style</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Qty Progress</th>
                <th>Preferred Note</th>
                <th>Assigned Products</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8}>Loading...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8}>No requests found</td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const required = Math.max(1, Number(item?.requiredProducts || 1));
                  const assignedIds = [
                    ...(Array.isArray(item?.assignedProductIds) ? item.assignedProductIds.map((id: any) => toStringId(id)).filter(Boolean) : []),
                    toStringId(item?.assignedProductId),
                  ]
                    .filter(Boolean)
                    .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index);
                  const assignedCount = Math.min(required, Math.max(0, Number(item?.assignedCount ?? assignedIds.length)));
                  const pending = Math.max(0, required - assignedCount);

                  return (
                    <tr key={item._id}>
                      <td>{`${item._id || ''}`.slice(0, 8)}</td>
                      <td className="text-uppercase">{item?.styleCode || '-'}</td>
                      <td>{item.status}</td>
                      <td>{item.usageChoice}</td>
                      <td>
                        {assignedCount}/{required}
                        <small className="text-muted d-block">Pending: {pending}</small>
                      </td>
                      <td>{item.preferredUsageNote || '-'}</td>
                      <td>
                        {assignedIds.length ? (
                          <div className="d-flex flex-wrap">
                            {assignedIds.map((id) => (
                              <span key={id} className="badge badge-light mr-1 mb-1">
                                {id.slice(0, 8)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{toDisplayName(item?.assignedTo) || toStringId(item?.assignedTo) || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
