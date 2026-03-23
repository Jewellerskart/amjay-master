import toast from 'react-hot-toast';
import { Header } from '@common/header';
import { useGetMyWalletQuery, useUpdateWalletMutation } from '@api/apiHooks/wallet';

export const WalletPage = () => {
  const { data, isFetching, refetch } = useGetMyWalletQuery();
  const [updateWallet, { isLoading }] = useUpdateWalletMutation();

  const wallet = (data?.data?.wallet || {}) as {
    userId?: string;
    walletBalance?: number;
    creditLimit?: number;
    usedCredit?: number;
  };

  const onRefresh = () => refetch();
  const onTopUp = async () => {
    try {
      await updateWallet({ userId: wallet?.userId as string, walletBalance: 1000 }).unwrap();
      toast.success('Added 1,000 to wallet');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update wallet');
    }
  };

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="card-title mb-0">Wallet Overview</h4>
            <div>
              <button className="btn btn-sm btn-outline-primary mr-2" onClick={onRefresh} disabled={isFetching}>
                {isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
              <button className="btn btn-sm btn-primary" onClick={onTopUp} disabled={isLoading}>
                Top-up ₹1,000
              </button>
            </div>
          </div>
          <div className="card-body">
            {wallet ? (
              <div className="row text-center">
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <small className="text-muted d-block mb-1">Wallet Balance</small>
                    <strong>₹{wallet.walletBalance?.toLocaleString('en-IN') || 0}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <small className="text-muted d-block mb-1">Credit Limit</small>
                    <strong>₹{wallet.creditLimit?.toLocaleString('en-IN') || 0}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <small className="text-muted d-block mb-1">Used Credit</small>
                    <strong>₹{wallet.usedCredit?.toLocaleString('en-IN') || 0}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted">Wallet data is not available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
