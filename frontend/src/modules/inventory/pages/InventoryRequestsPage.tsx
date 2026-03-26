import { useEffect } from 'react';
import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { InventoryRequestStatus, InventoryUsageChoice } from '../hooks';
import { useInventoryRequests } from '../hooks/useInventoryRequests';
import { useInventoryRequestActions } from '../hooks/useInventoryRequestActions';
import { RequestSummaryCards } from '../components/RequestSummaryCards';
import { InventoryRequestForm } from '../components/InventoryRequestForm';
import { StatusUpdatePanel } from '../components/StatusUpdatePanel';
import { AssignProductPanel } from '../components/AssignProductPanel';
import { RequestsTable } from '../components/RequestsTable';

const STATUS_OPTIONS: InventoryRequestStatus[] = ['OPEN', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED'];
const USAGE_OPTIONS: InventoryUsageChoice[] = ['PURCHASE', 'MEMO'];

export const InventoryRequestsPage = () => {
  const { data: user } = useAuthSellerLogin();
  const userRole = `${user?.role || ''}`.toLowerCase();
  const isJeweler = userRole === 'jeweler';
  const isEditorRole = ['admin', 'super-admin', 'distributor'].includes(userRole);
  const jewelerId = `${user?._id || ''}`.trim();

  const {
    requests,
    stats,
    quantityStats,
    total,
    page,
    limit,
    setPage,
    setLimit,
    statusFilter,
    setStatusFilter,
    isLoadingRequests,
    createInventoryRequest,
    isCreatingRequest,
    updateInventoryRequestStatus,
    isUpdatingStatus,
    assignProductToRequest,
    isAssigningProduct,
    availableProducts,
    loadAvailableProducts,
    isLoadingAvailable,
    refetchRequests,
  } = useInventoryRequests(isJeweler ? jewelerId : undefined);

  const {
    requestForm,
    statusControl,
    assignControl,
    statusIdOptions,
    setRequestForm,
    setStatusControl,
    handleAssignControlChange,
    handleRequestSubmit,
    handleStatusUpdate,
    handleAssignProduct,
  } = useInventoryRequestActions({
    requests,
    createInventoryRequest,
    updateInventoryRequestStatus,
    assignProductToRequest,
    loadAvailableProducts,
    refetchRequests,
  });

  useEffect(() => {
    if (isEditorRole) {
      loadAvailableProducts({ page: 1, limit: 15 });
    }
  }, [isEditorRole, loadAvailableProducts]);

  const selectedRequest = assignControl.requestId ? requests.find((req) => req._id === assignControl.requestId) : undefined;
  const assignRequestOptions = statusIdOptions.filter((option) => {
    const request = requests.find((row) => row._id === option.id);
    const required = Math.max(1, Number(request?.requiredProducts || 1));
    const assigned = Math.min(required, Math.max(0, Number(request?.assignedCount ?? request?.assignedProductIds?.length ?? 0)));
    const pending = Math.max(0, required - assigned);
    return pending > 0 && request?.status !== 'CANCELLED';
  });

  return (
    <>
      <Header />
      <div className="content-body inventory-requests-page">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-3">
            <div className="col-sm-12 p-md-0 d-flex justify-content-between align-items-center flex-wrap">
              <div className="welcome-text">
                <h4 className="mb-1">Inventory Requests</h4>
                <p className="text-muted mb-0">Use quantity progress to complete each style request accurately. For example, if request qty is 2, assign two separate products to reach fulfilled.</p>
              </div>
            </div>
          </div>

          <RequestSummaryCards stats={stats} quantityStats={quantityStats} />

          <div className="row">
            {isJeweler && (
              <div className="col-lg-6">
                <InventoryRequestForm
                  form={requestForm}
                  usageOptions={USAGE_OPTIONS}
                  isSubmitting={isCreatingRequest}
                  onChange={(key, value) => setRequestForm((prev) => ({ ...prev, [key]: value }))}
                  onSubmit={handleRequestSubmit}
                />
              </div>
            )}

            {isEditorRole && (
              <div className="col-lg-6">
                <StatusUpdatePanel
                  control={statusControl}
                  statusOptions={STATUS_OPTIONS}
                  requestOptions={statusIdOptions}
                  isUpdating={isUpdatingStatus}
                  onChange={(key, value) => setStatusControl((prev) => ({ ...prev, [key]: value }))}
                  onSubmit={handleStatusUpdate}
                />
              </div>
            )}
          </div>

          {isEditorRole && (
            <div className="row">
              <div className="col-lg-6">
                <AssignProductPanel
                  control={assignControl}
                  usageOptions={USAGE_OPTIONS}
                  requestOptions={assignRequestOptions}
                  productOptions={availableProducts}
                  selectedRequest={selectedRequest}
                  isAssigning={isAssigningProduct}
                  isLoadingProducts={isLoadingAvailable}
                  onChange={handleAssignControlChange}
                  onAssign={handleAssignProduct}
                  onRefreshProducts={() => loadAvailableProducts({ page: 1, limit: 10, styleCode: selectedRequest?.styleCode })}
                />
              </div>
            </div>
          )}

          <div className="row">
            <div className="col-12">
              <RequestsTable
                requests={requests}
                statusOptions={STATUS_OPTIONS}
                statusFilter={statusFilter}
                limit={limit}
                page={page}
                total={total}
                isLoading={isLoadingRequests}
                onStatusFilterChange={setStatusFilter}
                onLimitChange={setLimit}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InventoryRequestsPage;
