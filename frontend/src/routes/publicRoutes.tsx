import type { ReactElement } from 'react';
import {
  allUserAccountUrl,
  contactAdminUrl,
  commissionControlUrl,
  frontendDocsUrl,
  NotificationUrl,
  onBoardingPageUrl,
  ProductListUrl,
  ProductDetailUrl,
  profilePageUrl,
  signInPageUrl,
  UserAccountUrl,
  walletPageUrl,
  ticketQueueUrl,
  invoicePageUrl,
  posSaleUrl,
  inventoryRequestsUrl,
  inventoryListUrl,
  inventoryPendingUrl,
  rateChartsUrl,
} from '@variable';
import { Suspense, lazy } from 'react';
import { PageMotion } from '@common/PageMotion';

const withPageMotion = (element: ReactElement) => <PageMotion>{element}</PageMotion>;

const lazyNamed = (importer: () => Promise<any>, name: string) => lazy(() => importer().then((mod) => ({ default: mod[name] })));

const LandingPage = lazyNamed(() => import('@modules/home/pages/LandingPage'), 'LandingPage');
const OnboardingPage = lazyNamed(() => import('@modules/users/pages/OnboardingPage'), 'OnboardingPage');
const LoginPage = lazyNamed(() => import('@modules/auth/pages/LoginPage'), 'LoginPage');
const DashboardPage = lazyNamed(() => import('@modules/home/pages/DashboardPage'), 'Home');
const UserListPage = lazyNamed(() => import('@modules/users/pages/UserListPage'), 'UserListPage');
const DocumentationPage = lazyNamed(() => import('@modules/users/pages/DocumentationPage'), 'DocumentationPage');
const EditUserPage = lazyNamed(() => import('@modules/users/pages/EditUserPage'), 'EditUserPage');
const ProfilePage = lazyNamed(() => import('@modules/users/pages/ProfilePage'), 'ProfilePage');
const NotificationPage = lazyNamed(() => import('@modules/users/pages/NotificationsPage'), 'NotificationPage');
const ContactAdminPage = lazyNamed(() => import('@modules/tickets/pages/ContactAdminPage'), 'ContactAdminPage');
const CommissionControlPage = lazyNamed(() => import('@modules/reports/pages/CommissionControlPage'), 'CommissionControlPage');
const ProductCatalogPage = lazyNamed(() => import('@modules/products/pages/ProductListPage'), 'ProductCatalogPage');
const ProductMarketplacePage = lazyNamed(() => import('@modules/products/pages/ProductMarketplacePage'), 'ProductMarketplacePage');
const ProductBulkUploadPage = lazyNamed(() => import('@modules/products/pages/ProductBulkUploadPage'), 'ProductBulkUploadPage');
const ProductDetailPage = lazyNamed(() => import('@modules/products/pages/ProductDetailPage'), 'ProductDetailPage');
const WalletPage = lazyNamed(() => import('@modules/wallet/pages/WalletPage'), 'WalletPage');
const InvoicePage = lazyNamed(() => import('@modules/invoices/pages/InvoicePage'), 'InvoicePage');
const InvoiceApprovalPage = lazyNamed(() => import('@modules/invoices/pages/InvoiceApprovalPage'), 'InvoiceApprovalPage');
const TicketQueuePage = lazyNamed(() => import('@modules/tickets/pages/TicketQueuePage'), 'TicketQueuePage');
const PurchaseQueuePage = lazyNamed(() => import('@modules/tickets/pages/PurchaseQueuePage'), 'PurchaseQueuePage');
const SalePage = lazyNamed(() => import('@modules/pos/pages/SalePage'), 'SalePage');
const InventoryRequestsPage = lazyNamed(() => import('@modules/inventory/pages/InventoryRequestsPage'), 'InventoryRequestsPage');
const MyRequestsPage = lazyNamed(() => import('@modules/inventory/pages/MyRequestsPage'), 'MyRequestsPage');
const InventoryListPage = lazyNamed(() => import('@modules/inventory/pages/InventoryListPage'), 'InventoryListPage');
const PendingAssignmentsPage = lazyNamed(() => import('@modules/inventory/pages/InventoryListPage'), 'PendingAssignmentsPage');
const RateChartsPage = lazyNamed(() => import('@modules/products/pages/RateChartsPage'), 'RateChartsPage');
const PageNotFound = lazyNamed(() => import('@common/error/404'), 'PageNotFound');

const suspense = (el: ReactElement) => withPageMotion(<Suspense fallback={<div className="py-5 text-center">Loading...</div>}>{el}</Suspense>);

export const publicRoutes = [
  { path: '/', element: suspense(<LandingPage />) },
  { path: onBoardingPageUrl, element: suspense(<OnboardingPage />) },
  { path: signInPageUrl, element: suspense(<LoginPage />) },
  { path: '*', element: suspense(<PageNotFound />) },
];

export const privateRoutes = [
  { path: '/dashboard', element: suspense(<DashboardPage />) },
  { path: allUserAccountUrl, element: suspense(<UserListPage />) },
  { path: frontendDocsUrl, element: suspense(<DocumentationPage />) },
  { path: UserAccountUrl, element: suspense(<EditUserPage />) },
  { path: profilePageUrl, element: suspense(<ProfilePage />) },
  { path: NotificationUrl, element: suspense(<NotificationPage />) },
  { path: contactAdminUrl, element: suspense(<ContactAdminPage />) },
  { path: ProductListUrl, element: suspense(<ProductCatalogPage />) },
  { path: ProductDetailUrl, element: suspense(<ProductDetailPage />) },
  { path: '/products/marketplace', element: suspense(<ProductMarketplacePage />) },
  { path: '/products/bulk-upload', element: suspense(<ProductBulkUploadPage />) },
  { path: commissionControlUrl, element: suspense(<CommissionControlPage />) },
  { path: inventoryRequestsUrl, element: suspense(<InventoryRequestsPage />) },
  { path: inventoryListUrl, element: suspense(<InventoryListPage />) },
  { path: inventoryPendingUrl, element: suspense(<PendingAssignmentsPage />) },
  { path: '/inventory/my-requests', element: suspense(<MyRequestsPage />) },
  { path: rateChartsUrl, element: suspense(<RateChartsPage />) },
  { path: walletPageUrl, element: suspense(<WalletPage />) },
  { path: invoicePageUrl, element: suspense(<InvoicePage />) },
  { path: '/invoices/approvals', element: suspense(<InvoiceApprovalPage />) },
  { path: ticketQueueUrl, element: suspense(<TicketQueuePage />) },
  { path: '/tickets/purchase', element: suspense(<PurchaseQueuePage />) },
  { path: posSaleUrl, element: suspense(<SalePage />) },
];
