export const ADMIN_ROLES = ['admin', 'super-admin'] as const;

export const isAdminRole = (role?: string) => ADMIN_ROLES.includes((role || '').toLowerCase() as (typeof ADMIN_ROLES)[number]);
