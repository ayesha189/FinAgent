// src/pages/admin/AdminShell.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AdminIcon, AdminIconName } from './AdminIcons';
import systemLogo from '../../assets/images/finagent_system_logo.jpg';

interface NavItem {
  to: string;
  label: string;
  icon: AdminIconName;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Administration',
    items: [
      { to: '/admin/overview', label: 'Admin Overview', icon: 'overview' },
      { to: '/admin/users', label: 'User Management', icon: 'users' },
      { to: '/admin/vendors', label: 'Vendor & Blacklist', icon: 'shield' },
    ],
  },
  {
    label: 'System Configuration',
    items: [
      { to: '/admin/policies-ai', label: 'Thresholds & Policies', icon: 'policy' },
      { to: '/admin/tax-kb', label: 'Tax Knowledge Base', icon: 'tax' },
      { to: '/admin/monitoring-audit', label: 'Monitoring & Audit', icon: 'monitor' },
      { to: '/admin/deadlines', label: 'Statutory Deadlines', icon: 'calendar' },
    ],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  '/admin/overview': 'Admin Overview',
  '/admin/users': 'User Management & Permissions',
  '/admin/vendors': 'Vendor & Blacklist Management',
  '/admin/policies-ai': 'Thresholds & AI Policies',
  '/admin/tax-kb': 'Tax Knowledge Base (FBR & PRA)',
  '/admin/monitoring-audit': 'Monitoring, Stuck Tasks & Audit Trail',
  '/admin/deadlines': 'Statutory Filing Deadlines & Alerts',
  '/admin/requests': 'Pending Registration Approvals',
};

export interface AdminShellProps {
  children?: React.ReactNode;
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  children,
  activePath: propActivePath,
  onNavigate: propOnNavigate,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = propActivePath || location.pathname;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close menus & scroll to top on path change
  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPath]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNavClick = (to: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (propOnNavigate) {
      propOnNavigate(to);
    } else {
      navigate(to);
    }
    setDrawerOpen(false);
  };

  const currentTitle = ROUTE_TITLES[currentPath] ?? 'Admin Console';

  return (
    <div className="admin-shell">
      {/* Mobile drawer scrim */}
      <button
        aria-label="Close navigation"
        className={`drawer-scrim ${drawerOpen ? 'visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
        type="button"
      />

      {/* Persistent Sidebar */}
      <aside className={`sidebar ${drawerOpen ? 'drawer-open' : ''}`}>
        {/* Brand */}
        <a href="/" className="brand" style={{ textDecoration: 'none' }} title="Return to Landing Page">
          <img
            src={systemLogo}
            alt="FinAgent Logo"
            style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px' }}
          />
          <div>
            <strong>
              <span>Fin</span>Agent
            </strong>
            <small>Pakistan SME Finance AI</small>
          </div>
        </a>

        {/* Workspace */}
        <div className="workspace">
          <span>FA</span>
          <div>
            <small>Enterprise SME</small>
            <strong>Punjab (PRA) Scope</strong>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav aria-label="Administrator navigation">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const isActive = currentPath === item.to;
                return (
                  <a
                    key={item.to}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    href={item.to}
                    onClick={(e) => handleNavClick(item.to, e)}
                  >
                    <AdminIcon name={item.icon} />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Administrator Profile */}
        <div className="sidebar-profile">
          <span className="avatar">SA</span>
          <div>
            <strong>System Administrator</strong>
            <small>admin@finagent.pk</small>
          </div>
        </div>
      </aside>

      {/* Main Application Area */}
      <div className="app-main">
        {/* Sticky Topbar */}
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="mobile-menu"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <AdminIcon name="menu" />
          </button>

          <div className="breadcrumb">
            <span>Administration</span>
            <strong>{currentTitle}</strong>
          </div>

          <div className="topbar-actions">
            {/* Notification Popover */}

            {/* Notification Popover */}
            <div className="popover-wrap" ref={notificationsRef}>
              <button
                aria-label="Notifications"
                className="icon-button"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                type="button"
              >
                <AdminIcon name="bell" />
                <em>3</em>
              </button>

              {notificationsOpen && (
                <div className="popover notification-popover">
                  <strong>Administrator Alerts (FR-DN-04)</strong>
                  <p>
                    <b style={{ color: 'var(--red)' }}>1 stuck task</b> detected in Orchestrator queue (INV-PK-891).
                  </p>
                  <p>
                    <b>2 registration requests</b> awaiting administrator approval.
                  </p>
                  <p>
                    <b>FBR Sec 165 Withholding Statement</b> is due today.
                  </p>
                </div>
              )}
            </div>

            {/* Administrator Profile Menu */}
            <div className="profile-wrap" ref={profileRef}>
              <button
                className="profile-button"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                type="button"
              >
                <span className="avatar">SA</span>
                <span>
                  <strong>System Administrator</strong>
                  <small>admin@finagent.pk</small>
                </span>
                <AdminIcon name="chevron" size={15} />
              </button>

              {profileOpen && (
                <div className="popover profile-menu">
                  <button onClick={() => navigate('/admin/users')} type="button">
                    <AdminIcon name="users" size={15} />
                    <span>Manage User Accounts</span>
                  </button>
                  <button onClick={() => navigate('/admin/policies-ai')} type="button">
                    <AdminIcon name="policy" size={15} />
                    <span>System Settings & Thresholds</span>
                  </button>
                  <button onClick={() => navigate('/login')} type="button">
                    <AdminIcon name="logout" size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-frame">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
