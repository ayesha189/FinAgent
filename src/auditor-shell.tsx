import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Icon, type IconName } from "./ui";
import "./pages/admin/AdminDashboard.css";
import "./auditor.css";
import systemLogo from "./assets/images/finagent_system_logo.jpg";

const auditorNav: { to: string; label: string; icon: IconName }[] = [
  { to: "/auditor/dashboard", label: "Dashboard", icon: "overview" },
  { to: "/auditor/audit-trail", label: "Audit Trail", icon: "monitor" },
  { to: "/auditor/decision-review", label: "Decision Review", icon: "eye" },
  { to: "/auditor/reports-forecast", label: "Reports & Forecast", icon: "report" },
  { to: "/auditor/tax-annexures", label: "Tax Annexures", icon: "tax" },
  { to: "/auditor/finbot", label: "FinBot", icon: "chat" },
];

const titles: Record<string, string> = {
  "/auditor/dashboard": "Auditor Dashboard",
  "/auditor/audit-trail": "Audit Trail",
  "/auditor/decision-review": "Decision Review",
  "/auditor/reports-forecast": "Reports & Forecast",
  "/auditor/tax-annexures": "Tax Annexures",
  "/auditor/finbot": "FinBot",
};

export function AuditorShell() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="admin-shell auditor-shell">
      <button aria-label="Close navigation" className={`drawer-scrim ${drawerOpen ? "visible" : ""}`} onClick={() => setDrawerOpen(false)} type="button" />
      <aside className={`sidebar ${drawerOpen ? "drawer-open" : ""}`}>
        <NavLink to="/" className="brand" style={{ textDecoration: 'none' }} title="Return to Landing Page">
          <img
            src={systemLogo}
            alt="FinAgent Logo"
            style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px' }}
          />
          <div><strong><span>Fin</span>Agent</strong><small>Intelligent finance</small></div>
        </NavLink>
        <div className="workspace"><span>NC</span><div><small>Workspace</small><strong>North & Coast Ltd.</strong></div></div>
        <nav aria-label="Auditor navigation">
          <div className="nav-group">
            <p>Audit & Assurance</p>
            {auditorNav.slice(0, 5).map((item) => (
              <NavLink className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} key={item.to} to={item.to}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </NavLink>
            ))}
          </div>
          <div className="nav-group">
            <p>Tools & Account</p>
            {auditorNav.slice(5).map((item) => (
              <NavLink className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} key={item.to} to={item.to}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="sidebar-profile"><span className="avatar">JL</span><div><strong>Jonas Lind</strong><small>Auditor</small></div></div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button aria-label="Open navigation" className="mobile-menu" onClick={() => setDrawerOpen(true)} type="button"><Icon name="menu" /></button>
          <div className="breadcrumb"><span>Audit & Assurance</span><strong>{titles[pathname] ?? "Auditor Console"}</strong></div>
          <div className="topbar-actions">
            <div className="profile-wrap" ref={profileRef}>
              <button className="profile-button" onClick={() => setProfileOpen(!profileOpen)} type="button">
                <span className="avatar">JL</span><span><strong>Jonas Lind</strong><small>Auditor</small></span><Icon name="chevron" size={15} />
              </button>
              {profileOpen && <div className="popover profile-menu auditor-account-menu">
                <NavLink className="auditor-logout-option" to="/login">
                  <Icon name="logout" size={16} />Sign Out
                </NavLink>
              </div>}
            </div>
          </div>
        </header>
        <main className="page-frame"><Outlet /></main>
      </div>
    </div>
  );
}
