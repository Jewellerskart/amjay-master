import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { dashboardPageUrl, signInPageUrl } from '@variable';
import { AuthApi } from '@api/index';
import { isAdminRole } from '@shared/utils/roles';
import type { TSellerLoginAndSignUpData } from '../../@types/api/seller';

type AuthenticatedUser = TSellerLoginAndSignUpData & {
  _id?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
};

interface UseAuthSellerLoginResult {
  data?: AuthenticatedUser;
  isLoading: boolean;
  isAdmin: boolean;
}

export const useAuthSellerLogin = (): UseAuthSellerLoginResult => {
  const { data, isLoading } = AuthApi.useGetLoggedInUserQuery();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    const isAuthenticated = data?.status_code === 200 && data?.data?.user;
    if (!isAuthenticated) {
      navigate(signInPageUrl);
    }
  }, [data?.data?.user, data?.status_code, isLoading, navigate]);

  const user = data?.data?.user as AuthenticatedUser | undefined;

  return {
    data: user,
    isLoading,
    isAdmin: isAdminRole(user?.role),
  };
};

export const useAuthAdminLogin = (): UseAuthSellerLoginResult => {
  const navigate = useNavigate();
  const auth = useAuthSellerLogin();

  useEffect(() => {
    if (!auth.data || auth.isLoading) return;

    if (!isAdminRole(auth.data.role)) {
      navigate(dashboardPageUrl);
      toast.error('Your account is not authorized.');
    }
  }, [auth.data, auth.isAdmin, auth.isLoading, navigate]);

  return auth;
};

