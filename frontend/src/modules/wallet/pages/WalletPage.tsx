import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';

export const WalletPage = () => {
  const { data: user, isLoading } = useAuthSellerLogin();
  const walletBalance = Number((user as any)?.walletBalance || 0);
  const creditLimit = Number((user as any)?.creditLimit || 0);

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="card-title mb-0">Wallet Overview</h4>
            <span className="small text-muted">Credit and wallet values are managed by admin only.</span>
          </div>
          <div className="card-body">
            {!isLoading ? (
              <div className="row text-center">
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <small className="text-muted d-block mb-1">Wallet Balance</small>
                    <strong>Rs. {walletBalance.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <small className="text-muted d-block mb-1">Credit Limit</small>
                    <strong>Rs. {creditLimit.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <small className="text-muted d-block mb-1">Available Limit</small>
                    <strong>Rs. {(walletBalance + creditLimit).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted">Loading wallet data...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
