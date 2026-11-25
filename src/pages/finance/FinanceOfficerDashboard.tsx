import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveInvoice, LiveReview, LiveReconcile, LiveReports } from './LivePages';
import { api, money } from '../../utils/api';
import './FinanceOfficerDashboard.css';
import systemLogo from '../../assets/images/finagent_system_logo.jpg';

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  invoice: (
    <>
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  review: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4M8 11l2 2 4-5" />
    </>
  ),
  bank: <path d="m3 9 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 21h16" />,
  report: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  bell: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" />,
  upload: <path d="M12 16V3M7 8l5-5 5 5M4 14v7h16v-7" />,
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
    </>
  ),
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg aria-hidden="true" className="icon" height={size} viewBox="0 0 24 24" width={size}>
      {ICONS[name]}
    </svg>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'info';

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Action({
  children, icon, kind = 'secondary', onClick,
}: {
  children: React.ReactNode; icon?: string;
  kind?: 'primary' | 'secondary' | 'quiet'; onClick?: () => void;
}) {
  return (
    <button className={`action action-${kind}`} onClick={onClick} type="button">
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </button>
  );
}

const STATUS_INFO: Record<string, { label: string; tone: Tone }> = {
  approved: { label: 'Approved', tone: 'success' },
  pending_review: { label: 'Needs review', tone: 'warning' },
  stuck: { label: 'Stuck', tone: 'warning' },
  blocked: { label: 'Blocked', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'warning' },
  manual_queue: { label: 'Manual entry', tone: 'info' },
  extracted: { label: 'Extracted', tone: 'info' },
};

const statusInfo = (s: string) => STATUS_INFO[s] ?? { label: s, tone: 'neutral' as Tone };

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: 'grid' },
  { id: 'invoice', label: 'Process invoice', icon: 'invoice' },
  { id: 'review', label: 'Review queue', icon: 'review' },
  { id: 'reconcile', label: 'Reconciliation', icon: 'bank' },
  { id: 'reports', label: 'Reports', icon: 'report' },
];

type Counts = { review: number; stuck: number };

const getUserName = () => localStorage.getItem('finagent_name') || 'Finance Officer';
const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'FO';

function Sidebar({
  active, onChange, counts, userName,
}: {
  active: string; onChange: (id: string) => void; counts: Counts; userName: string;
}) {
  return (
    <aside className="sidebar">
      <a href="/" className="brand" style={{ textDecoration: 'none' }} title="Return to Landing Page">
        <img
          src={systemLogo}
          alt="FinAgent Logo"
          style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px' }}
        />
        <div>
          <strong className="brand-name"><span>Fin</span><em>Agent</em></strong>
          <small>Intelligent finance</small>
        </div>
      </a>

      <nav aria-label="Primary navigation">
        <p className="nav-label">Workspace</p>
        {NAV_ITEMS.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${active === n.id ? 'active' : ''}`}
            onClick={() => onChange(n.id)}
            type="button"
          >
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.id === 'review' && counts.review > 0 && <em>{counts.review}</em>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="avatar">{getInitials(userName)}</span>
        <div>
          <strong>{userName}</strong>
          <small>Finance officer</small>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  title, userName, notificationCount, onNotifications, onNavigate, onLogout,
}: {
  title: string; userName: string; notificationCount: number;
  onNotifications: () => void; onNavigate: (tab: string) => void; onLogout: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  async function loadInvoices() {
    try { setInvoices(await api('/invoices')); } catch { setInvoices([]); }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? invoices.filter((r) =>
          `${r.vendor_name ?? ''} ${r.invoice_number ?? ''} ${r.total_amount ?? ''}`.toLowerCase().includes(q))
      : invoices;
    return list.slice(0, 6);
  }, [searchQuery, invoices]);

  const handleSelect = (status: string) => {
    onNavigate(status === 'pending_review' || status === 'stuck' ? 'review' : 'dashboard');
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Finance workspace</span>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        <div className="search-wrapper" ref={containerRef}>
          <label className="search">
            <Icon name="search" />
            <input
              ref={searchInputRef}
              aria-label="Search invoices"
              placeholder="Search invoices, suppliers"
              value={searchQuery}
              onFocus={() => { setIsOpen(true); loadInvoices(); }}
              onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }}
            />
            <kbd onClick={() => searchInputRef.current?.focus()}>⌘ K</kbd>
          </label>

          {isOpen && (
            <div className="search-dropdown">
              <div className="search-dropdown-header">
                <span>{searchQuery ? `Matching invoices (${results.length})` : 'Latest invoices'}</span>
                <span style={{ fontSize: '9px', textTransform: 'none', color: 'var(--muted)' }}>ESC to close</span>
              </div>
              <div className="search-dropdown-list">
                {results.length > 0 ? (
                  results.map((item) => (
                    <button
                      key={item.id}
                      className="search-dropdown-item"
                      type="button"
                      onClick={() => handleSelect(item.processing_status)}
                    >
                      <div className="search-item-main">
                        <strong>{item.vendor_name ?? 'Unknown supplier'}</strong>
                        <small>{item.invoice_number ?? `Invoice #${item.id}`}</small>
                      </div>
                      <div className="search-item-meta">
                        <strong>{item.total_amount == null ? '-' : money(item.total_amount)}</strong>
                        <Badge tone={statusInfo(item.processing_status).tone}>
                          {statusInfo(item.processing_status).label}
                        </Badge>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="search-empty">No invoices found.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button aria-label="Open notifications" className="icon-action" onClick={onNotifications} type="button">
          <Icon name="bell" />
          {notificationCount > 0 && <span>{notificationCount}</span>}
        </button>

        <div className="finance-account-wrap" ref={profileRef}>
          <button
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            aria-label={`Account menu for ${userName}`}
            className="finance-account-button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            type="button"
          >
            <span className="avatar">{getInitials(userName)}</span>
            <span>
              <strong>{userName}</strong>
              <small>Finance Officer</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
          {profileMenuOpen && (
            <div className="finance-account-menu" role="menu">
              <button
                className="finance-account-logout"
                onClick={() => { setProfileMenuOpen(false); onLogout(); }}
                role="menuitem"
                type="button"
              >
                <Icon name="logout" size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function OverviewPage({ goTo, counts }: { goTo: (tab: string) => void; counts: Counts }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api('/invoices')
      .then((r: any[]) => setInvoices(r))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load invoices'))
      .finally(() => setLoading(false));
  }, []);

  const approved = invoices.filter((i) => i.processing_status === 'approved');
  const approvedTotal = approved.reduce((sum, i) => sum + (i.total_amount ?? 0), 0);
  const attention = counts.review + counts.stuck;
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="page page-enter">
      <section className="opening">
        <div>
          <p className="date">{today}</p>
          <p>
            {attention === 0
              ? 'Nothing needs your attention right now.'
              : `${attention} ${attention === 1 ? 'item needs' : 'items need'} your attention.`}
          </p>
        </div>
        <div className="opening-actions">
          <Action icon="upload" kind="primary" onClick={() => goTo('invoice')}>Upload invoice</Action>
          <Action icon="bank" onClick={() => goTo('reconcile')}>Reconcile</Action>
        </div>
      </section>

      {error && (
        <div role="alert" style={{
          margin: '0 0 14px', padding: '10px 14px', border: '1px solid #e5b4b4',
          background: '#fdf0f0', color: '#9b1c1c', borderRadius: 4, fontSize: 12.5
        }}>{error}</div>
      )}

      <section className="metrics" aria-label="Key metrics">
        <div className="metric">
          <span>Total invoices</span>
          <strong>{invoices.length}</strong>
          <p>All uploaded invoices</p>
        </div>
        <div className="metric">
          <span>Pending review</span>
          <strong>{counts.review}</strong>
          <p>Waiting for your decision</p>
        </div>
        <div className="metric">
          <span>Stuck</span>
          <strong>{counts.stuck}</strong>
          <p>An agent failed, retry needed</p>
        </div>
        <div className="metric">
          <span>Approved</span>
          <strong>{approved.length}</strong>
          <p>{money(approvedTotal)} in total</p>
        </div>
      </section>

      <section className="panel transactions">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Latest movement</span>
            <h3>Recent invoices</h3>
          </div>
          <button className="text-action" onClick={() => goTo('review')} type="button">
            Review queue <Icon name="arrow" size={15} />
          </button>
        </div>

        {loading ? <p>Loading...</p> : invoices.length === 0 ? (
          <p style={{ margin: 0 }}>No invoices yet. Upload one to get started.</p>
        ) : (
          <div className="table">
            <div className="table-row table-head">
              <span>Supplier</span>
              <span>Reference</span>
              <span>Due</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {invoices.slice(0, 5).map((inv) => {
              const st = statusInfo(inv.processing_status);
              return (
                <button
                  key={inv.id}
                  className="table-row"
                  onClick={() => goTo(inv.processing_status === 'pending_review' || inv.processing_status === 'stuck' ? 'review' : 'invoice')}
                  type="button"
                >
                  <strong>{inv.vendor_name ?? 'Unknown supplier'}</strong>
                  <span>{inv.invoice_number ?? `#${inv.id}`}</span>
                  <span>{inv.due_date ?? '-'}</span>
                  <span><Badge tone={st.tone}>{st.label}</Badge></span>
                  <strong>{inv.total_amount == null ? '-' : money(inv.total_amount)}</strong>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function FinanceOfficerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [counts, setCounts] = useState<Counts>({ review: 0, stuck: 0 });
  const userName = getUserName();

  useEffect(() => {
    async function loadCounts() {
      try {
        const [review, stuck] = await Promise.all([
          api('/review/flagged'),
          api('/invoices?status=stuck'),
        ]);
        setCounts({ review: review.length, stuck: stuck.length });
      } catch {
        setCounts({ review: 0, stuck: 0 });
      }
    }
    loadCounts();
  }, [activeTab]);

  const title = useMemo(
    () => NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Overview',
    [activeTab]
  );

  const handleConfirmLogout = () => {
    localStorage.removeItem('finagent_token');
    localStorage.removeItem('finagent_role');
    localStorage.removeItem('finagent_name');
    localStorage.removeItem('finagent_is_primary');
    navigate('/login');
  };

  const bellCount = counts.review + counts.stuck;

  return (
    <div className="app-shell">
      <Sidebar active={activeTab} onChange={setActiveTab} counts={counts} userName={userName} />
      <main className="main">
        <Topbar
          title={title}
          userName={userName}
          notificationCount={bellCount}
          onNotifications={() => setNotificationsOpen(!notificationsOpen)}
          onNavigate={setActiveTab}
          onLogout={() => setShowLogoutModal(true)}
        />

        {notificationsOpen && (
          <div className="notifications">
            <div className="panel-heading">
              <h3>Notifications</h3>
              {bellCount > 0 && <Badge tone="info">{bellCount} new</Badge>}
            </div>
            {bellCount === 0 ? (
              <p>You are all caught up.</p>
            ) : (
              <>
                {counts.review > 0 && (
                  <p>
                    <strong>{counts.review} {counts.review === 1 ? 'invoice' : 'invoices'} waiting for review</strong>
                    <br />
                    <button className="text-action" type="button"
                      onClick={() => { setActiveTab('review'); setNotificationsOpen(false); }}>
                      Open review queue
                    </button>
                  </p>
                )}
                {counts.stuck > 0 && (
                  <p>
                    <strong>{counts.stuck} stuck {counts.stuck === 1 ? 'invoice' : 'invoices'}</strong>
                    <br />
                    An agent failed. Press Retry in the review queue.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && <OverviewPage goTo={setActiveTab} counts={counts} />}
        {activeTab === 'invoice' && <LiveInvoice />}
        {activeTab === 'review' && <LiveReview />}
        {activeTab === 'reconcile' && <LiveReconcile />}
        {activeTab === 'reports' && <LiveReports />}
      </main>

      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <Badge tone="neutral">Sign Out</Badge>
                <h3>Confirm Logout</h3>
                <small style={{ color: 'var(--muted)' }}>Finance Officer: {userName}</small>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', lineHeight: '1.6' }}>
                Are you sure you want to log out of your FinAgent finance workspace? You will be returned to the account login page.
              </p>
            </div>
            <div className="modal-footer">
              <Action onClick={() => setShowLogoutModal(false)}>Cancel</Action>
              <button
                type="button"
                className="action action-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                onClick={handleConfirmLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}