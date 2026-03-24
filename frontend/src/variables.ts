import {
  BACKEND_API_URL,
  FRONTEND_URL,
  MAIL_LINK,
  PHONE_LINK,
  WHATSAPP_LINK,
  getAwsBrandUrl,
} from '@shared/config/environment';
import {
  ALL_USER_ACCOUNT_URL,
  COMMISSION_CONTROL_URL,
  CONTACT_ADMIN_URL,
  DASHBOARD_PAGE_URL,
  FRONTEND_DOCS_URL,
  INVOICE_PAGE_URL,
  INVENTORY_LIST_URL,
  INVENTORY_PENDING_URL,
  INVENTORY_REQUESTS_URL,
  NOTIFICATION_URL,
  ONBOARDING_PAGE_URL,
  POS_SALE_PAGE_URL,
  PRODUCT_DETAIL_URL,
  PRODUCT_LIST_URL,
  PROFILE_PAGE_URL,
  RATE_CHARTS_URL,
  SIGN_IN_PAGE_URL,
  TICKET_QUEUE_URL,
  USER_ACCOUNT_URL,
  WALLET_PAGE_URL,
} from '@shared/constants/routes';
import { MONTH_NAMES } from '@shared/constants/business';

export { BACKEND_API_URL, FRONTEND_URL };

export const allUserAccountUrl = ALL_USER_ACCOUNT_URL;
export const contactAdminUrl = CONTACT_ADMIN_URL;
export const commissionControlUrl = COMMISSION_CONTROL_URL;
export const dashboardPageUrl = DASHBOARD_PAGE_URL;
export const frontendDocsUrl = FRONTEND_DOCS_URL;
export const NotificationUrl = NOTIFICATION_URL;
export const onBoardingPageUrl = ONBOARDING_PAGE_URL;
export const ProductDetailUrl = PRODUCT_DETAIL_URL;
export const ProductListUrl = PRODUCT_LIST_URL;
export const profilePageUrl = PROFILE_PAGE_URL;
export const signInPageUrl = SIGN_IN_PAGE_URL;
export const ticketQueueUrl = TICKET_QUEUE_URL;
export const UserAccountUrl = USER_ACCOUNT_URL;
export const walletPageUrl = WALLET_PAGE_URL;
export const invoicePageUrl = INVOICE_PAGE_URL;
export const posSaleUrl = POS_SALE_PAGE_URL;
export const inventoryRequestsUrl = INVENTORY_REQUESTS_URL;
export const inventoryListUrl = INVENTORY_LIST_URL;
export const inventoryPendingUrl = INVENTORY_PENDING_URL;
export const rateChartsUrl = RATE_CHARTS_URL;

export const whatsappLink = WHATSAPP_LINK;
export const MailLink = MAIL_LINK;
export const PhoneLink = PHONE_LINK;

export const AwsBrandUrl = getAwsBrandUrl;
export const monthNames = [...MONTH_NAMES];
