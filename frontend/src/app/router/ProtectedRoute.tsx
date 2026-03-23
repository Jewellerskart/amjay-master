import { Navigate, Outlet } from 'react-router-dom';
import { signInPageUrl } from '@variable';
import { useAuthSellerLogin } from '@hooks/sellerAuth';

export const ProtectedRoute = () => {
  const { data: user, isLoading } = useAuthSellerLogin();

  if (isLoading) {
    return null;
  }

  if (!user?._id) {
    return <Navigate to={signInPageUrl} replace />;
  }

  return <Outlet />;
};
