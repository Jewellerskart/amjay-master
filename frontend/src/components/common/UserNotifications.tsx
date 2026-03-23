import { NotificationApi } from '@api/api.index';
import { isAdminRole } from '@shared/utils/roles';

export type UserLike = {
  firstName?: string;
  role?: string;
  businessName?: string;
  email?: string;
};

export type UserNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: 'info' | 'warning' | 'success';
};

export const useUserNotifications = (user: UserLike | undefined) => {
  const isAdmin = isAdminRole(user?.role);
  const {
    data: adminNotificationRes,
    isFetching,
    refetch,
  } = NotificationApi.useGetAdminNotificationsQuery(undefined, {
    skip: !isAdmin,
  });

  const getNotificationHref = (item: any) => {
    const type = `${item?.type || ''}`.toLowerCase();
    const userEmail = `${item?.userEmail || ''}`.trim();

    if (type === 'kyc-incomplete' && userEmail) {
      return `/user/user-list/${encodeURIComponent(userEmail)}`;
    }
    if (type.startsWith('query-')) {
      return '/contact-admin';
    }
    return '/notifications';
  };

  const adminNotifications: UserNotification[] = Array.isArray(adminNotificationRes?.data?.notifications)
    ? adminNotificationRes.data.notifications.map((item: any, idx: number) => ({
        id: `admin-${idx}`,
        href: getNotificationHref(item),
        severity: item?.severity === 'high' ? 'warning' : 'info',
        title: item?.type || 'admin-notification',
        description: item?.message || '',
      }))
    : [];

  const notifications = [...adminNotifications];

  return {
    notifications,
    totalNotificationCount: notifications.length,
    isFetching,
    refetch,
  };
};
