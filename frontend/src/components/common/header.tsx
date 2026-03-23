import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AuthApi } from '@api/api.index';
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

export const Header = ({ scriptsArr = [] }: HeaderProps) => {
  const { data: user } = useAuthSellerLogin();
  const location = useLocation();
  const isAdminUser = isAdminRole(user?.role);
  const role = `${user?.role || ''}`.toLowerCase();
  const isJeweler = role === 'jeweler';
  const isDistributor = role === 'distributor';
  const isAccountant = role === 'accountant';
  const isPurchase = role === 'purchase';
  const { notifications, totalNotificationCount } = useUserNotifications(user);
  const [logout] = AuthApi.useLogoutMutation();

  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [mobileOpenSection, setMobileOpenSection] = useState<MenuKey>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotificationHoverOpen, setIsNotificationHoverOpen] = useState(false);

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
                <img className="logo-abbr" src="https://www.manijewel.com/assets/images/logo.png" alt="Mani Jewel" />
                <div className="brand-title">
                  <h3 className="m-0">Jewel POS</h3>
                  <p className="m-0 brand-subtitle">Smart Retail Console</p>
                </div>
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
                    User Master
                    <i className={`fa ml-1 ${openMenu === 'user' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {openMenu === 'user' && (
                    <div className="header-dropdown-menu" onClick={(event) => event.stopPropagation()}>
                      <NavLink to={allUserAccountUrl} className="header-dropdown-item">
                        Users
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
                  Products
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
                        <NavLink to="/products/bulk-upload" className="header-dropdown-item">
                          Bulk Upload
                        </NavLink>
                        <NavLink to={rateChartsUrl} className="header-dropdown-item">
                          Rate Charts
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
                  Inventory
                </button>
                {openMenu === 'inventory' && (
                  <div className="header-dropdown-menu" onClick={(event) => event.stopPropagation()}>
                    <NavLink to="/inventory/list" className="header-dropdown-item">
                      Inventory
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
                  POS & Sales
                </button>
                {openMenu === 'sale' && (
                  <div className="header-dropdown-menu header-dropdown-menu-static">
                    <NavLink to={posSaleUrl} className="header-dropdown-item">
                      POS Sale
                    </NavLink>
                    {(isAdminUser || isAccountant) && (
                      <NavLink to="/invoices/approvals" className="header-dropdown-item">
                        Invoice Approvals
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
                  Support
                </button>
                {openMenu === 'contact' && (
                  <div className="header-dropdown-menu" onClick={(event) => event.stopPropagation()}>
                    <NavLink to={contactAdminUrl} className="header-dropdown-item">
                      Contact Admin
                    </NavLink>
                    {(isAdminUser || isPurchase) && (
                      <NavLink to="/tickets/purchase" className="header-dropdown-item">
                        Purchase Tickets
                      </NavLink>
                    )}
                    <NavLink to={ticketQueueUrl} className="header-dropdown-item">
                      Ticket Queue
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
                      User Master
                      <i className={`fa ml-1 ${mobileOpenSection === 'user' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                    </button>
                    {mobileOpenSection === 'user' && (
                      <div className="mobile-submenu">
                        <NavLink to={allUserAccountUrl} className="mobile-nav-link">
                          Users
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
                    Products
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
                          <NavLink to="/products/bulk-upload" className="mobile-nav-link">
                            Bulk Upload
                          </NavLink>
                          <NavLink to={rateChartsUrl} className="mobile-nav-link">
                            Rate Charts
                          </NavLink>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="mobile-master-block">
                  <button type="button" className="mobile-nav-link mobile-nav-link-toggle" onClick={() => toggleMobileSection('inventory')}>
                    Inventory
                    <i className={`fa ml-1 ${mobileOpenSection === 'inventory' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {mobileOpenSection === 'inventory' && (
                    <div className="mobile-submenu">
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
                    POS & Sales
                    <i className={`fa ml-1 ${mobileOpenSection === 'sale' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {mobileOpenSection === 'sale' && (
                    <div className="mobile-submenu">
                      <NavLink to={posSaleUrl} className="mobile-nav-link">
                        POS Sale
                      </NavLink>
                      {(isAdminUser || isAccountant) && (
                        <NavLink to="/invoices/approvals" className="mobile-nav-link">
                          Invoice Approvals
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
                    Support
                    <i className={`fa ml-1 ${mobileOpenSection === 'contact' ? 'fa-angle-up' : 'fa-angle-down'}`} />
                  </button>
                  {mobileOpenSection === 'contact' && (
                    <div className="mobile-submenu">
                      <NavLink to={contactAdminUrl} className="mobile-nav-link">
                        Contact Admin
                      </NavLink>
                      {(isAdminUser || isPurchase) && (
                        <NavLink to="/tickets/purchase" className="mobile-nav-link">
                          Purchase Tickets
                        </NavLink>
                      )}
                      <NavLink to={ticketQueueUrl} className="mobile-nav-link">
                        Ticket Queue
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
