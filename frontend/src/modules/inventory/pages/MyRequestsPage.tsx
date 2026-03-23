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

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid py-3">
        <h4 className="mb-3">My Product Requests</h4>
        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-sm mb-0">
            <thead className="table-light">
              <tr>
                <th>Request ID</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Preferred Note</th>
                <th>Assigned Product</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>Loading...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>No requests found</td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item._id}>
                    <td>{item._id}</td>
                    <td>{item.status}</td>
                    <td>{item.usageChoice}</td>
                    <td>{item.preferredUsageNote || '-'}</td>
                    <td>{item.assignedProductId || '-'}</td>
                    <td>{item.assignedTo || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
