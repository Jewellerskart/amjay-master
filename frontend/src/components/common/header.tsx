import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AuthApi, ContactAdminApi, InvoiceApi, ProductApi, TicketApi, inventoryApi } from '@api/index';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import {
  allUserAccountUrl,
  contactAdminUrl,
  commissionControlUrl,
  dashboardPageUrl,
  frontendDocsUrl,
  NotificationUrl,
  onBoardingPageUrl,
  ProductListUrl,
  profilePageUrl,
  signInPageUrl,
  posSaleUrl,
  invoicePageUrl,
  ticketQueueUrl,
  inventoryListUrl,
  inventoryPendingUrl,
  inventoryRequestsUrl,
  rateChartsUrl,
} from '@variable';
import { isAdminRole } from '@shared/utils/roles';
import { ScriptSrc } from './Scripts';
import { useUserNotifications } from './UserNotifications';

interface HeaderProps {
  scriptsArr?: string[];
}

type MenuKey = 'user' | 'product' | 'inventory' | 'sale' | 'contact' | null;

const UNRESOLVED_CONTACT_STATUSES = new Set(['new', 'in-progress', 'waiting-user']);

const readCollectionCount = (response: any): number => {
  const count = Number(response?.data?.count);
  if (Number.isFinite(count) && count >= 0) return count;
  return Array.isArray(response?.data?.data) ? response.data.data.length : 0;
};

const formatIndicatorCount = (count: number) => (count > 99 ? '99+' : `${count}`);

export const Header = ({ scriptsArr = [] }: HeaderProps) => {
  const { data: user } = useAuthSellerLogin();
  const location = useLocation();
  const isAdminUser = isAdminRole(user?.role);
  const role = `${user?.role || ''}`.toLowerCase();
  const isJeweler = role === 'jeweler';
  const isDistributor = role === 'distributor';
  const isAccountant = role === 'accountant';
  const isPurchase = role === 'purchase';
  const canManageRateCharts = isAdminUser || isDistributor;
  const canApproveInvoices = isAdminUser || isAccountant;
  const { notifications, totalNotificationCount } = useUserNotifications(user);
  const [logout] = AuthApi.useLogoutMutation();
  const [fetchUsers] = AuthApi.useGetUsersMutation();
  const [fetchInventory] = inventoryApi.useListInventoryMutation();
  const [fetchInvoices] = InvoiceApi.useListInvoicesMutation();
  const [fetchAllContactQueries] = ContactAdminApi.useGetAllContactQueriesMutation();
  const { data: missingDiamondRateData } = ProductApi.useListMissingDiamondRatesQuery(undefined, { skip: !canManageRateCharts });
  const { data: openTicketData } = TicketApi.useListTicketsQuery(
    { status: 'OPEN', page: 1, limit: 1 },
    { skip: !user?._id, refetchOnMountOrArgChange: true },
  );
  const { data: inProgressTicketData } = TicketApi.useListTicketsQuery(
    { status: 'IN_PROGRESS', page: 1, limit: 1 },
    { skip: !user?._id, refetchOnMountOrArgChange: true },
  );
  const { data: myContactQueriesData } = ContactAdminApi.useGetMyContactQueriesQuery(undefined, { skip: !user?._id || isAdminUser });

  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [mobileOpenSection, setMobileOpenSection] = useState<MenuKey>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotificationHoverOpen, setIsNotificationHoverOpen] = useState(false);
  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [pendingAssignmentCount, setPendingAssignmentCount] = useState(0);
  const [invoiceApprovalCount, setInvoiceApprovalCount] = useState(0);
  const [contactPendingCount, setContactPendingCount] = useState(0);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const notificationHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUserActive = location.pathname.startsWith('/user/user-list') || location.pathname === onBoardingPageUrl || location.pathname === frontendDocsUrl;

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      if (!target.closest('.header-center')) {
        setOpenMenu(null);
      }
      if (accountRef.current && !accountRef.current.contains(target as Node)) {
        setIsAccountOpen(false);
      }
      if (!target.closest('.mobile-nav-wrap') && !target.closest('.mobile-nav-toggle')) {
        setIsMobileNavOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 18);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (notificationHoverTimerRef.current) {
        clearTimeout(notificationHoverTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setIsAccountOpen(false);
    setIsMobileNavOpen(false);
    setMobileOpenSection(null);
  }, [location.pathname]);

  useEffect(() => {
    let isActive = true;

    const loadPendingKycCount = async () => {
      if (!isAdminUser) {
        if (isActive) setPendingKycCount(0);
        return;
      }

      try {
        const response: any = await fetchUsers({ page: 1, limit: 1 }).unwrap();
        const summaryValue = Number(response?.data?.summary?.pendingKyc);
        if (Number.isFinite(summaryValue) && summaryValue >= 0) {
          if (isActive) setPendingKycCount(summaryValue);
          return;
        }
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
        const fallbackCount = rows.filter((item: any) => !item?.kycVerified).length;
        if (isActive) setPendingKycCount(fallbackCount);
      } catch {
        if (isActive) setPendingKycCount(0);
      }
    };

    void loadPendingKycCount();

    return () => {
      isActive = false;
    };
  }, [fetchUsers, isAdminUser]);

  useEffect(() => {
    let isActive = true;

    const loadPendingAssignments = async () => {
      const userId = `${user?._id || ''}`.trim();
      if (!userId) {
        if (isActive) setPendingAssignmentCount(0);
        return;
      }

      try {
        const response: any = await fetchInventory({
          page: 1,
          limit: 1,
          holderRole: (role || undefined) as any,
          currentHolderUserId: userId,
          includeAssignedClones: true,
          includePending: true,
        }).unwrap();
        const nextCount = readCollectionCount(response);
        if (isActive) setPendingAssignmentCount(nextCount);
      } catch {
        if (isActive) setPendingAssignmentCount(0);
      }
    };

    void loadPendingAssignments();

    return () => {
      isActive = false;
    };
  }, [fetchInventory, role, user?._id]);

  useEffect(() => {
    let isActive = true;

    const loadInvoiceApprovals = async () => {
      if (!canApproveInvoices) {
        if (isActive) setInvoiceApprovalCount(0);
        return;
      }

      try {
        const [purchasePending, memoPending] = await Promise.all([
          fetchInvoices({ page: 1, limit: 1, status: 'PURCHASE_PENDING_PAYMENT' }).unwrap().catch(() => null),
          fetchInvoices({ page: 1, limit: 1, status: 'MEMO_PENDING_PAYMENT' }).unwrap().catch(() => null),
        ]);
        const nextCount = readCollectionCount(purchasePending) + readCollectionCount(memoPending);
        if (isActive) setInvoiceApprovalCount(nextCount);
      } catch {
        if (isActive) setInvoiceApprovalCount(0);
      }
    };

    void loadInvoiceApprovals();

    return () => {
      isActive = false;
    };
  }, [canApproveInvoices, fetchInvoices]);

  useEffect(() => {
    let isActive = true;

    const setCount = (value: number) => {
      if (isActive) setContactPendingCount(Math.max(0, value));
    };

    const loadPendingContacts = async () => {
      const userId = `${user?._id || ''}`.trim();
      if (!userId) {
        setCount(0);
        return;
      }

      if (!isAdminUser) {
        const rows = Array.isArray(myContactQueriesData?.data?.queries) ? myContactQueriesData.data.queries : [];
        const nextCount = rows.filter((query: any) => {
          const status = `${query?.status || ''}`.trim().toLowerCase();
          return status ? UNRESOLVED_CONTACT_STATUSES.has(status) : true;
        }).length;
        setCount(nextCount);
        return;
      }

      try {
        const responses = await Promise.all(
          Array.from(UNRESOLVED_CONTACT_STATUSES).map((status) =>
            fetchAllContactQueries({ status, page: 1, limit: 1 }).unwrap().catch(() => null),
          ),
        );
        const nextCount = responses.reduce((total, response) => total + readCollectionCount(response), 0);
        setCount(nextCount);
      } catch {
        setCount(0);
      }
    };

    void loadPendingContacts();

    return () => {
      isActive = false;
    };
  }, [fetchAllContactQueries, isAdminUser, myContactQueriesData, user?._id]);

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // no-op
    } finally {
      localStorage.clear();
      toast.success('Logged out successfully');
      window.location.href = signInPageUrl;
    }
  };

  const toggleMenu = (key: Exclude<MenuKey, null>) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  const toggleMobileSection = (key: Exclude<MenuKey, null>) => {
    setMobileOpenSection((prev) => (prev === key ? null : key));
  };

  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const previewNotifications = notifications.slice(0, 5);
  const missingDiamondCount = useMemo(() => {
    const list = missingDiamondRateData?.data?.data;
    return Array.isArray(list) ? list.length : 0;
  }, [missingDiamondRateData]);
  const openTicketCount = useMemo(() => readCollectionCount(openTicketData), [openTicketData]);
  const inProgressTicketCount = useMemo(() => readCollectionCount(inProgressTicketData), [inProgressTicketData]);
  const supportTicketCount = openTicketCount + inProgressTicketCount;
  const supportPendingCount = supportTicketCount + contactPendingCount;

  const renderMenuLabel = (label: string, count = 0, tone: 'is-alert' | 'is-warning' | 'is-neutral' = 'is-alert') => (
    <span className="header-item-inline">
      <span>{label}</span>
      {count > 0 && <span className={`header-indicator-badge ${tone}`}>{formatIndicatorCount(count)}</span>}
    </span>
  );

  const openNotificationHover = () => {
    if (notificationHoverTimerRef.current) {
      clearTimeout(notificationHoverTimerRef.current);
      notificationHoverTimerRef.current = null;
    }
    setIsNotificationHoverOpen(true);
  };

  const closeNotificationHover = () => {
    if (notificationHoverTimerRef.current) {
      clearTimeout(notificationHoverTimerRef.current);
    }
    notificationHoverTimerRef.current = setTimeout(() => {
      setIsNotificationHoverOpen(false);
    }, 180);
  };

  return (
    <>
      <ScriptSrc script={[...scriptsArr]} />
      <header className={`header ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="header-content">
          <div className={`header-shell ${isMobileNavOpen || isAccountOpen ? 'island-expanded' : ''}`}>
            <div className="header-left">
              <Link to={dashboardPageUrl} className="brand-logo">
                <img className="logo-abbr" src="/logo/amjay-logo-1.png" alt="AMJAY" />
                {/* <div className="brand-title">
                  <h3 className="m-0">AMJAY POS</h3>
                  <p className="m-0 brand-subtitle">Smart Retail Console</p>
                </div> */}
              </Link>
            </div>

            <div className="header-center" onMouseLeave={() => window.innerWidth > 991 && setOpenMenu(null)}>
              <NavLink to={dashboardPageUrl} className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}>
                Dashboard
              </NavLink>

              {isAdminUser && (
                <div className="header-dropdown">
                  <button
                    type="button"
                    className={`header-link dropdown-toggle-btn ${isUserActive || openMenu === 'user' ? 'active' : ''}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleMenu('user');
                    }}
                    onMouseEnter={() => window.innerWidth > 991 && setOpenMenu('user')}
                  >
                    {renderMenuLabel('User Master', pendingKycCount)}
                    <i className={`fa ml-1 ${openMenu === 'user' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {openMenu === 'user' && (
                    <div className="header-dropdown-menu" onClick={(event) => event.stopPropagation()}>
                      <NavLink to={allUserAccountUrl} className="header-dropdown-item">
                        {renderMenuLabel('Users', pendingKycCount)}
                      </NavLink>
                      <NavLink to={onBoardingPageUrl} className="header-dropdown-item">
                        New Onboarding
                      </NavLink>
                      <NavLink to={frontendDocsUrl} className="header-dropdown-item">
                        Documentation
                      </NavLink>
                    </div>
                  )}
                </div>
              )}

              {isAdminUser && (
                <NavLink to={commissionControlUrl} className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}>
                  Commission Control
                </NavLink>
              )}

              <div className="header-dropdown">
                <button
                  type="button"
                  className={`header-link dropdown-toggle-btn ${openMenu === 'product' ? 'active' : ''}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleMenu('product');
                  }}
                  onMouseEnter={() => window.innerWidth > 991 && setOpenMenu('product')}
                >
                  {renderMenuLabel('Products', missingDiamondCount, 'is-warning')}
                </button>
                {openMenu === 'product' && (
                  <div className="header-dropdown-menu" onClick={(event) => event.stopPropagation()}>
                    <NavLink to="/products/marketplace" className="header-dropdown-item">
                      Marketplace
                    </NavLink>
                    {(isAdminUser || isDistributor) && (
                      <>
                        <NavLink to={ProductListUrl} className="header-dropdown-item">
                          Product List
                        </NavLink>
                        <NavLink to={rateChartsUrl} className="header-dropdown-item">
                          {renderMenuLabel('Rate Charts', missingDiamondCount, 'is-warning')}
                        </NavLink>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="header-dropdown">
                <button
                  type="button"
                  className={`header-link dropdown-toggle-btn ${openMenu === 'inventory' ? 'active' : ''}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleMenu('inventory');
                  }}
                  onMouseEnter={() => window.innerWidth > 991 && setOpenMenu('inventory')}
                >
                  {renderMenuLabel('Inventory', pendingAssignmentCount)}
                </button>
                {openMenu === 'inventory' && (
                  <div className="header-dropdown-menu" onClick={(event) => event.stopPropagation()}>
                    <NavLink to={inventoryListUrl} className="header-dropdown-item">
                      My Inventory
                    </NavLink>
                    <NavLink to={inventoryPendingUrl} className="header-dropdown-item">
                      {renderMenuLabel('Pending Assignments', pendingAssignmentCount)}
                    </NavLink>
                    {(isAdminUser || isDistributor) && (
                      <NavLink to={inventoryRequestsUrl} className="header-dropdown-item">
                        Requests
                      </NavLink>
                    )}
                    <NavLink to="/inventory/my-requests" className="header-dropdown-item">
                      My Requests
                    </NavLink>
                  </div>
                )}
              </div>

              <div className="header-dropdown">
                <button
                  type="button"
                  className={`header-link dropdown-toggle-btn ${openMenu === 'sale' ? 'active' : ''}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleMenu('sale');
                  }}
                  onMouseEnter={() => window.innerWidth > 991 && setOpenMenu('sale')}
                >
                  {renderMenuLabel('POS & Sales', invoiceApprovalCount)}
                </button>
                {openMenu === 'sale' && (
                  <div className="header-dropdown-menu header-dropdown-menu-static">
                    <NavLink to={posSaleUrl} className="header-dropdown-item">
                      POS Sale
                    </NavLink>
                    {(isAdminUser || isAccountant) && (
                      <NavLink to="/invoices/approvals" className="header-dropdown-item">
                        {renderMenuLabel('Invoice Approvals', invoiceApprovalCount)}
                      </NavLink>
                    )}
                    {(isAdminUser || isDistributor || isJeweler) && (
                      <NavLink to={invoicePageUrl} className="header-dropdown-item">
                        My Invoices
                      </NavLink>
                    )}
                  </div>
                )}
              </div>

              <div className="header-dropdown">
                <button
                  type="button"
                  className={`header-link dropdown-toggle-btn ${openMenu === 'contact' ? 'active' : ''}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleMenu('contact');
                  }}
                  onMouseEnter={() => window.innerWidth > 991 && setOpenMenu('contact')}
                >
                  {renderMenuLabel('Support', supportPendingCount, 'is-neutral')}
                </button>
                {openMenu === 'contact' && (
                  <div className="header-dropdown-menu" onClick={(event) => event.stopPropagation()}>
                    <NavLink to={contactAdminUrl} className="header-dropdown-item">
                      {renderMenuLabel('Contact Admin', contactPendingCount, 'is-neutral')}
                    </NavLink>
                    {(isAdminUser || isPurchase) && (
                      <NavLink to="/tickets/purchase" className="header-dropdown-item">
                        {renderMenuLabel('Purchase Tickets', supportTicketCount)}
                      </NavLink>
                    )}
                    <NavLink to={ticketQueueUrl} className="header-dropdown-item">
                      {renderMenuLabel('Ticket Queue', supportTicketCount)}
                    </NavLink>
                  </div>
                )}
              </div>
            </div>

            <div className="header-right">
              <button
                type="button"
                className="mobile-nav-toggle"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsMobileNavOpen((prev) => !prev);
                }}
              >
                <i className={`fa ${isMobileNavOpen ? 'fa-times' : 'fa-bars'}`} />
              </button>

              <div style={{ position: 'relative' }} onMouseEnter={openNotificationHover} onMouseLeave={closeNotificationHover}>
                <Link className="nav-link notification-link" to={NotificationUrl}>
                  <i className="fa fa-bell" />
                  {totalNotificationCount > 0 && <span className="badge badge-danger ml-1">{totalNotificationCount}</span>}
                </Link>
                {isNotificationHoverOpen && (
                  <div
                    className="dropdown-menu dropdown-menu-right show"
                    style={{
                      minWidth: 320,
                      maxWidth: 380,
                      maxHeight: 360,
                      overflowY: 'auto',
                      right: 0,
                      left: 'auto',
                      top: '100%',
                      marginTop: 0,
                      display: 'block',
                    }}
                  >
                    <div className="px-3 py-2 border-bottom">
                      <strong>Notifications</strong>
                    </div>
                    {previewNotifications.length === 0 && <div className="px-3 py-2 text-muted">No notifications</div>}
                    {previewNotifications.map((item) => (
                      <Link key={item.id} to={item?.href || NotificationUrl} className="dropdown-item" style={{ whiteSpace: 'normal' }} onClick={() => setIsNotificationHoverOpen(false)}>
                        <strong className="d-block">{item.title}</strong>
                        <small className="text-muted">{item.description}</small>
                      </Link>
                    ))}
                    <div className="border-top">
                      <Link to={NotificationUrl} className="dropdown-item text-primary">
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="nav-item dropdown header-profile" ref={accountRef}>
                <button
                  className="nav-link account-trigger"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsAccountOpen((prev) => !prev);
                  }}
                >
                  <span className="user-avatar">{userInitials}</span>
                  <span className="account-name text-capitalize">{user?.firstName || 'Account'}</span>
                  <i className="fa fa-angle-down ml-1" />
                </button>
                {isAccountOpen && (
                  <div className="dropdown-menu dropdown-menu-right show" onClick={(event) => event.stopPropagation()}>
                    <Link to={profilePageUrl} className="dropdown-item">
                      <i className="icon-user" />
                      <span className="ml-2">Profile</span>
                    </Link>
                    <Link to={NotificationUrl} className="dropdown-item">
                      <i className="icon-bell" />
                      <span className="ml-2">Notifications</span>
                    </Link>
                    <button className="dropdown-item border-0 bg-transparent w-100 text-left" onClick={onLogout}>
                      <i className="icon-key" />
                      <span className="ml-2">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isMobileNavOpen && (
            <div className="mobile-nav-wrap" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-nav-links">
                <NavLink to={dashboardPageUrl} className="mobile-nav-link">
                  Dashboard
                </NavLink>
                {isAdminUser && (
                  <div className="mobile-master-block">
                    <button type="button" className="mobile-nav-link mobile-nav-link-toggle" onClick={() => toggleMobileSection('user')}>
                      {renderMenuLabel('User Master', pendingKycCount)}
                      <i className={`fa ml-1 ${mobileOpenSection === 'user' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                    </button>
                    {mobileOpenSection === 'user' && (
                      <div className="mobile-submenu">
                        <NavLink to={allUserAccountUrl} className="mobile-nav-link">
                          {renderMenuLabel('Users', pendingKycCount)}
                        </NavLink>
                        <NavLink to={onBoardingPageUrl} className="mobile-nav-link">
                          New Onboarding
                        </NavLink>
                        <NavLink to={frontendDocsUrl} className="mobile-nav-link">
                          Documentation
                        </NavLink>
                      </div>
                    )}
                  </div>
                )}

                <NavLink to={commissionControlUrl} className="mobile-nav-link">
                  Commission Control
                </NavLink>

                <div className="mobile-master-block">
                  <button type="button" className="mobile-nav-link mobile-nav-link-toggle" onClick={() => toggleMobileSection('product')}>
                    {renderMenuLabel('Products', missingDiamondCount, 'is-warning')}
                    <i className={`fa ml-1 ${mobileOpenSection === 'product' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {mobileOpenSection === 'product' && (
                    <div className="mobile-submenu">
                      <NavLink to="/products/marketplace" className="mobile-nav-link">
                        Marketplace
                      </NavLink>
                      {(isAdminUser || isDistributor) && (
                        <>
                          <NavLink to={ProductListUrl} className="mobile-nav-link">
                            Product List
                          </NavLink>
                          <NavLink to={rateChartsUrl} className="mobile-nav-link">
                            {renderMenuLabel('Rate Charts', missingDiamondCount, 'is-warning')}
                          </NavLink>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="mobile-master-block">
                  <button type="button" className="mobile-nav-link mobile-nav-link-toggle" onClick={() => toggleMobileSection('inventory')}>
                    {renderMenuLabel('Inventory', pendingAssignmentCount)}
                    <i className={`fa ml-1 ${mobileOpenSection === 'inventory' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {mobileOpenSection === 'inventory' && (
                    <div className="mobile-submenu">
                      <NavLink to={inventoryListUrl} className="mobile-nav-link">
                        My Inventory
                      </NavLink>
                      <NavLink to={inventoryPendingUrl} className="mobile-nav-link">
                        {renderMenuLabel('Pending Assignments', pendingAssignmentCount)}
                      </NavLink>
                      {(isAdminUser || isDistributor) && (
                        <NavLink to={inventoryRequestsUrl} className="mobile-nav-link">
                          Requests
                        </NavLink>
                      )}
                      <NavLink to="/inventory/my-requests" className="mobile-nav-link">
                        My Requests
                      </NavLink>
                    </div>
                  )}
                </div>

                <div className="mobile-master-block">
                  <button type="button" className="mobile-nav-link mobile-nav-link-toggle" onClick={() => toggleMobileSection('sale')}>
                    {renderMenuLabel('POS & Sales', invoiceApprovalCount)}
                    <i className={`fa ml-1 ${mobileOpenSection === 'sale' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {mobileOpenSection === 'sale' && (
                    <div className="mobile-submenu">
                      <NavLink to={posSaleUrl} className="mobile-nav-link">
                        POS Sale
                      </NavLink>
                      {(isAdminUser || isAccountant) && (
                        <NavLink to="/invoices/approvals" className="mobile-nav-link">
                          {renderMenuLabel('Invoice Approvals', invoiceApprovalCount)}
                        </NavLink>
                      )}
                      {(isAdminUser || isDistributor || isJeweler) && (
                        <NavLink to={invoicePageUrl} className="mobile-nav-link">
                          My Invoices
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>

                <div className="mobile-master-block">
                  <button type="button" className="mobile-nav-link mobile-nav-link-toggle" onClick={() => toggleMobileSection('contact')}>
                    {renderMenuLabel('Support', supportPendingCount, 'is-neutral')}
                    <i className={`fa ml-1 ${mobileOpenSection === 'contact' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {mobileOpenSection === 'contact' && (
                    <div className="mobile-submenu">
                      <NavLink to={contactAdminUrl} className="mobile-nav-link">
                        {renderMenuLabel('Contact Admin', contactPendingCount, 'is-neutral')}
                      </NavLink>
                      {(isAdminUser || isPurchase) && (
                        <NavLink to="/tickets/purchase" className="mobile-nav-link">
                          {renderMenuLabel('Purchase Tickets', supportTicketCount)}
                        </NavLink>
                      )}
                      <NavLink to={ticketQueueUrl} className="mobile-nav-link">
                        {renderMenuLabel('Ticket Queue', supportTicketCount)}
                      </NavLink>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
