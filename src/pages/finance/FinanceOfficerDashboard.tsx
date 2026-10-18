import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LiveInvoice, LiveReview, LiveReconcile, LiveReports } from './LivePages';
import { useNavigate } from 'react-router-dom';
import './FinanceOfficerDashboard.css';
import systemLogo from '../../assets/images/finagent_system_logo.jpg';
import {
  parseBankStatementCSV,
  runFourPassReconciliation,
  generateSampleStatementCSV,
  StatementValidation,
} from '../../utils/reconciliationParser';

// SVG Icons matching original site exactly
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
  bank: (
    <path d="m3 9 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 21h16" />
  ),
  report: (
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21c0-4 3-7 7-7s7 3 7 7M16 4c3 0 5 2 5 5 0 2-1 3-3 4M18 15c3 1 4 3 4 6" />
    </>
  ),
  human: (
    <>
      <circle cx="10" cy="7" r="4" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  bell: (
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" />
  ),
  upload: (
    <path d="M12 16V3M7 8l5-5 5 5M4 14v7h16v-7" />
  ),
  download: (
    <path d="M12 3v13M7 11l5 5 5-5M4 21h16" />
  ),
  arrow: (
    <path d="M5 12h14M14 7l5 5-5 5" />
  ),
  check: (
    <path d="m4 12 5 5L20 6" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
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
    <svg
      aria-hidden="true"
      className="icon"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {ICONS[name]}
    </svg>
  );
}

const REVIEW_QUEUE_ITEMS = [
  {
    supplier: 'Northstar Office Co.',
    ref: 'INV-1048',
    due: 'Due today',
    amount: 'Rs. 2,840.00',
    riskScore: '72/100',
    riskNumber: '72',
    title: 'Supplier bank details changed',
    headline: 'Bank details changed 2 days before payment',
    evidence: 'The destination account was updated 2 days before payment. No confirmation from the supplier’s known contact was found.',
    clauseTitle: 'Policy clause AP-4.3',
    clauseText: 'Changes to supplier payment instructions within 5 business days of settlement require independent confirmation.',
  },
  {
    supplier: 'Meridian Freight Ltd.',
    ref: 'INV-1045',
    due: '18 Jun',
    amount: 'Rs. 7,120.50',
    riskScore: '34/100',
    riskNumber: '34',
    title: 'Weight variance on consignment #882',
    headline: 'Bill of lading variance detected',
    evidence: 'Weight differential between manifest and freight receipt exceeds 4% tolerance limit.',
    clauseTitle: 'Policy clause LG-2.1',
    clauseText: 'Freight variances exceeding 3.5% require operational sign-off before automatic disbursement.',
  },
  {
    supplier: 'Beacon Software',
    ref: 'INV-1044',
    due: '20 Jun',
    amount: 'Rs. 960.00',
    riskScore: '45/100',
    riskNumber: '45',
    title: 'VAT rate discrepancy on recurring SaaS',
    headline: 'Calculated tax differs from invoice total',
    evidence: 'VAT amount differs from standard 20% calculation by Rs. 38.40 due to regional digital service exemption.',
    clauseTitle: 'Policy clause TX-1.2',
    clauseText: 'Exemption certificates must be validated against HMRC VAT verification index.',
  },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: 'grid' },
  { id: 'invoice', label: 'Process invoice', icon: 'invoice' },
  { id: 'review', label: 'Review queue', icon: 'review', count: REVIEW_QUEUE_ITEMS.length },
  { id: 'reconcile', label: 'Reconciliation', icon: 'bank' },
  { id: 'reports', label: 'Reports', icon: 'report' },
];

const RECENT_INVOICES = [
  { supplier: 'Northstar Office Co.', ref: 'INV-1048', amount: 'Rs. 2,840.00', due: 'Today', status: 'Needs review', tone: 'warning' as const },
  { supplier: 'Meridian Freight Ltd.', ref: 'INV-1045', amount: 'Rs. 7,120.50', due: '18 Jun', status: 'Matched', tone: 'success' as const },
  { supplier: 'Beacon Software', ref: 'INV-1044', amount: 'Rs. 960.00', due: '20 Jun', status: 'Tax check', tone: 'info' as const },
  { supplier: 'Rowan Field Services', ref: 'INV-1041', amount: 'Rs. 4,230.00', due: '22 Jun', status: 'Approved', tone: 'success' as const },
];

// Searchable records across FinAgent
const ALL_SEARCHABLE_RECORDS = [
  { id: '1', title: 'Northstar Office Co.', subtitle: 'INV-1048 · Needs review (Bank details changed)', amount: 'Rs. 2,840.00', tab: 'review', tone: 'warning' as const },
  { id: '2', title: 'Meridian Freight Ltd.', subtitle: 'INV-1045 · Matched & Scheduled', amount: 'Rs. 7,120.50', tab: 'review', tone: 'success' as const },
  { id: '3', title: 'Beacon Software', subtitle: 'INV-1044 · Tax check (Rs. 38.40 VAT discrepancy)', amount: 'Rs. 960.00', tab: 'review', tone: 'info' as const },
  { id: '4', title: 'Rowan Field Services', subtitle: 'INV-1041 · Approved for payment', amount: 'Rs. 4,230.00', tab: 'dashboard', tone: 'success' as const },
  { id: '5', title: 'Aster Works Ltd.', subtitle: 'INV-1052 · Live validation voucher VCH-2606-184', amount: 'Rs. 1,482.00', tab: 'invoice', tone: 'success' as const },
  { id: '6', title: 'Barclays Operating Feed', subtitle: '30-94-12 · Rs. 78,420.18 Statement Balance', amount: 'Rs. 78,420.18', tab: 'reconcile', tone: 'neutral' as const },
  { id: '7', title: 'Stripe Payout Batch', subtitle: 'STRIPE-9941 · Reconciled transaction', amount: 'Rs. 4,820.20', tab: 'reconcile', tone: 'success' as const },
  { id: '8', title: 'Equipment Rental DD', subtitle: 'Direct Debit discrepancy requiring manual match', amount: 'Rs. 468.00', tab: 'reconcile', tone: 'warning' as const },
  { id: '9', title: 'Profit & Loss Statement', subtitle: 'H1 2026 Management performance report', amount: 'Rs. 178,300 Net', tab: 'reports', tone: 'neutral' as const },
];

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'info' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Action({
  children,
  icon,
  kind = 'secondary',
  onClick,
}: {
  children: React.ReactNode;
  icon?: string;
  kind?: 'primary' | 'secondary' | 'quiet';
  onClick?: () => void;
}) {
  return (
    <button className={`action action-${kind}`} onClick={onClick} type="button">
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </button>
  );
}

// ----------------------------------------------------
// SIDEBAR
// ----------------------------------------------------
function Sidebar({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <aside className="sidebar">
      <a
        href="/"
        className="brand"
        style={{ textDecoration: 'none' }}
        title="Return to Landing Page"
      >
        <img
          src={systemLogo}
          alt="FinAgent Logo"
          style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px' }}
        />
        <div>
          <strong className="brand-name">
            <span>Fin</span>
            <em>Agent</em>
          </strong>
          <small>Intelligent finance</small>
        </div>
      </a>

      <div className="workspace">
        <span className="workspace-avatar">NC</span>
        <div>
          <small>Workspace</small>
          <strong>North &amp; Coast Ltd.</strong>
        </div>
      </div>

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
            {'count' in n && <em>{n.count}</em>}
          </button>
        ))}

      </nav>

      <div className="period">
        <small>Current period</small>
        <strong>June 2026</strong>
        <div className="period-track">
          <span style={{ width: '70%' }}></span>
        </div>
        <p>9 days until close</p>
      </div>

      <div
        className="sidebar-footer"
      >
        <span className="avatar">AM</span>
        <div>
          <strong>Amara Mensah</strong>
          <small>Finance officer</small>
        </div>
      </div>
    </aside>
  );
}

// ----------------------------------------------------
// TOPBAR (With Functional Search Bar)
// ----------------------------------------------------
function Topbar({
  title,
  onNotifications,
  onNavigate,
  onLogout,
}: {
  title: string;
  onNotifications: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcut ⌘ K / Ctrl + K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return ALL_SEARCHABLE_RECORDS.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return ALL_SEARCHABLE_RECORDS.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.amount.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (tab: string) => {
    onNavigate(tab);
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
              aria-label="Search records"
              placeholder="Search invoices, suppliers, records"
              value={searchQuery}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
            />
            <kbd onClick={() => searchInputRef.current?.focus()}>⌘ K</kbd>
          </label>

          {isOpen && (
            <div className="search-dropdown">
              <div className="search-dropdown-header">
                <span>{searchQuery ? `Matching Records (${results.length})` : 'Recent Invoices & Records'}</span>
                <span style={{ fontSize: '9px', textTransform: 'none', color: 'var(--muted)' }}>ESC to close</span>
              </div>
              <div className="search-dropdown-list">
                {results.length > 0 ? (
                  results.map((item) => (
                    <button
                      key={item.id}
                      className="search-dropdown-item"
                      type="button"
                      onClick={() => handleSelect(item.tab)}
                    >
                      <div className="search-item-main">
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </div>
                      <div className="search-item-meta">
                        <strong>{item.amount}</strong>
                        <Badge tone={item.tone}>{item.tab.toUpperCase()}</Badge>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="search-empty">
                    No financial records matching &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          aria-label="Open notifications"
          className="icon-action"
          onClick={onNotifications}
          type="button"
        >
          <Icon name="bell" />
          <span>3</span>
        </button>
        <div className="finance-account-wrap" ref={profileRef}>
          <button
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            aria-label="Account menu for Amara Mensah"
            className="finance-account-button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            type="button"
          >
            <span className="avatar">AM</span>
            <span>
              <strong>Amara Mensah</strong>
              <small>Finance Officer</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
          {profileMenuOpen && (
            <div className="finance-account-menu" role="menu">
              <button
                className="finance-account-logout"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onLogout();
                }}
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

// ----------------------------------------------------
// OVERVIEW PAGE (Dashboard)
// ----------------------------------------------------
function OverviewPage({ goTo }: { goTo: (tab: string) => void }) {
  return (
    <div className="page page-enter">
      <section className="opening">
        <div>
          <p className="date">Tuesday, 16 June</p>
          <p>Three items need your attention before today’s payment run.</p>
        </div>
        <div className="opening-actions">
          <Action icon="upload" kind="primary" onClick={() => goTo('invoice')}>
            Upload invoice
          </Action>
          <Action icon="bank" onClick={() => goTo('reconcile')}>
            Reconcile
          </Action>
        </div>
      </section>

      <section className="metrics" aria-label="Key metrics">
        <div className="metric metric-main">
          <div className="metric-heading">
            <span>Cash position</span>
            <Badge tone="success">Up 4.2%</Badge>
          </div>
          <strong>Rs. 184,290</strong>
          <div className="cash-chart" aria-label="Cash position increased over seven days">
            {[28, 35, 32, 48, 43, 62, 70, 66, 82, 88, 100].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <small>Across 3 connected accounts</small>
        </div>

        <div className="metric">
          <span>Invoices today</span>
          <strong>24</strong>
          <p>
            <b>18</b> processed automatically
          </p>
        </div>

        <div className="metric">
          <span>Pending review</span>
          <strong>{REVIEW_QUEUE_ITEMS.length}</strong>
          <p>
            <b>3</b> due before 4:00 PM
          </p>
        </div>

        <div className="metric">
          <span>Auto-approved</span>
          <strong>86%</strong>
          <p>
            <b>+5.1%</b> this month
          </p>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel attention">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Priority queue</span>
              <h3>Attention needed</h3>
            </div>
            <button className="text-action" onClick={() => goTo('review')} type="button">
              View all {REVIEW_QUEUE_ITEMS.length} <Icon name="arrow" size={15} />
            </button>
          </div>

          <div className="attention-item">
            <div className="risk-number">72</div>
            <div className="attention-copy">
              <div>
                <Badge tone="warning">High risk</Badge>
                <span>INV-1048</span>
              </div>
              <strong>Northstar Office Co.</strong>
              <p>Bank details changed 2 days before payment. Supplier confirmation is missing.</p>
            </div>
            <div className="attention-value">
              <strong>Rs. 2,840.00</strong>
              <small>Due today</small>
            </div>
            <Action kind="primary" onClick={() => goTo('review')}>
              Review
            </Action>
          </div>

          <div className="attention-item compact">
            <div className="risk-number quiet">T</div>
            <div className="attention-copy">
              <strong>Beacon Software</strong>
              <p>VAT amount differs from calculated value by Rs. 38.40.</p>
            </div>
            <div className="attention-value">
              <strong>Rs. 960.00</strong>
              <small>Due 20 Jun</small>
            </div>
            <Action onClick={() => goTo('review')}>Inspect</Action>
          </div>
        </div>

        <aside className="panel close-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">June close</span>
              <h3>9 days remaining</h3>
            </div>
          </div>
          <div className="close-row">
            <span>Bank reconciliation</span>
            <strong>84%</strong>
          </div>
          <div className="progress">
            <span style={{ width: '84%' }}></span>
          </div>
          <div className="close-row">
            <span>Invoice review</span>
            <strong>68%</strong>
          </div>
          <div className="progress">
            <span style={{ width: '68%' }}></span>
          </div>
          <div className="close-row">
            <span>Expense coding</span>
            <strong>92%</strong>
          </div>
          <div className="progress">
            <span style={{ width: '92%' }}></span>
          </div>
          <p className="close-note">
            <Icon name="clock" size={16} />
            Next deadline: VAT return, 25 June
          </p>
        </aside>

        <section className="panel transactions">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Latest movement</span>
              <h3>Recent invoices</h3>
            </div>
            <Action icon="download" kind="quiet" onClick={() => downloadCSV('recent_invoices')}>
              Export
            </Action>
          </div>

          <div className="table">
            <div className="table-row table-head">
              <span>Supplier</span>
              <span>Reference</span>
              <span>Due</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {RECENT_INVOICES.map((inv) => (
              <button
                key={inv.ref}
                className="table-row"
                onClick={() => goTo('review')}
                type="button"
              >
                <strong>{inv.supplier}</strong>
                <span>{inv.ref}</span>
                <span>{inv.due}</span>
                <span>
                  <Badge tone={inv.tone}>{inv.status}</Badge>
                </span>
                <strong>{inv.amount}</strong>
              </button>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

// ----------------------------------------------------
// PROCESS INVOICE PAGE (Real File Upload From Computer)
// ----------------------------------------------------
function ProcessInvoicePage() {
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    supplier: string;
    invoiceNo: string;
    amount: string;
    vat: string;
    date: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [posted, setPosted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (file: File) => {
    setIsProcessing(true);
    const sizeKB = Math.round(file.size / 1024);
    const sizeFormatted = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    // Derive realistic metadata or extract fields
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const isAster = cleanBaseName.toLowerCase().includes('aster');

    setTimeout(() => {
      setUploadedFile({
        name: file.name,
        size: sizeFormatted,
        supplier: isAster ? 'Aster Works Ltd.' : cleanBaseName || 'Aster Works Ltd.',
        invoiceNo: 'INV-' + Math.floor(1000 + Math.random() * 9000),
        amount: 'Rs. 1,482.00',
        vat: 'Rs. 247.00',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      });
      setIsProcessing(false);
      setPosted(false);
    }, 600);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  return (
    <div className="page page-enter">
      <section className="opening compact-opening">
        <div>
          <p className="date">Invoice workspace</p>
          <h2>Process a supplier invoice</h2>
          <p>Upload a document from your computer to validate, match and prepare it for approval.</p>
        </div>
      </section>

      {/* Hidden real file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {isProcessing && (
        <section className="pipeline panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Scanning Document</span>
              <h3>Reading file and extracting financial records...</h3>
            </div>
            <Badge tone="warning">Processing...</Badge>
          </div>
          <div className="steps">
            {['Extract', 'Match', 'Tax', 'Risk', 'Arbitrate'].map((step) => (
              <div key={step} className="step">
                <span>
                  <Icon name="clock" size={13} />
                </span>
                <strong>{step}</strong>
                <small>Working...</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isProcessing && uploadedFile ? (
        <>
          <section className="pipeline panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Live validation</span>
                <h3>{uploadedFile.invoiceNo} · {uploadedFile.supplier}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge tone="info">Processing complete</Badge>
                <button
                  type="button"
                  className="action action-quiet"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Upload another
                </button>
              </div>
            </div>
            <div className="steps">
              {['Extract', 'Match', 'Tax', 'Risk', 'Arbitrate'].map((step, idx) => (
                <div key={step} className="step">
                  <span>
                    <Icon name="check" size={13} />
                  </span>
                  <strong>{step}</strong>
                  <small>{[1.2, 0.8, 1.6, 2.1, 0.4][idx]}s</small>
                </div>
              ))}
            </div>
          </section>

          <section className="document-review">
            <div className="invoice-preview">
              <div className="paper-head">
                <strong>{uploadedFile.supplier.toUpperCase()}</strong>
                <span>INVOICE</span>
              </div>
              <p>
                Invoice no. {uploadedFile.invoiceNo}
                <br />
                Date: {uploadedFile.date}
                <br />
                Due: 30 June 2026
              </p>
              <div className="upload-file-chip">
                <Icon name="invoice" size={14} />
                <span>Uploaded: {uploadedFile.name} ({uploadedFile.size})</span>
              </div>
              <div className="paper-lines">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="paper-total">
                <span>Total</span>
                <strong>{uploadedFile.amount}</strong>
              </div>
            </div>

            <div className="panel extracted">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Extracted data</span>
                  <h3>Review fields</h3>
                </div>
                <Badge tone="success">97% confidence</Badge>
              </div>

              {[
                ['Supplier', uploadedFile.supplier, '98%'],
                ['Invoice number', uploadedFile.invoiceNo, '99%'],
                ['Invoice date', uploadedFile.date, '96%'],
                ['VAT', uploadedFile.vat, '91%'],
                ['Total', uploadedFile.amount, '99%'],
              ].map(([fName, val, conf]) => (
                <label key={fName} className="field">
                  <span>{fName}</span>
                  <div>
                    <input defaultValue={val} />
                    <Badge tone={conf === '91%' ? 'warning' : 'success'}>{conf}</Badge>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="outcome">
            <span className="outcome-mark">
              <Icon name="check" size={28} />
            </span>
            <div>
              <span className="eyebrow">Decision</span>
              <h3>Approved for posting</h3>
              <p>
                PO, tax and supplier records agree. Voucher{' '}
                <strong>VCH-2606-184</strong> is ready.
              </p>
            </div>
            <div className="outcome-meta">
              <Badge tone="neutral">Rule: Priority 3</Badge>
              <small>SHA-256 · 85f2a9…37bd</small>
            </div>
            <Action
              kind="primary"
              onClick={() => {
                setPosted(true);
                alert(`Invoice ${uploadedFile.invoiceNo} successfully posted to ledger as VCH-2606-184!`);
              }}
            >
              {posted ? 'Invoice Posted' : 'Post invoice'}
            </Action>
          </section>
        </>
      ) : !isProcessing && (
        <button
          className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          type="button"
        >
          <span className="upload-icon">
            <Icon name="upload" size={25} />
          </span>
          <strong>Choose an invoice or drop it here from your computer</strong>
          <p>Supports PDF, PNG, JPG or DOCX up to 15 MB</p>
          <span className="action action-primary">Browse files from computer</span>
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------
// REVIEW QUEUE PAGE (With Reject With Reason Dialog)
// ----------------------------------------------------
function ReviewQueuePage() {
  const [decision, setDecision] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const items = REVIEW_QUEUE_ITEMS;

  const current = items[selectedIdx];

  // Common rejection reason tags for quick 1-click selection
  const COMMON_REASONS = [
    'Bank account not verified by known contact',
    'VAT / Tax rate mismatch on invoice lines',
    'Missing proof of delivery or goods receipt',
    'Duplicate invoice number or double billing',
    'Unauthorized payment terms or pricing discrepancy',
  ];

  const [selectedPill, setSelectedPill] = useState(COMMON_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState('');

  const handleConfirmReject = () => {
    const finalReason = customReasonText.trim() ? customReasonText.trim() : selectedPill;
    setDecision('Rejected');
    setRejectionReason(finalReason);
    setShowRejectModal(false);
  };

  return (
    <div className="page page-enter">
      <section className="opening compact-opening">
        <div>
          <p className="date">{items.length} open items</p>
          <h2>Review queue</h2>
        </div>
      </section>

      <section className="review-layout">
        <div className="review-list">
          {items.map((item, idx) => (
            <button
              key={item.ref}
              className={`review-row ${selectedIdx === idx ? 'selected' : ''}`}
              type="button"
              onClick={() => {
                setSelectedIdx(idx);
                setDecision('');
                setRejectionReason('');
              }}
            >
              <span>
                <strong>{item.supplier}</strong>
                <small>
                  {item.ref} · {item.due}
                </small>
              </span>
              <strong>{item.amount}</strong>
            </button>
          ))}
        </div>

        <div className="panel review-detail">
          <div className="panel-heading">
            <div>
              <Badge tone="warning">High risk · {current.riskScore}</Badge>
              <h3>{current.title}</h3>
            </div>
            <strong>{current.amount}</strong>
          </div>

          <div className="evidence">
            <div className="evidence-score">{current.riskNumber}</div>
            <div>
              <strong>{current.headline}</strong>
              <p>{current.evidence}</p>
            </div>
          </div>

          <div className="clause">
            <small>{current.clauseTitle}</small>
            <p>{current.clauseText}</p>
          </div>

          {decision ? (
            <div
              className="decision-note"
              style={{
                borderColor: decision === 'Rejected' ? '#d97706' : '#a9c4af',
                background: decision === 'Rejected' ? 'var(--amber-soft)' : 'var(--green-soft)',
                color: decision === 'Rejected' ? 'var(--amber)' : 'var(--green)',
              }}
            >
              <div>
                Decision recorded: <strong>{decision}</strong>
                {rejectionReason && (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--ink)' }}>
                    <strong>Reason specified:</strong> {rejectionReason}
                  </p>
                )}
                <small style={{ display: 'block', marginTop: '4px', fontSize: '10px', color: 'var(--muted)' }}>
                  Logged to audit trail at {new Date().toLocaleTimeString()} by Amara Mensah
                </small>
              </div>
            </div>
          ) : (
            <div className="decision-actions">
              <Action onClick={() => setShowRejectModal(true)}>
                Reject with reason
              </Action>
              <Action kind="primary" onClick={() => setDecision('Approved')}>
                Approve payment
              </Action>
            </div>
          )}
        </div>
      </section>

      {/* Modal Prompt for Reject with Reason */}
      {showRejectModal && (
        <div className="modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <Badge tone="warning">Reject Payment</Badge>
                <h3>Specify Rejection Reason</h3>
                <small style={{ color: 'var(--muted)' }}>
                  For {current.supplier} ({current.ref} · {current.amount})
                </small>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink)' }}>
                Select a standard rejection category:
              </label>
              <div className="reason-pills">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`reason-pill ${selectedPill === r ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPill(r);
                      setCustomReasonText('');
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink)' }}>
                Detailed explanation / Instructions for supplier:
              </label>
              <textarea
                className="reason-textarea"
                placeholder={`e.g. ${selectedPill}...`}
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <Action onClick={() => setShowRejectModal(false)}>
                Cancel
              </Action>
              <button
                type="button"
                className="action action-primary"
                style={{ background: 'var(--amber)', borderColor: 'var(--amber)', color: '#fff' }}
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// RECONCILIATION PAGE (Candidate Ranking, Reverse Match, UC-13 Dispute, Audit Log, Explainability)
// ----------------------------------------------------
interface LedgerRowItem {
  id: string;
  ref: string;
  entity: string;
  date: string;
  amount: number;
  amt: string;
  status: 'matched' | 'unmatched' | 'discrepancy';
  matchedWithId?: string;
  discrepancyAmount?: number;
  discrepancyReason?: string;
  suggestedPairId?: string;
  suggestionReason?: string;
  unmatchedTag?: string;
  isManualMatch?: boolean;
}

interface BankRowItem {
  id: string;
  ref: string;
  entity: string;
  date: string;
  amount: number;
  amt: string;
  status: 'matched' | 'unmatched' | 'discrepancy';
  matchedWithId?: string;
  discrepancyAmount?: number;
  discrepancyReason?: string;
  suggestedPairId?: string;
  suggestionReason?: string;
  unmatchedTag?: string;
  isManualMatch?: boolean;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  officer: string;
  action: 'auto' | 'match' | 'discrepancy' | 'undo' | 'leave_unmatched' | 'period';
  title: string;
  details: string;
}

function computeTextSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words1 = s1.split(/\s+/).filter(Boolean);
  const words2 = s2.split(/\s+/).filter(Boolean);

  let matches = 0;
  for (const w1 of words1) {
    if (words2.some((w2) => w2.includes(w1) || w1.includes(w2))) {
      matches++;
    }
  }
  const overlap = (matches * 2) / (words1.length + words2.length || 1);
  const substringBonus = s1.includes(s2) || s2.includes(s1) ? 0.35 : 0;
  return Math.min(1, overlap * 0.7 + substringBonus);
}

type PairKind = 'matched' | 'suggested' | 'discrepancy' | 'ledger_only' | 'bank_only';

interface Pair {
  key: string;
  kind: PairKind;
  ledger?: LedgerRowItem;
  bank?: BankRowItem;
}

const STATEMENT_BALANCE = 78420.18;

const fmt = (amount: number) =>
  'Rs. ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AUDIT_BADGE: Record<AuditLogEntry['action'], { label: string; cls: string }> = {
  auto: { label: 'Auto', cls: 'info' },
  match: { label: 'Manual', cls: 'ok' },
  discrepancy: { label: 'Manual', cls: 'warn' },
  undo: { label: 'Manual', cls: 'bad' },
  leave_unmatched: { label: 'Manual', cls: 'warn' },
  period: { label: 'Manual', cls: 'neutral' },
};

const PAIR_BADGE: Record<PairKind, { label: string; cls: string }> = {
  matched: { label: 'Matched', cls: 'ok' },
  suggested: { label: 'Suggested', cls: 'warn' },
  discrepancy: { label: 'Discrepancy', cls: 'warn' },
  ledger_only: { label: 'Missing from bank', cls: 'bad' },
  bank_only: { label: 'Missing from your records', cls: 'bad' },
};

function ReconciliationPage() {
  const officerName = 'Amara Mensah';

  const [statementFile, setStatementFile] = useState<{
    name: string;
    size: string;
    date: string;
  } | null>({
    name: 'HBL_June_2026_Statement.csv',
    size: '1.4 KB',
    date: '16 Jun 2026',
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const statementFileRef = useRef<HTMLInputElement>(null);

  // Period management: undoable until period is closed
  const [isPeriodClosed, setIsPeriodClosed] = useState(false);
  const [hoveredPairId, setHoveredPairId] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showAllAudit, setShowAllAudit] = useState(false);
  const [showMatched, setShowMatched] = useState(false);
  const [matchedSearch, setMatchedSearch] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!notification) return;
    const timeout = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(timeout);
  }, [notification]);

  // Candidate selection drawer / modal state
  const [candidateModal, setCandidateModal] = useState<{
    side: 'ledger' | 'bank';
    selectedItem: LedgerRowItem | BankRowItem;
  } | null>(null);

  // UC-13 Dispute email modal state
  const [disputeModalItem, setDisputeModalItem] = useState<{
    ledgerEntity: string;
    ledgerRef: string;
    ledgerAmt: string;
    bankEntity: string;
    bankRef: string;
    bankAmt: string;
    difference: number;
  } | null>(null);
  const [disputeEmailCopied, setDisputeEmailCopied] = useState(false);

  // Leave unmatched note selection
  const [unmatchedReasonSelect, setUnmatchedReasonSelect] = useState('Missing payment');

  // Ledger Entries
  const [ledgerRows, setLedgerRows] = useState<LedgerRowItem[]>([
    {
      id: 'led-1',
      ref: 'LED-1045',
      entity: 'Meridian Freight',
      date: '2026-06-16',
      amount: 7120.5,
      amt: 'Rs. 7,120.50',
      status: 'matched',
      matchedWithId: 'bnk-1',
    },
    {
      id: 'led-2',
      ref: 'LED-9941',
      entity: 'Stripe payout',
      date: '2026-06-16',
      amount: 4820.2,
      amt: 'Rs. 4,820.20',
      status: 'matched',
      matchedWithId: 'bnk-2',
    },
    {
      id: 'led-3',
      ref: 'LED-1052',
      entity: 'Aster Works Ltd.',
      date: '2026-06-16',
      amount: 1482.0,
      amt: 'Rs. 1,482.00',
      status: 'matched',
      matchedWithId: 'bnk-3',
    },
    {
      id: 'led-4',
      ref: 'LED-9021',
      entity: 'Equipment Rental',
      date: '2026-06-16',
      amount: 468.0,
      amt: 'Rs. 468.00',
      status: 'matched',
      matchedWithId: 'bnk-4',
    },
    {
      id: 'led-5',
      ref: 'LED-9024',
      entity: 'Apex Logistics UK',
      date: '2026-06-15',
      amount: 1250.0,
      amt: 'Rs. 1,250.00',
      status: 'unmatched',
      suggestedPairId: 'pair-apex',
      suggestionReason: 'Similar description, Rs. 35.00 difference (Surcharge/Fee)',
    },
    {
      id: 'led-6',
      ref: 'LED-9033',
      entity: 'Beacon Software',
      date: '2026-06-14',
      amount: 960.0,
      amt: 'Rs. 960.00',
      status: 'unmatched',
      suggestedPairId: 'pair-beacon',
      suggestionReason: 'Same amount, vendor name variation',
    },
  ]);

  // Bank Entries
  const [bankRows, setBankRows] = useState<BankRowItem[]>([
    {
      id: 'bnk-1',
      ref: 'TXN-88401',
      entity: 'Meridian Freight',
      date: '2026-06-16',
      amount: 7120.5,
      amt: 'Rs. 7,120.50',
      status: 'matched',
      matchedWithId: 'led-1',
    },
    {
      id: 'bnk-2',
      ref: 'TXN-88402',
      entity: 'Stripe payout',
      date: '2026-06-16',
      amount: 4820.2,
      amt: 'Rs. 4,820.20',
      status: 'matched',
      matchedWithId: 'led-2',
    },
    {
      id: 'bnk-3',
      ref: 'TXN-88403',
      entity: 'Aster Works Ltd.',
      date: '2026-06-16',
      amount: 1482.0,
      amt: 'Rs. 1,482.00',
      status: 'matched',
      matchedWithId: 'led-3',
    },
    {
      id: 'bnk-4',
      ref: 'TXN-88410',
      entity: 'DD · Equip Rental',
      date: '2026-06-16',
      amount: 468.0,
      amt: 'Rs. 468.00',
      status: 'matched',
      matchedWithId: 'led-4',
    },
    {
      id: 'bnk-5',
      ref: 'TXN-88415',
      entity: 'Apex Logistics UK (Fee incl.)',
      date: '2026-06-15',
      amount: 1285.0,
      amt: 'Rs. 1,285.00',
      status: 'unmatched',
      suggestedPairId: 'pair-apex',
      suggestionReason: 'Similar description, Rs. 35.00 difference (Surcharge/Fee)',
    },
    {
      id: 'bnk-6',
      ref: 'TXN-88419',
      entity: 'Beacon Soft Subscriptions',
      date: '2026-06-14',
      amount: 960.0,
      amt: 'Rs. 960.00',
      status: 'unmatched',
      suggestedPairId: 'pair-beacon',
      suggestionReason: 'Same amount, vendor name variation',
    },
    {
      id: 'bnk-7',
      ref: 'TXN-88422',
      entity: 'HBL Account Fee',
      date: '2026-06-16',
      amount: 32.5,
      amt: 'Rs. 32.50',
      status: 'unmatched',
      suggestionReason: 'No matching ledger entry · Potential unrecorded bank charge',
    },
  ]);

  // Audit Log with initial history
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-1',
      timestamp: '16 Jun 2026, 09:15:02',
      officer: 'Automated Rule Engine',
      action: 'auto',
      title: 'Batch Auto-Reconciliation',
      details: '47 statement items matched with 100% confidence on amount and reference.',
    },
    {
      id: 'log-2',
      timestamp: '16 Jun 2026, 11:20:15',
      officer: 'Amara Mensah (Finance Officer)',
      action: 'auto',
      title: 'Auto Verified: Meridian Freight',
      details: 'Confirmed pair LED-1045 and TXN-88401 (Rs. 7,120.50).',
    },
    {
      id: 'log-3',
      timestamp: '16 Jun 2026, 11:22:40',
      officer: 'Amara Mensah (Finance Officer)',
      action: 'auto',
      title: 'Auto Verified: Stripe Payout Batch',
      details: 'Confirmed pair LED-9941 and TXN-88402 (Rs. 4,820.20).',
    },
  ]);

  const addAuditLog = (
    action: AuditLogEntry['action'],
    title: string,
    details: string
  ) => {
    const timeStr = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: `${dateStr}, ${timeStr}`,
      officer: `${officerName} (Finance Officer)`,
      action,
      title,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const [statementValidation, setStatementValidation] = useState<StatementValidation | null>(null);

  const processStatementText = (text: string, fileName: string, fileSizeStr: string) => {
    setIsImporting(true);
    setImportError(null);
    try {
      const { transactions, validation } = parseBankStatementCSV(text, 78420.18);
      const { reconciledLedger, reconciledBank, summary } = runFourPassReconciliation(
        ledgerRows,
        transactions,
        3,
        0.8
      );

      setStatementFile({
        name: fileName,
        size: fileSizeStr,
        date: new Date().toLocaleDateString('en-GB'),
      });
      setStatementValidation(validation);
      setImportError(null);
      setLedgerRows(reconciledLedger);
      setBankRows(reconciledBank);
      setIsImporting(false);

      if (validation.isValid) {
        setNotification(
          `Statement imported and checked. Ending balance: ${fmt(validation.calculatedClosing)}. ${summary.exactMatchesCount + summary.fuzzyMatchesCount} transactions matched; ${summary.candidatesCount} need review.`
        );
      } else {
        setNotification(
          `Statement imported with balance variance: Opening + Credits - Debits differ by Rs. ${validation.discrepancy.toLocaleString('en-IN')}. ${summary.exactMatchesCount + summary.fuzzyMatchesCount} matched.`
        );
      }

      addAuditLog(
        'auto',
        `Statement Imported: ${fileName}`,
        `Parsed ${validation.rowCount} transactions (Hash: ${validation.fileHash}). Balance Check: ${validation.isValid ? 'PASSED' : 'DISCREPANCY'
        }. Pass 1 Exact: ${summary.exactMatchesCount}, Pass 2 Fuzzy: ${summary.fuzzyMatchesCount}, Pass 3 Candidates: ${summary.candidatesCount}.`
      );
    } catch (err: any) {
      setIsImporting(false);
      const message = `Could not import statement: ${err.message || 'Check the CSV format and try again.'}`;
      setStatementFile(null);
      setImportError(message);
      setNotification(message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeKB = (file.size / 1024).toFixed(1) + ' KB';
      setIsImporting(true);
      setImportError(null);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          processStatementText(text, file.name, sizeKB);
        } else {
          setIsImporting(false);
          setStatementFile(null);
          setImportError('The selected file is empty. Choose a statement with transaction rows.');
        }
      };
      reader.onerror = () => {
        setIsImporting(false);
        setStatementFile(null);
        setImportError('Could not read the selected file. Try importing it again.');
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleLoadSampleStatement = () => {
    const sampleCSV = generateSampleStatementCSV();
    processStatementText(sampleCSV, 'HBL_June_2026_Statement.csv', '1.4 KB');
  };

  const handleDownloadSampleCSV = () => {
    const sampleCSV = generateSampleStatementCSV();
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'HBL_June_2026_Sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification('Sample statement CSV downloaded to your computer.');
  };

  // Rank candidate items according to user spec:
  // 1. Same amount first
  // 2. Closest date
  // 3. Description similarity
  const rankedCandidates = useMemo(() => {
    if (!candidateModal) return [];

    const { side, selectedItem } = candidateModal;
    const candidatesPool = side === 'ledger' ? bankRows : ledgerRows;

    const parseDateMs = (dStr: string) => {
      const parsed = new Date(dStr).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    return candidatesPool
      .filter((c) => c.status !== 'matched' || c.id === selectedItem.matchedWithId)
      .map((c) => {
        const diffAmount = c.amount - selectedItem.amount;
        const absDiff = Math.abs(diffAmount);
        const isSameAmount = absDiff < 0.001;

        const dateDiffDays = Math.abs(
          (parseDateMs(c.date) - parseDateMs(selectedItem.date)) / (1000 * 3600 * 24)
        );

        const textSim = computeTextSimilarity(selectedItem.entity, c.entity);

        // Combined match score indicator for explainability
        let score = 0;
        if (isSameAmount) score += 60;
        else score += Math.max(0, 30 - absDiff * 0.4);

        score += Math.max(0, 25 - dateDiffDays * 5);
        score += textSim * 25;

        return {
          ...c,
          isSameAmount,
          diffAmount,
          absDiff,
          dateDiffDays: Math.round(dateDiffDays),
          textSimPercent: Math.round(textSim * 100),
          matchScore: Math.min(99, Math.round(score)),
        };
      })
      .sort((a, b) => {
        // 1. Same amount first
        if (a.isSameAmount !== b.isSameAmount) {
          return a.isSameAmount ? -1 : 1;
        }
        // 2. Closest date
        if (Math.abs(a.dateDiffDays - b.dateDiffDays) > 0.01) {
          return a.dateDiffDays - b.dateDiffDays;
        }
        // 3. Description similarity
        return b.textSimPercent - a.textSimPercent;
      });
  }, [candidateModal, bankRows, ledgerRows]);

  const applyPair = (ledger: LedgerRowItem, bank: BankRowItem) => {
    if (isPeriodClosed) {
      setNotification('Action blocked: period June 2026 is closed. Reopen it to change matches.');
      return;
    }
    const absDiff = Math.abs(bank.amount - ledger.amount);
    const isSame = absDiff < 0.001;
    const patch = isSame
      ? { status: 'matched' as const, isManualMatch: true, discrepancyAmount: undefined }
      : { status: 'discrepancy' as const, isManualMatch: true, discrepancyAmount: absDiff };

    setLedgerRows((prev) =>
      prev.map((row) => (row.id === ledger.id ? { ...row, ...patch, matchedWithId: bank.id } : row))
    );
    setBankRows((prev) =>
      prev.map((row) => (row.id === bank.id ? { ...row, ...patch, matchedWithId: ledger.id } : row))
    );

    if (isSame) {
      addAuditLog(
        'match',
        'Transactions matched',
        `Matched your record "${ledger.entity}" (${ledger.amt}, ${ledger.ref}) with bank statement entry "${bank.entity}" (${bank.amt}, ${bank.ref}).`
      );
      setNotification(`Matched "${ledger.entity}" with "${bank.entity}" (${fmt(ledger.amount)}).`);
    } else {
      addAuditLog(
        'discrepancy',
        'Difference recorded',
        `Your record for "${ledger.entity}" is ${ledger.amt}; the bank statement shows ${bank.amt}. Difference recorded: ${fmt(absDiff)}.`
      );
      setNotification(`Difference of ${fmt(absDiff)} recorded. You can draft a dispute email.`);
    }
  };

  // Pair selection action (handles both exact match and discrepancy)
  const handleSelectCandidate = (candidate: (typeof rankedCandidates)[0]) => {
    if (!candidateModal) return;
    const { side, selectedItem } = candidateModal;
    const ledger = side === 'ledger'
      ? selectedItem as LedgerRowItem
      : ledgerRows.find((row) => row.id === candidate.id);
    const bank = side === 'bank'
      ? selectedItem as BankRowItem
      : bankRows.find((row) => row.id === candidate.id);
    if (ledger && bank) applyPair(ledger, bank);
    setCandidateModal(null);
  };

  // Leave Unmatched action
  const handleLeaveUnmatched = () => {
    if (!candidateModal) return;
    if (isPeriodClosed) {
      setNotification('Action blocked: period June 2026 is closed. Reopen it to change matches.');
      return;
    }
    const { side, selectedItem } = candidateModal;

    if (side === 'ledger') {
      setLedgerRows((prev) =>
        prev.map((r) =>
          r.id === selectedItem.id
            ? { ...r, status: 'unmatched', unmatchedTag: unmatchedReasonSelect }
            : r
        )
      );
    } else {
      setBankRows((prev) =>
        prev.map((r) =>
          r.id === selectedItem.id
            ? { ...r, status: 'unmatched', unmatchedTag: unmatchedReasonSelect }
            : r
        )
      );
    }

    addAuditLog(
      'leave_unmatched',
      'Left Unmatched by Officer',
      `Officer flagged ${side} entry "${selectedItem.entity}" (${selectedItem.amt}, ${selectedItem.ref}) as Unmatched. Reason: ${unmatchedReasonSelect}.`
    );

    setNotification(
      `"${selectedItem.entity}" kept unmatched. Tagged reason: "${unmatchedReasonSelect}".`
    );

    setCandidateModal(null);
  };

  // Undo manual match (available as long as period is open)
  const handleUndoMatch = (item: LedgerRowItem | BankRowItem, side: 'ledger' | 'bank') => {
    if (isPeriodClosed) {
      setNotification('Action blocked: Financial period June 2026 is closed. Cannot alter matches.');
      return;
    }

    const partnerId = item.matchedWithId;

    if (side === 'ledger') {
      setLedgerRows((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...r, status: 'unmatched', matchedWithId: undefined, isManualMatch: false, discrepancyAmount: undefined }
            : r
        )
      );
      if (partnerId) {
        setBankRows((prev) =>
          prev.map((r) =>
            r.id === partnerId
              ? { ...r, status: 'unmatched', matchedWithId: undefined, isManualMatch: false, discrepancyAmount: undefined }
              : r
          )
        );
      }
    } else {
      setBankRows((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...r, status: 'unmatched', matchedWithId: undefined, isManualMatch: false, discrepancyAmount: undefined }
            : r
        )
      );
      if (partnerId) {
        setLedgerRows((prev) =>
          prev.map((r) =>
            r.id === partnerId
              ? { ...r, status: 'unmatched', matchedWithId: undefined, isManualMatch: false, discrepancyAmount: undefined }
              : r
          )
        );
      }
    }

    addAuditLog(
      'undo',
      'Match Undone',
      `Undid match for "${item.entity}" (${item.amt}). Both records reverted to unmatched status.`
    );

    setNotification(`Match undone for "${item.entity}". Records reverted to unmatched.`);
  };

  // Open UC-13 Dispute Email modal
  const handleOpenDisputeModal = (
    ledgerItem: LedgerRowItem,
    bankItem?: BankRowItem,
    difference?: number
  ) => {
    const partner =
      bankItem ||
      bankRows.find((b) => b.id === ledgerItem.matchedWithId) || {
        entity: 'Direct Debit / Bank Feed',
        ref: 'TXN-DISP',
        amt: ledgerItem.amt,
      };

    setDisputeModalItem({
      ledgerEntity: ledgerItem.entity,
      ledgerRef: ledgerItem.ref,
      ledgerAmt: ledgerItem.amt,
      bankEntity: partner.entity,
      bankRef: partner.ref,
      bankAmt: partner.amt,
      difference: difference || ledgerItem.discrepancyAmount || 35.0,
    });
    setDisputeEmailCopied(false);
  };

  const pairs = useMemo<Pair[]>(() => {
    const result: Pair[] = [];
    const bankById = new Map(bankRows.map((bank) => [bank.id, bank]));
    const usedBankIds = new Set<string>();

    for (const ledger of ledgerRows) {
      if ((ledger.status === 'matched' || ledger.status === 'discrepancy') && ledger.matchedWithId) {
        const bank = bankById.get(ledger.matchedWithId);
        if (bank) {
          usedBankIds.add(bank.id);
          result.push({
            key: `${ledger.id}|${bank.id}`,
            kind: ledger.status,
            ledger,
            bank,
          });
          continue;
        }
      }
      if (ledger.status === 'unmatched' && ledger.suggestedPairId) {
        const bank = bankRows.find(
          (row) => row.status === 'unmatched' && row.suggestedPairId === ledger.suggestedPairId
        );
        if (bank) {
          usedBankIds.add(bank.id);
          result.push({ key: `${ledger.id}|${bank.id}`, kind: 'suggested', ledger, bank });
          continue;
        }
      }
      result.push({ key: ledger.id, kind: 'ledger_only', ledger });
    }

    for (const bank of bankRows) {
      if (!usedBankIds.has(bank.id)) result.push({ key: bank.id, kind: 'bank_only', bank });
    }
    return result;
  }, [ledgerRows, bankRows]);

  const matchedPairs = pairs.filter((pair) => pair.kind === 'matched');
  const attention = pairs.filter((pair) => pair.kind !== 'matched');
  const unresolvedPairs = attention.filter((pair) => pair.kind !== 'discrepancy');
  const suggestedMatches = attention.filter(
    (pair) => pair.kind === 'suggested' || pair.kind === 'discrepancy'
  );
  const missingFromRecords = attention.filter((pair) => pair.kind === 'bank_only');
  const missingFromBank = attention.filter((pair) => pair.kind === 'ledger_only');
  const unresolvedCount = unresolvedPairs.length;

  const totalLedger = ledgerRows.length;
  const ledgerMatched = ledgerRows.filter((row) => row.status === 'matched').length;
  const bankMatched = bankRows.filter((row) => row.status === 'matched').length;
  const matchPercent = bankRows.length ? Math.round((bankMatched / bankRows.length) * 100) : 0;
  const isAllMatched = attention.length === 0;
  const allDifferencesExplained = unresolvedCount === 0;
  const statementBalance = statementValidation?.calculatedClosing ?? STATEMENT_BALANCE;
  const ledgerBalance = isAllMatched ? statementBalance : statementBalance - 468;
  const difference = Math.round(Math.abs(statementBalance - ledgerBalance) * 100) / 100;
  const canClosePeriod = difference === 0 || allDifferencesExplained;
  const closeDisabledReason = 'Explain or match all items before closing this period.';
  const currentStep = !statementFile ? 0 : unresolvedCount > 0 ? 1 : attention.length > 0 ? 2 : 3;
  const matchedSearchLower = matchedSearch.trim().toLowerCase();
  const visibleMatchedPairs = matchedPairs.filter((pair) => {
    const searchText = `${pair.ledger?.entity ?? ''} ${pair.ledger?.ref ?? ''} ${pair.bank?.entity ?? ''} ${pair.bank?.ref ?? ''}`;
    return searchText.toLowerCase().includes(matchedSearchLower);
  });

  const setPeriod = (closed: boolean) => {
    setIsPeriodClosed(closed);
    addAuditLog(
      'period',
      closed ? 'Period Closed' : 'Period Reopened',
      closed
        ? `Period June 2026 closed by officer with ${unresolvedCount} unresolved item(s). Matches locked.`
        : 'Period June 2026 reopened by officer. Matches can be undone or adjusted.'
    );
    setNotification(closed ? 'Period June 2026 closed. Matches are locked.' : 'Period June 2026 reopened.');
  };

  const formatPeriodDate = (date: string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));

  const reasonOf = (pair: Pair) => {
    const ledger = pair.ledger;
    const bank = pair.bank;
    const differenceAmount = ledger && bank ? Math.abs(bank.amount - ledger.amount) : 0;
    let base = '';
    if (pair.kind === 'ledger_only') {
      base = 'This record was not found in the bank statement.';
    } else if (pair.kind === 'bank_only') {
      base = 'This bank transaction has no matching entry in your records.';
    } else if (ledger && bank && differenceAmount > 0.001) {
      const higherSide = bank.amount > ledger.amount ? 'Bank amount' : 'Your recorded amount';
      base = `${higherSide} is ${fmt(differenceAmount)} higher. Supplier names are similar.`;
    } else if (ledger && bank) {
      base = 'Same amount, similar name.';
    }
    const tag = pair.ledger?.unmatchedTag ?? pair.bank?.unmatchedTag;
    return tag ? `${base} · Note: ${tag}` : base;
  };

  const renderSide = (
    row: LedgerRowItem | BankRowItem | undefined,
    title: string,
    empty: string
  ) =>
    row ? (
      <div className="rc-side">
        <span className="rc-side-label">{title}</span>
        <strong>{row.entity}</strong>
        <small>Reference: {row.ref}</small>
        <small>Date: {formatPeriodDate(row.date)}</small>
        <strong className="rc-side-amount">{row.amt}</strong>
      </div>
    ) : (
      <div className="rc-side rc-none">
        <span className="rc-side-label">{title}</span>
        <em>{empty}</em>
      </div>
    );

  const handleAddToRecords = (bank: BankRowItem) => {
    if (isPeriodClosed) return;
    const ledgerId = `led-${Date.now()}`;
    const newLedgerRow: LedgerRowItem = {
      id: ledgerId,
      ref: bank.ref,
      entity: bank.entity,
      date: bank.date,
      amount: bank.amount,
      amt: bank.amt,
      status: 'matched',
      matchedWithId: bank.id,
      isManualMatch: true,
    };
    setLedgerRows((rows) => [...rows, newLedgerRow]);
    setBankRows((rows) =>
      rows.map((row) =>
        row.id === bank.id
          ? { ...row, status: 'matched', matchedWithId: ledgerId, isManualMatch: true }
          : row
      )
    );
    addAuditLog(
      'match',
      'Bank transaction added to records',
      `Added ${bank.entity} (${bank.amt}, ${bank.ref}) to your records and matched it to the statement.`
    );
    setNotification(`${bank.entity} was added to your records and matched.`);
  };

  const renderAttentionCard = (pair: Pair) => {
    const { ledger, bank } = pair;
    const diff = ledger && bank ? Math.abs(bank.amount - ledger.amount) : 0;
    const badge = PAIR_BADGE[pair.kind];
    const similarity = ledger && bank ? computeTextSimilarity(ledger.entity, bank.entity) : 0;
    const confidence = diff < 0.001 && similarity >= 0.3 ? 'High' : 'Medium';

    return (
      <article className={`rc-attention-card rc-${pair.kind}`} key={pair.key}>
        <header className="rc-card-head">
          <span className={`rc-badge ${badge.cls}`}>{badge.label}</span>
          {ledger && bank && pair.kind !== 'discrepancy' && (
            <span className={`rc-confidence ${confidence.toLowerCase()}`}>
              <i aria-hidden="true" /> {confidence} confidence
            </span>
          )}
        </header>
        <div className="rc-card-sides">
          {renderSide(ledger, 'Your records', 'No matching record found')}
          {renderSide(bank, 'Bank statement', 'No matching bank transaction found')}
        </div>
        <p className="rc-why">
          {reasonOf(pair)}
          {pair.kind === 'discrepancy' && ' Difference recorded.'}
        </p>
        <div className="rc-actions">
          {pair.kind === 'suggested' && ledger && bank && (
            <>
              <button
                type="button"
                className="action action-primary"
                disabled={isPeriodClosed}
                onClick={() => applyPair(ledger, bank)}
              >
                {diff < 0.001 ? 'Accept match' : `Accept and record ${fmt(diff)} difference`}
              </button>
              <button
                type="button"
                className="action action-quiet"
                disabled={isPeriodClosed}
                onClick={() => setCandidateModal({ side: 'ledger', selectedItem: ledger })}
              >
                Not a match
              </button>
              {diff > 0.001 && (
                <button
                  type="button"
                  className="action action-quiet"
                  onClick={() => handleOpenDisputeModal(ledger, bank, diff)}
                >
                  Draft dispute email
                </button>
              )}
            </>
          )}
          {pair.kind === 'discrepancy' && ledger && bank && (
            <>
              <button
                type="button"
                className="action action-secondary"
                onClick={() => handleOpenDisputeModal(ledger, bank, ledger.discrepancyAmount ?? diff)}
              >
                Draft dispute email
              </button>
              <button
                type="button"
                className="action action-quiet"
                disabled={isPeriodClosed}
                onClick={() => handleUndoMatch(ledger, 'ledger')}
              >
                Undo
              </button>
            </>
          )}
          {pair.kind === 'ledger_only' && ledger && (
            <>
              <button
                type="button"
                className="action action-primary"
                disabled={isPeriodClosed}
                onClick={() => setCandidateModal({ side: 'ledger', selectedItem: ledger })}
              >
                Find in bank statement
              </button>
              <button
                type="button"
                className="action action-quiet"
                disabled={isPeriodClosed}
                onClick={() => setCandidateModal({ side: 'ledger', selectedItem: ledger })}
              >
                Ignore with note
              </button>
            </>
          )}
          {pair.kind === 'bank_only' && bank && (
            <>
              <button
                type="button"
                className="action action-primary"
                disabled={isPeriodClosed}
                onClick={() => handleAddToRecords(bank)}
              >
                Add to records
              </button>
              <button
                type="button"
                className="action action-quiet"
                disabled={isPeriodClosed}
                onClick={() => setCandidateModal({ side: 'bank', selectedItem: bank })}
              >
                Ignore with note
              </button>
            </>
          )}
        </div>
      </article>
    );
  };

  const renderPair = renderAttentionCard;

  const renderMatchedRow = (pair: Pair) => {
    const ledger = pair.ledger;
    const bank = pair.bank;
    if (!ledger || !bank) return null;
    return (
      <div className="rc-matched-row" key={pair.key}>
        <div className="rc-matched-pair">
          <strong>{ledger.entity}</strong>
          <span>matched with</span>
          <strong>{bank.entity}</strong>
        </div>
        <strong>{ledger.amt}</strong>
        <span className="rc-badge ok">{ledger.isManualMatch ? 'Manual' : 'Auto'}</span>
        <button
          type="button"
          className="action action-quiet"
          disabled={isPeriodClosed}
          title={isPeriodClosed ? 'Reopen the period before undoing this match.' : 'Undo this match'}
          onClick={() => handleUndoMatch(ledger, 'ledger')}
        >
          Undo
        </button>
      </div>
    );
  };

  const tableHead = (
    <div className="rc-row rc-th" role="row">
      <span>Status</span>
      <span>Ledger entry</span>
      <span>Bank line</span>
      <span>Amount</span>
      <span>Why</span>
      <span />
    </div>
  );
  const visibleAudit = showAllAudit ? auditLogs : auditLogs.slice(0, 8);

  const matchedLedgerCount = ledgerMatched;
  const discrepancyCount = pairs.filter((pair) => pair.kind === 'discrepancy').length;

  return (
    <div className="page page-enter">
      <section className="rc-head">
        <div>
          <div className="rc-kicker">
            <span title="Habib Bank Limited">HBL - 1234-5678</span>
            <span className={`rc-period ${isPeriodClosed ? 'closed' : 'open'}`}>
              June 2026 · {isPeriodClosed ? 'Closed' : 'Open'}
            </span>
          </div>
          <h2>Bank reconciliation</h2>
          <p className="rc-sub">
            Officer in charge: <strong>{officerName}</strong>
            {statementFile && (
              <>
                {' '}· Statement: <strong>{statementFile.name}</strong> ({statementFile.size})
              </>
            )}
          </p>
        </div>
        <div className="rc-head-actions">
          <Action icon="upload" kind="primary" onClick={() => statementFileRef.current?.click()}>
            {isImporting ? 'Importing...' : 'Import statement'}
          </Action>
          <div className="rc-more">
            <button
              type="button"
              className="action action-secondary"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
            >
              More
            </button>
            {moreOpen && (
              <div className="rc-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    handleDownloadSampleCSV();
                  }}
                >
                  Download sample CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    handleLoadSampleStatement();
                  }}
                >
                  Load sample statement
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setStatementFile(null);
                    setStatementValidation(null);
                    setImportError(null);
                    setMoreOpen(false);
                  }}
                >
                  Clear imported statement
                </button>
              </div>
            )}
          </div>
          <span
            className="rc-close-wrap"
            title={!isPeriodClosed && !canClosePeriod ? closeDisabledReason : undefined}
          >
            <button
              type="button"
              className={`action ${isPeriodClosed ? 'action-secondary' : 'rc-close-btn'}`}
              disabled={!isPeriodClosed && !canClosePeriod}
              title={isPeriodClosed ? 'Reopen this period.' : canClosePeriod ? 'Close this period.' : closeDisabledReason}
              onClick={() => (isPeriodClosed ? setPeriod(false) : setConfirmClose(true))}
            >
              {isPeriodClosed ? 'Reopen period' : 'Close period'}
            </button>
          </span>
        </div>
      </section>

      {isImporting && (
        <section className="rc-import-state" aria-label="Importing statement" aria-busy="true">
          <span className="rc-skeleton rc-skeleton-heading" />
          <span className="rc-skeleton" />
          <span className="rc-skeleton rc-skeleton-short" />
        </section>
      )}

      {importError && (
        <section className="rc-import-state rc-import-error" role="alert">
          <strong>Statement could not be imported</strong>
          <p>{importError}</p>
          <button type="button" className="action action-secondary" onClick={() => statementFileRef.current?.click()}>
            Choose another statement
          </button>
        </section>
      )}

      {!statementFile && !isImporting && !importError && (
        <section className="rc-import-state rc-import-empty">
          <h3>No statement imported</h3>
          <p>Import a bank statement to compare it with your records.</p>
          <button type="button" className="action action-secondary" onClick={handleLoadSampleStatement}>
            Load sample statement
          </button>
        </section>
      )}

      {statementFile && !isImporting && !importError && statementValidation && (
        <div className={`rc-validation ${statementValidation.isValid ? 'ok' : 'warn'}`}>
          <div>
            <strong>
              {statementValidation.isValid ? 'Statement verified' : 'Statement balance variance'}
            </strong>
            <span>
              {' '}· {statementFile?.name} · {statementValidation.rowCount} rows · SHA-256 {statementValidation.fileHash}
            </span>
          </div>
          <div>
            Starting balance <strong>{fmt(statementValidation.openingBalance)}</strong> + Money received{' '}
            <strong>{fmt(statementValidation.totalCredits)}</strong> − Money spent{' '}
            <strong>{fmt(statementValidation.totalDebits)}</strong> = Ending balance{' '}
            <strong>{fmt(statementValidation.calculatedClosing)}</strong>
            {!statementValidation.isValid && (
              <span className="rc-var"> · Variance {fmt(statementValidation.discrepancy)}</span>
            )}
          </div>
        </div>
      )}

      {statementFile && !isImporting && !importError && (
        <>
          <section className={`rc-summary ${difference === 0 ? 'is-clear' : 'is-open'}`} aria-label="Reconciliation summary">
            <div className="rc-summary-main">
              <h3>
                {difference === 0
                  ? 'All matched'
                  : allDifferencesExplained
                    ? `${fmt(difference)} difference recorded`
                    : `${fmt(difference)} still to explain`}
              </h3>
              <p>
                {attention.length} {attention.length === 1 ? 'item needs' : 'items need'} your attention.{' '}
                {bankMatched} of {bankRows.length} bank lines matched.
              </p>
              <div className="rc-progress-line">
                <span>Bank lines matched</span>
                <strong>{matchPercent}%</strong>
                <div
                  className="rc-progress-track"
                  role="progressbar"
                  aria-label="Bank lines matched"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={matchPercent}
                >
                  <span style={{ width: `${matchPercent}%` }} />
                </div>
              </div>
            </div>
            <dl className="rc-summary-balances">
              <div><dt>Statement balance</dt><dd>{fmt(statementBalance)}</dd></div>
              <div><dt>Your records</dt><dd>{fmt(ledgerBalance)}</dd></div>
              <div><dt>Difference</dt><dd>{fmt(difference)}</dd></div>
            </dl>
            {difference === 0 && (
              <p className="rc-success-note" role="status">
                Difference is {fmt(0)}. You can close the period.
              </p>
            )}
          </section>

          <ol className="rc-steps" aria-label="Reconciliation steps">
            {['Import statement', 'Review suggestions', 'Fix leftovers', 'Close period'].map((step, index) => (
              <li key={step} className={currentStep === index ? 'active' : currentStep > index ? 'complete' : ''}>
                <span className="rc-step-number">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <section className="rc-work-area" aria-labelledby="rc-attention-title">
            <header className="rc-work-heading">
              <div>
                <span className="rc-eyebrow">Review transactions</span>
                <h3 id="rc-attention-title">Needs your attention <span className="rc-count">{attention.length}</span></h3>
              </div>
            </header>

            {attention.length === 0 ? (
              <div className="rc-all-clear" role="status">
                <strong>All open items are explained.</strong>
                <span>You can close the period or review the matched transactions below.</span>
              </div>
            ) : (
              <>
                <section className="rc-group">
                  <header><h4>Suggested matches</h4><span>{suggestedMatches.length}</span></header>
                  {suggestedMatches.length > 0 ? suggestedMatches.map(renderAttentionCard) : (
                    <p className="rc-group-empty">No suggested matches.</p>
                  )}
                </section>
                <section className="rc-group">
                  <header><h4>Missing from your records</h4><span>{missingFromRecords.length}</span></header>
                  {missingFromRecords.length > 0 ? missingFromRecords.map(renderAttentionCard) : (
                    <p className="rc-group-empty">No bank transactions are missing from your records.</p>
                  )}
                </section>
                <section className="rc-group">
                  <header><h4>Missing from the bank</h4><span>{missingFromBank.length}</span></header>
                  {missingFromBank.length > 0 ? missingFromBank.map(renderAttentionCard) : (
                    <p className="rc-group-empty">No records are missing from the bank statement.</p>
                  )}
                </section>
              </>
            )}
          </section>

          <section className="rc-lower-panel">
            <button
              type="button"
              className="rc-toggle"
              aria-expanded={showMatched}
              onClick={() => setShowMatched((shown) => !shown)}
            >
              <span>Matched <span className="rc-count ok">{matchedPairs.length}</span></span>
              <span>{showMatched ? 'Hide' : 'Show'}</span>
            </button>
            {showMatched && (
              <div className="rc-matched-content">
                <label className="rc-search">
                  <span>Search matched transactions</span>
                  <input
                    type="search"
                    value={matchedSearch}
                    onChange={(event) => setMatchedSearch(event.target.value)}
                    placeholder="Name or reference"
                  />
                </label>
                {visibleMatchedPairs.length > 0 ? visibleMatchedPairs.map(renderMatchedRow) : (
                  <p className="rc-group-empty">No matched transactions found.</p>
                )}
              </div>
            )}
          </section>

          <section className="rc-lower-panel">
            <button
              type="button"
              className="rc-toggle"
              aria-expanded={showAuditLog}
              onClick={() => setShowAuditLog((shown) => !shown)}
            >
              <span>History <span className="rc-count">{auditLogs.length}</span></span>
              <span>{showAuditLog ? 'Hide history' : 'View history'}</span>
            </button>
            {showAuditLog && (
              <div className="rc-audit">
                {visibleAudit.map((log) => (
                  <div key={log.id} className="rc-audit-row">
                    <span className={`rc-badge ${AUDIT_BADGE[log.action].cls}`} title={log.action === 'auto' ? 'Automatically matched' : 'Action recorded by a user'}>
                      {AUDIT_BADGE[log.action].label}
                    </span>
                    <div>
                      <strong>{log.title}</strong>
                      <p>{log.details}</p>
                    </div>
                    <div className="rc-audit-meta">
                      <span>{log.timestamp}</span>
                      <small>{log.officer}</small>
                    </div>
                  </div>
                ))}
                {auditLogs.length > 8 && (
                  <button type="button" className="action action-quiet" onClick={() => setShowAllAudit((shown) => !shown)}>
                    {showAllAudit ? 'Show latest 8' : `Show all ${auditLogs.length}`}
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {notification && (
        <div className="rc-toast" role="status">
          <span>{notification}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotification(null)}>
            ✕
          </button>
        </div>
      )}

      {confirmClose && (
        <div className="modal-backdrop" onClick={() => setConfirmClose(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <Badge tone="warning">Close period</Badge>
                <h3>Close June 2026?</h3>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6 }}>
                {unresolvedCount > 0 ? (
                  <>
                    <strong>{unresolvedCount} item(s) still need review.</strong> Closing locks all matches and
                    blocks further changes until the period is reopened.
                  </>
                ) : attention.length > 0 ? (
                  'All remaining differences are recorded. Closing locks all matches until the period is reopened.'
                ) : (
                  'All items are matched. Closing locks all matches until the period is reopened.'
                )}
              </p>
            </div>
            <div className="modal-footer">
              <Action onClick={() => setConfirmClose(false)}>Cancel</Action>
              <button
                type="button"
                className="action action-primary"
                onClick={() => {
                  setConfirmClose(false);
                  setPeriod(true);
                }}
              >
                Close period
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="legacy-reconciliation-content">
        {/* Top Header & Statement Import */}
        <section className="opening compact-opening">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p className="date" style={{ margin: 0 }}>Barclays · 30-94-12</p>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '3px',
                  background: isPeriodClosed ? 'rgba(220,38,38,0.1)' : 'rgba(7,157,104,0.1)',
                  color: isPeriodClosed ? '#dc2626' : '#079d68',
                  border: `1px solid ${isPeriodClosed ? 'rgba(220,38,38,0.3)' : 'rgba(7,157,104,0.3)'}`,
                }}
              >
                Period: June 2026 · {isPeriodClosed ? 'Closed (Locked)' : 'Open (Undoable)'}
              </span>
            </div>
            <h2 style={{ marginTop: '4px' }}>Bank reconciliation</h2>
            <p>
              Statement balance Rs. 78,420.18 · Ledger balance{' '}
              {isAllMatched ? 'Rs. 78,420.18' : 'Rs. 77,952.18'} ·<br></br> Officer in charge: <strong>{officerName}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="action action-secondary"
              onClick={() => {
                const next = !isPeriodClosed;
                setIsPeriodClosed(next);
                addAuditLog(
                  'auto',
                  next ? 'Period Closed' : 'Period Reopened',
                  `Period June 2026 ${next ? 'closed by officer. Matches locked.' : 'reopened by officer. Manual matches undoable.'}`
                );
                setNotification(
                  next
                    ? 'Financial period June 2026 closed. All matches locked against modifications.'
                    : 'Financial period June 2026 reopened. Matches can now be undone or adjusted.'
                );
              }}
              title="Toggle accounting period lock"
            >
              {isPeriodClosed ? 'Reopen Period' : 'Close Period'}
            </button>
            <button
              type="button"
              className="action action-secondary"
              onClick={handleDownloadSampleCSV}
              title="Download CSV bank statement sample template"
              style={{ fontSize: '12px' }}
            >
              Sample CSV
            </button>
            <button
              type="button"
              className="action action-secondary"
              onClick={handleLoadSampleStatement}
              title="Parse & test reconciliation on built-in bank statement"
              style={{ fontSize: '12px' }}
            >
              Test Sample Data
            </button>
            <Action
              icon="upload"
              kind="primary"
              onClick={() => statementFileRef.current?.click()}
            >
              {isImporting ? 'Importing...' : 'Import statement'}
            </Action>
          </div>
        </section>

        {/* Hidden Statement File Input */}
        <input
          ref={statementFileRef}
          type="file"
          accept=".csv,.ofx,.qif,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Statement Validation & Mathematical Balance Check Banner */}
        {statementValidation && (
          <div
            style={{
              margin: '0 0 16px',
              padding: '12px 16px',
              background: statementValidation.isValid ? 'rgba(7,157,104,0.06)' : 'rgba(217,119,6,0.08)',
              border: `1px solid ${statementValidation.isValid ? 'rgba(7,157,104,0.3)' : 'rgba(217,119,6,0.35)'}`,
              borderRadius: '4px',
              fontSize: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: statementValidation.isValid ? '#079d68' : '#d97706',
                  }}
                />
                <strong>Statement Parsed &amp; Validated:</strong>
                <span>{statementFile?.name} ({statementValidation.rowCount} rows)</span>
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>SHA-256: {statementValidation.fileHash}</span>
              </div>
              <div style={{ marginTop: '4px', color: 'var(--ink)' }}>
                Opening: <strong>Rs. {statementValidation.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                {' + '}
                Credits: <strong>Rs. {statementValidation.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                {' - '}
                Debits: <strong>Rs. {statementValidation.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                {' = '}
                Calculated Closing: <strong>Rs. {statementValidation.calculatedClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                {statementValidation.isValid ? (
                  <span style={{ marginLeft: '8px', color: '#079d68', fontWeight: 600 }}>✓ Mathematical Balance Verified</span>
                ) : (
                  <span style={{ marginLeft: '8px', color: '#d97706', fontWeight: 600 }}>
                    ⚠ Variance: Rs. {statementValidation.discrepancy.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', background: '#fff', border: '1px solid var(--line)', borderRadius: '3px', fontWeight: 500 }}>
                FR-TP-01 Parser Active
              </span>
              <span style={{ fontSize: '11px', padding: '3px 8px', background: '#fff', border: '1px solid var(--line)', borderRadius: '3px', fontWeight: 500 }}>
                FR-TP-07 4-Pass Engine
              </span>
            </div>
          </div>
        )}

        {/* Status Legend Box */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            margin: '0 0 20px',
            padding: '12px 18px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '3px',
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#079d68',
                  boxShadow: '0 0 0 2px rgba(7,157,104,0.25)',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                Green dot: <strong>Matched</strong> with bank record
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#dc2626',
                  boxShadow: '0 0 0 2px rgba(220,38,38,0.25)',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 600, color: '#9c6810' }}>
                Red dot + Beige row: <strong>Not matched</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#d97706',
                  boxShadow: '0 0 0 2px rgba(217,119,6,0.3)',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 600, color: '#b45309' }}>
                Amber dot: <strong>Discrepancy</strong> (Draft dispute enabled)
              </span>
            </div>
          </div>

          {statementFile ? (
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
              Statement: <strong>{statementFile.name}</strong> ({statementFile.size})
            </span>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
              Hover on suggested pairs to inspect explainability reasons.
            </span>
          )}
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            style={{
              margin: '0 0 20px',
              padding: '12px 16px',
              background: 'var(--green-soft)',
              border: '1px solid #a9c4af',
              color: 'var(--green)',
              borderRadius: '3px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>✓ {notification}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--green)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary Metrics */}
        <section className="reconcile-summary">
          <strong>{matchPercent}%</strong>
          <div>
            <span>
              {matchedLedgerCount} of {totalLedger} records matched
              {discrepancyCount > 0 && ` · ${discrepancyCount} discrepancy pending dispute`}
            </span>
            <small>
              {isAllMatched
                ? 'Zero discrepancies remaining · Accounts balanced'
                : `${totalLedger - matchedLedgerCount} items unresolved · Suggested candidate matches available`}
            </small>
          </div>
          <div className="progress">
            <span style={{ width: `${matchPercent}%` }}></span>
          </div>
        </section>

        {/* Side-by-Side Ledger & Bank Grid */}
        <section className="ledger-grid">
          {/* Ledger Entries Panel */}
          <div className="panel ledger">
            <div className="panel-heading">
              <div>
                <h3>Ledger entries</h3>
                <small style={{ color: 'var(--muted)', fontSize: '10.5px' }}>
                  Internal ERP book balance
                </small>
              </div>
              <Badge tone="neutral">16 June</Badge>
            </div>

            {ledgerRows.map((row) => {
              const isHovered = Boolean(
                hoveredPairId && row.suggestedPairId && row.suggestedPairId === hoveredPairId
              );

              return (
                <div
                  key={row.id}
                  className={`ledger-row ${row.status} ${isHovered ? 'suggested-pair-hover' : ''}`}
                  onMouseEnter={() => row.suggestedPairId && setHoveredPairId(row.suggestedPairId)}
                  onMouseLeave={() => setHoveredPairId(null)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>
                      <i />
                      <strong>{row.entity}</strong>
                      <span
                        className={`status-indicator ${row.status === 'matched'
                          ? 'matched-pill'
                          : row.status === 'discrepancy'
                            ? 'discrepancy-pill'
                            : 'unmatched-pill'
                          }`}
                      >
                        {row.status === 'matched'
                          ? 'Matched'
                          : row.status === 'discrepancy'
                            ? `Discrepancy (Δ Rs. ${row.discrepancyAmount?.toFixed(2)})`
                            : 'Not matched'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {row.ref}
                      </span>
                    </span>

                    {/* Explainability reason on NOT MATCHED row */}
                    {row.status === 'unmatched' && (
                      <div className="explainability-reason" title="Explainability reason: Why this pair is suggested">
                        <span className="reason-bulb">💡</span>
                        <span>{row.suggestionReason || 'Same amount, different description'}</span>
                        {row.unmatchedTag && (
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            · Note: {row.unmatchedTag}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Discrepancy details */}
                    {row.status === 'discrepancy' && (
                      <div className="explainability-reason discrepancy-reason">
                        <span className="reason-bulb">⚠</span>
                        <span>Discrepancy: Difference Rs. {row.discrepancyAmount?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>{row.amt}</strong>

                    {/* Reconcile button for unresolved ledger entries */}
                    {row.status === 'unmatched' && (
                      <button
                        type="button"
                        className="action action-quiet"
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderColor: 'var(--amber)',
                          color: 'var(--amber)',
                          fontWeight: 600,
                        }}
                        onClick={() => setCandidateModal({ side: 'ledger', selectedItem: row })}
                        title="Open candidate bank transactions ranked by amount, date, and description similarity"
                      >
                        Reconcile
                      </button>
                    )}

                    {/* Draft Dispute Email option for discrepancy (UC-13) */}
                    {row.status === 'discrepancy' && (
                      <>
                        <button
                          type="button"
                          className="action action-quiet"
                          style={{
                            fontSize: '10.5px',
                            padding: '3px 8px',
                            borderColor: '#b45309',
                            color: '#b45309',
                            fontWeight: 600,
                          }}
                          onClick={() => handleOpenDisputeModal(row)}
                          title="Draft formal dispute email notice for payment difference (UC-13)"
                        >
                          Draft Dispute Email
                        </button>
                        <button
                          type="button"
                          className="action action-quiet"
                          style={{
                            fontSize: '10px',
                            padding: '3px 6px',
                            color: isPeriodClosed ? 'var(--muted)' : 'var(--ink)',
                            cursor: isPeriodClosed ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => handleUndoMatch(row, 'ledger')}
                          disabled={isPeriodClosed}
                          title={
                            isPeriodClosed
                              ? 'Period is closed. Cannot undo match.'
                              : 'Undo match and revert to unmatched'
                          }
                        >
                          Undo
                        </button>
                      </>
                    )}

                    {/* Undo button for matched items (until period is closed) */}
                    {row.status === 'matched' && (
                      <button
                        type="button"
                        className="action action-quiet"
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          color: isPeriodClosed ? 'var(--muted)' : 'var(--muted)',
                          cursor: isPeriodClosed ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => handleUndoMatch(row, 'ledger')}
                        disabled={isPeriodClosed}
                        title={
                          isPeriodClosed
                            ? 'Period closed · Matches locked'
                            : 'Undo match and revert to unmatched'
                        }
                      >
                        {isPeriodClosed ? 'Locked' : 'Undo Match'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bank Statement Panel */}
          <div className="panel ledger">
            <div className="panel-heading">
              <div>
                <h3>Bank statement</h3>
                <small style={{ color: 'var(--muted)', fontSize: '10.5px' }}>
                  Verified electronic feed
                </small>
              </div>
              <Badge tone="neutral">16 June</Badge>
            </div>

            {bankRows.map((row) => {
              const isHovered = Boolean(
                hoveredPairId && row.suggestedPairId && row.suggestedPairId === hoveredPairId
              );

              return (
                <div
                  key={row.id}
                  className={`ledger-row ${row.status} ${isHovered ? 'suggested-pair-hover' : ''}`}
                  onMouseEnter={() => row.suggestedPairId && setHoveredPairId(row.suggestedPairId)}
                  onMouseLeave={() => setHoveredPairId(null)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>
                      <i />
                      <strong>{row.entity}</strong>
                      <span
                        className={`status-indicator ${row.status === 'matched'
                          ? 'matched-pill'
                          : row.status === 'discrepancy'
                            ? 'discrepancy-pill'
                            : 'unmatched-pill'
                          }`}
                      >
                        {row.status === 'matched'
                          ? 'Matched'
                          : row.status === 'discrepancy'
                            ? `Discrepancy (Δ Rs. ${row.discrepancyAmount?.toFixed(2)})`
                            : 'Not matched'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {row.ref}
                      </span>
                    </span>

                    {/* Explainability reason on NOT MATCHED row */}
                    {row.status === 'unmatched' && (
                      <div className="explainability-reason" title="Explainability reason: Why this pair is suggested">
                        <span className="reason-bulb">💡</span>
                        <span>{row.suggestionReason || 'Same amount, different description'}</span>
                        {row.unmatchedTag && (
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            · Note: {row.unmatchedTag}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Discrepancy details */}
                    {row.status === 'discrepancy' && (
                      <div className="explainability-reason discrepancy-reason">
                        <span className="reason-bulb">⚠</span>
                        <span>Discrepancy: Difference Rs. {row.discrepancyAmount?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>{row.amt}</strong>

                    {/* Match button on Bank side (in reverse) */}
                    {row.status === 'unmatched' && (
                      <button
                        type="button"
                        className="action action-quiet"
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderColor: 'var(--amber)',
                          color: 'var(--amber)',
                          fontWeight: 600,
                        }}
                        onClick={() => setCandidateModal({ side: 'bank', selectedItem: row })}
                        title="Open candidate ledger entries ranked by amount, date, and description similarity"
                      >
                        Match
                      </button>
                    )}

                    {/* Draft Dispute Email option for discrepancy */}
                    {row.status === 'discrepancy' && (
                      <>
                        <button
                          type="button"
                          className="action action-quiet"
                          style={{
                            fontSize: '10.5px',
                            padding: '3px 8px',
                            borderColor: '#b45309',
                            color: '#b45309',
                            fontWeight: 600,
                          }}
                          onClick={() => {
                            const partner = ledgerRows.find((l) => l.id === row.matchedWithId);
                            if (partner) {
                              handleOpenDisputeModal(partner, row, row.discrepancyAmount);
                            }
                          }}
                          title="Draft formal dispute email notice for payment difference (UC-13)"
                        >
                          Draft Dispute Email
                        </button>
                        <button
                          type="button"
                          className="action action-quiet"
                          style={{
                            fontSize: '10px',
                            padding: '3px 6px',
                            color: isPeriodClosed ? 'var(--muted)' : 'var(--ink)',
                            cursor: isPeriodClosed ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => handleUndoMatch(row, 'bank')}
                          disabled={isPeriodClosed}
                          title={
                            isPeriodClosed
                              ? 'Period is closed. Cannot undo match.'
                              : 'Undo match and revert to unmatched'
                          }
                        >
                          Undo
                        </button>
                      </>
                    )}

                    {/* Undo button for matched items */}
                    {row.status === 'matched' && (
                      <button
                        type="button"
                        className="action action-quiet"
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          color: isPeriodClosed ? 'var(--muted)' : 'var(--muted)',
                          cursor: isPeriodClosed ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => handleUndoMatch(row, 'bank')}
                        disabled={isPeriodClosed}
                        title={
                          isPeriodClosed
                            ? 'Period closed · Matches locked'
                            : 'Undo match and revert to unmatched'
                        }
                      >
                        {isPeriodClosed ? 'Locked' : 'Undo Match'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Audit Log & Activity Trail Section */}
        <section className="audit-log-panel">
          <div className="audit-log-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '13px' }}>Audit Log & Reconciliation Trail</h4>
              <span
                style={{
                  fontSize: '10.5px',
                  background: 'var(--paper)',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  color: 'var(--muted)',
                }}
              >
                {auditLogs.length} events recorded
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Officer: <strong>{officerName}</strong>
              </span>
              <button
                type="button"
                className="action action-quiet"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => setShowAuditLog(!showAuditLog)}
              >
                {showAuditLog ? 'Collapse Log' : 'Expand Log'}
              </button>
            </div>
          </div>

          {showAuditLog && (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {auditLogs.map((log) => (
                <div key={log.id} className="audit-entry">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        background:
                          log.action === 'match'
                            ? 'rgba(7,157,104,0.12)'
                            : log.action === 'discrepancy'
                              ? 'rgba(217,119,6,0.15)'
                              : log.action === 'undo'
                                ? 'rgba(220,38,38,0.12)'
                                : 'rgba(59,130,246,0.12)',
                        color:
                          log.action === 'match'
                            ? '#079d68'
                            : log.action === 'discrepancy'
                              ? '#b45309'
                              : log.action === 'undo'
                                ? '#dc2626'
                                : '#2563eb',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.action === 'match'
                        ? 'Manual Match'
                        : log.action === 'discrepancy'
                          ? 'Discrepancy'
                          : log.action === 'undo'
                            ? 'Match Reverted'
                            : log.action === 'leave_unmatched'
                              ? 'Unmatched Flag'
                              : 'Auto Match'}
                    </span>
                    <div>
                      <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>
                        {log.title}
                      </strong>
                      <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '11px' }}>
                        {log.details}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{log.timestamp}</div>
                    <small style={{ fontSize: '10px', color: 'var(--muted)' }}>{log.officer}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Candidate Selection Panel / Modal */}
      {candidateModal && (
        <div
          className="modal-backdrop"
          onClick={() => setCandidateModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '680px',
              width: '95%',
              background: 'var(--paper)',
              borderRadius: '6px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '14px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--amber)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {candidateModal.side === 'ledger'
                    ? 'Other bank statement options'
                    : 'Other record options'}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '16px', color: 'var(--ink)' }}>
                  {candidateModal.side === 'ledger'
                    ? `Find a bank transaction for ${candidateModal.selectedItem.entity}`
                    : `Find a record for ${candidateModal.selectedItem.entity}`}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                  Amount: <strong>{candidateModal.selectedItem.amt}</strong> · Reference:{' '}
                  <strong>{candidateModal.selectedItem.ref}</strong> · Date:{' '}
                  {formatPeriodDate(candidateModal.selectedItem.date)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close match options"
                onClick={() => setCandidateModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Ranking Criteria Banner */}
            <div
              style={{
                margin: '14px 0',
                padding: '10px 14px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🎯</span>
              <span>
                <strong>Suggestions:</strong> Listed by amount, date, and name similarity.
              </span>
            </div>

            {/* Candidate Cards List */}
            <div className="candidate-list">
              {rankedCandidates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                  No candidate transactions currently available in this period.
                </div>
              ) : (
                rankedCandidates.map((candidate, idx) => (
                  <div
                    key={candidate.id}
                    className={`candidate-card ${idx === 0 ? 'candidate-best' : ''}`}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="candidate-rank-badge">Option {idx + 1}</span>
                        <span className="candidate-score-pill">
                          Similarity {candidate.matchScore}%
                        </span>
                        {candidate.isSameAmount ? (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#079d68',
                              background: 'rgba(7,157,104,0.1)',
                              padding: '2px 6px',
                              borderRadius: '2px',
                            }}
                          >
                            Same amount
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#dc2626',
                              background: 'rgba(220,38,38,0.1)',
                              padding: '2px 6px',
                              borderRadius: '2px',
                            }}
                          >
                            Difference: {fmt(candidate.absDiff)}
                          </span>
                        )}
                      </div>

                      <strong
                        style={{
                          fontSize: '13px',
                          display: 'block',
                          margin: '4px 0 2px',
                          color: 'var(--ink)',
                        }}
                      >
                        {candidate.entity}
                      </strong>

                      <div className="candidate-info-line">
                        <span>Ref: {candidate.ref}</span>
                        <span>·</span>
                        <span>Date: {candidate.date} ({candidate.dateDiffDays === 0 ? 'Same day' : `${candidate.dateDiffDays}d apart`})</span>
                        <span>·</span>
                        <span>Similarity: {candidate.textSimPercent}%</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        {candidate.amt}
                      </strong>

                      {candidate.isSameAmount ? (
                        <button
                          type="button"
                          className="action action-primary"
                          style={{ fontSize: '11px', padding: '6px 14px' }}
                          onClick={() => handleSelectCandidate(candidate)}
                        >
                          Accept match
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="action action-primary"
                          style={{ fontSize: '11px', padding: '6px 14px' }}
                          onClick={() => handleSelectCandidate(candidate)}
                        >
                          Accept and record {fmt(candidate.absDiff)} difference
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Leave Unmatched Fallback Section */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>
                  No suitable option?
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                  Add a note explaining why this transaction remains unmatched.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={unmatchedReasonSelect}
                  onChange={(e) => setUnmatchedReasonSelect(e.target.value)}
                  style={{
                    fontSize: '11px',
                    padding: '6px 10px',
                    border: '1px solid var(--line)',
                    borderRadius: '3px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                >
                  <option value="Missing payment from supplier / customer">
                    Missing payment from supplier / customer
                  </option>
                  <option value="Unrecorded bank charge / fee">
                    Unrecorded bank charge / transaction fee
                  </option>
                  <option value="Timing delay / check in transit">
                    Timing delay / check in transit
                  </option>
                  <option value="Direct debit variation pending inquiry">
                    Direct debit variation pending inquiry
                  </option>
                </select>
                <button
                  type="button"
                  className="action action-secondary"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={handleLeaveUnmatched}
                >
                  Ignore with note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UC-13 Dispute Email Modal */}
      {disputeModalItem && (
        <div
          className="modal-backdrop"
          onClick={() => setDisputeModalItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '620px',
              width: '95%',
              background: 'var(--paper)',
              borderRadius: '6px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '14px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b45309',
                    background: '#fef3c7',
                    padding: '2px 8px',
                    borderRadius: '2px',
                  }}
                >
                  Payment difference
                </span>
                <h3 style={{ margin: '6px 0 0', fontSize: '16px', color: 'var(--ink)' }}>
                  Draft email about the difference
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                  Difference of <strong>{fmt(disputeModalItem.difference)}</strong> between your record{' '}
                  {disputeModalItem.ledgerRef} and bank statement {disputeModalItem.bankRef}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dispute email draft"
                onClick={() => setDisputeModalItem(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Email Form */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  To (Billing & Disputes Dept):
                </label>
                <input
                  type="text"
                  readOnly
                  value={`billing@${disputeModalItem.ledgerEntity.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: '1px solid var(--line)',
                    borderRadius: '3px',
                    background: 'var(--surface)',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Subject Line:
                </label>
                <input
                  type="text"
                  readOnly
                  value={`Discrepancy Notice: Payment Variance of Rs. ${disputeModalItem.difference.toFixed(2)} on Ref ${disputeModalItem.ledgerRef}`}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: '1px solid var(--line)',
                    borderRadius: '3px',
                    background: 'var(--surface)',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Email message:
                </label>
                <textarea
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '11.5px',
                    lineHeight: '1.5',
                    border: '1px solid var(--line)',
                    borderRadius: '3px',
                    background: 'var(--surface)',
                    fontFamily: 'monospace',
                  }}
                  defaultValue={`Dear Billing & Accounts Team,

During our June 2026 reconciliation, we found a payment difference that needs clarification:

• Your record: ${disputeModalItem.ledgerAmt} (Reference: ${disputeModalItem.ledgerRef})
• Bank statement: ${disputeModalItem.bankAmt} (Reference: ${disputeModalItem.bankRef})
• Difference: ${fmt(disputeModalItem.difference)}

Please review this transaction and provide an updated invoice or credit note to explain the ${fmt(disputeModalItem.difference)} difference.

Regards,
${officerName}
Finance Officer, North & Coast Ltd.
FinAgent Automated Treasury Desk`}
                />
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                className="action action-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Discrepancy Notice: Variance of Rs. ${disputeModalItem.difference.toFixed(2)} on ${disputeModalItem.ledgerRef}`
                  );
                  setDisputeEmailCopied(true);
                  setTimeout(() => setDisputeEmailCopied(false), 2000);
                }}
              >
                {disputeEmailCopied ? '✓ Copied to Clipboard' : 'Copy Draft'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Action onClick={() => setDisputeModalItem(null)}>Close</Action>
                <button
                  type="button"
                  className="action action-primary"
                  style={{ background: '#b45309', borderColor: '#b45309', color: '#fff' }}
                  onClick={() => {
                    addAuditLog(
                      'discrepancy',
                      'Dispute email sent',
                      `Dispute email dispatched to billing@${disputeModalItem.ledgerEntity.toLowerCase().replace(/[^a-z0-9]/g, '')}.com for Rs. ${disputeModalItem.difference.toFixed(2)} variance.`
                    );
                    setNotification(
                      `Dispute email dispatched to ${disputeModalItem.ledgerEntity}. Audit trail updated.`
                    );
                    setDisputeModalItem(null);
                  }}
                >
                  Send Dispute Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// HELPER FOR DOWNLOADING REAL CSV FILES
// ----------------------------------------------------
function downloadCSV(type: 'Summary' | 'Profit & loss' | 'Balance sheet' | 'Forecast' | 'recent_invoices') {
  let filename = 'FinAgent_Report.csv';
  let csvContent = '';

  if (type === 'Profit & loss') {
    filename = 'FinAgent_Profit_and_Loss_2026.csv';
    csvContent = `FinAgent - North & Coast Ltd.
Profit & Loss Statement (Income Statement)
Period: 1 January 2026 to 16 June 2026 (YTD)
Currency: PKR (Rs.)

Category,Account Description,YTD 2026,Prior Year (2025),Variance (%)
REVENUE,Product Sales,624500.00,580200.00,+7.6%
REVENUE,SaaS & Subscription Revenue,285000.00,240000.00,+18.8%
REVENUE,Consulting & Implementation Services,75000.00,68400.00,+9.6%
TOTAL REVENUE,,984500.00,888600.00,+10.8%

COST OF GOODS SOLD,Cloud Hosting & Infrastructure,145200.00,138000.00,+5.2%
COST OF GOODS SOLD,Direct Freight & Logistics,112000.00,128400.00,-12.8%
COST OF GOODS SOLD,Merchant & Payment Gateway Fees,55000.00,49200.00,+11.8%
TOTAL COST OF GOODS SOLD,,312200.00,315600.00,-1.1%

GROSS PROFIT,,672300.00,573000.00,+17.3%
GROSS MARGIN (%),,68.3%,64.5%,+3.8%

OPERATING EXPENSES,Salaries & Payroll,265000.00,245000.00,+8.2%
OPERATING EXPENSES,Marketing & Customer Acquisition,84000.00,72000.00,+16.7%
OPERATING EXPENSES,Office & Facility Leases,42500.00,42000.00,+1.2%
OPERATING EXPENSES,Software Tools & Subscriptions,32600.00,28400.00,+14.8%
OPERATING EXPENSES,Depreciation & Amortization,18000.00,16500.00,+9.1%
TOTAL OPERATING EXPENSES,,442100.00,403900.00,+9.5%

OPERATING INCOME (EBITDA),,230200.00,169100.00,+36.1%
TAX & INTEREST,Corporate Tax Provision,43700.00,32100.00,+36.1%
TAX & INTEREST,Interest & Bank Financing Expense,8200.00,9400.00,-12.8%

NET PROFIT,,178300.00,127600.00,+39.7%
NET PROFIT MARGIN (%),,18.1%,14.4%,+3.7%
`;
  } else if (type === 'Balance sheet') {
    filename = 'FinAgent_Balance_Sheet_2026.csv';
    csvContent = `FinAgent - North & Coast Ltd.
Balance Sheet (Statement of Financial Position)
As of: 16 June 2026
Currency: PKR (Rs.)

Section,Line Item,Amount (Rs.),Prior Year (Rs.)
CURRENT ASSETS,Cash and cash equivalents,184290.00,152400.00
CURRENT ASSETS,Accounts receivable (Trade Debtors),142680.00,118900.00
CURRENT ASSETS,Short-term treasury deposits,50000.00,35000.00
CURRENT ASSETS,Inventory & Prepayments,38400.00,42100.00
TOTAL CURRENT ASSETS,,415370.00,348400.00

NON-CURRENT ASSETS,Property Plant & Equipment (Net),210000.00,224000.00
NON-CURRENT ASSETS,Intellectual Property & Software,85000.00,92000.00
TOTAL NON-CURRENT ASSETS,,295000.00,316000.00

TOTAL ASSETS,,710370.00,664400.00

CURRENT LIABILITIES,Accounts payable (Trade Creditors),94820.00,88400.00
CURRENT LIABILITIES,Accrued operating expenses,28400.00,25100.00
CURRENT LIABILITIES,VAT & Corporate Taxes payable,42150.00,34900.00
TOTAL CURRENT LIABILITIES,,165370.00,148400.00

LONG-TERM LIABILITIES,Bank Term Loan (Senior Debt),120000.00,150000.00
LONG-TERM LIABILITIES,Capital lease obligations,45000.00,56000.00
TOTAL LONG-TERM LIABILITIES,,165000.00,206000.00

TOTAL LIABILITIES,,330370.00,354400.00

EQUITY,Share Capital,100000.00,100000.00
EQUITY,Retained Earnings & Reserves,280000.00,210000.00
TOTAL EQUITY,,380000.00,310000.00

TOTAL LIABILITIES & EQUITY,,710370.00,664400.00
BALANCE STATUS,,BALANCED (Assets = Liabilities + Equity),BALANCED
`;
  } else if (type === 'Forecast') {
    filename = 'FinAgent_Financial_Forecast_2026.csv';
    csvContent = `FinAgent - North & Coast Ltd.
Financial Projections and Runway Forecast
Period: Q1 2026 to Q4 2026 (Full Year Outlook)
Currency: PKR (Rs.)

Quarter,Projected Revenue (Rs. ),Projected OPEX (Rs. ),Net Cash Flow (Rs. ),Cash Runway (Months),Probability
Q1 2026 (Actual),472000.00,388000.00,+84000.00,17.2,100%
Q2 2026 (Current),512500.00,412000.00,+100500.00,18.4,95%
Q3 2026 (Projected),558000.00,435000.00,+123000.00,19.8,85%
Q4 2026 (Projected),625000.00,460000.00,+165000.00,22.1,75%

Scenario Analysis,Full Year Revenue (Rs. ),Full Year EBITDA (Rs. ),Year-End Cash (Rs. ),Probability
Base Case,2167500.00,472500.00,320000.00,70%
Bull Case (High Growth),2380000.00,565000.00,395000.00,20%
Conservative Case,1985000.00,390000.00,248000.00,10%

Key Recommendation: Debtor collection cycle must improve by 7 days to maintain runway buffer above 18 months.
`;
  } else if (type === 'recent_invoices') {
    filename = 'FinAgent_Recent_Invoices.csv';
    csvContent = `Supplier,Reference,Due Date,Status,Amount
Northstar Office Co.,INV-1048,Today,Needs review,Rs. 2840.00
Meridian Freight Ltd.,INV-1045,18 Jun,Matched,Rs. 7120.50
Beacon Software,INV-1044,20 Jun,Tax check,Rs. 960.00
Rowan Field Services,INV-1041,22 Jun,Approved,Rs. 4230.00
`;
  } else {
    filename = 'FinAgent_Summary_Report_2026.csv';
    csvContent = `FinAgent - North & Coast Ltd.
Executive Financial Summary Report
Date: 16 June 2026

Metric,Value,Benchmark / Context
Cash Position,Rs. 184290,Up 4.2% (Across 3 accounts)
Net Cash Flow (YTD),Rs. 142680,Trending positive
Invoices Processed Today,24,18 automated (75%)
Pending Approvals,8,3 due today
Auto-Approval Rate,86%,+5.1% improvement this month
Reconciliation Rate,94%,47 records matched
Gross Margin,68.3%,+3.8 points above prior year
Debtor Days,39 days,Target: 32 days
`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------
// REPORTS PAGE (All 4 Tabs + Real CSV Downloads)
// ----------------------------------------------------
function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'Summary' | 'Profit & loss' | 'Balance sheet' | 'Forecast'>('Summary');

  return (
    <div className="page page-enter">
      <section className="opening compact-opening">
        <div>
          <p className="date">Management reporting</p>
          <h2>Performance and forecast</h2>
          <p>Year to date · January to December 2026</p>
        </div>
        <Action
          icon="download"
          kind="primary"
          onClick={() => downloadCSV(activeTab)}
        >
          Export {activeTab} (CSV)
        </Action>
      </section>

      <div className="report-tabs">
        {(['Summary', 'Profit & loss', 'Balance sheet', 'Forecast'] as const).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'Summary' && (
        <section className="report-grid">
          <div className="panel report-chart">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Net cash flow</span>
                <h3>Rs. 142,680 year to date</h3>
              </div>
              <Badge tone="neutral">Trend estimate</Badge>
            </div>
            <div className="bar-chart">
              {[52, 65, 48, 72, 78, 70, 86, 92, 82, 100, 94, 88].map((val, idx) => (
                <div key={idx}>
                  <i style={{ height: `${val}%` }}></i>
                  <small>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][idx]}</small>
                </div>
              ))}
            </div>
          </div>

          <aside className="panel summary-copy">
            <span className="eyebrow">Management summary</span>
            <h3>Margins improved while receivables need attention.</h3>
            <p>
              Gross margin is 3.8 points above last year, supported by lower logistics costs.
              Debtor days increased from 32 to 39, with two accounts responsible for most overdue value.
            </p>
            <Action kind="primary" onClick={() => downloadCSV('Summary')}>
              Download executive brief
            </Action>
          </aside>
        </section>
      )}

      {/* TAB 2: PROFIT & LOSS */}
      {activeTab === 'Profit & loss' && (
        <div className="statement-panel">
          <div className="statement-top-bar">
            <div>
              <span className="eyebrow">Income Statement</span>
              <h3>Profit &amp; Loss Statement (YTD June 2026)</h3>
            </div>
            <Action icon="download" onClick={() => downloadCSV('Profit & loss')}>
              Download P&amp;L (.csv)
            </Action>
          </div>

          <div className="statement-table-wrapper">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Line Item</th>
                  <th>YTD 2026</th>
                  <th>Prior Year (2025)</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="section-header">
                  <td colSpan={4}>Operating Revenue</td>
                </tr>
                <tr>
                  <td>Product Sales</td>
                  <td>Rs. 624,500.00</td>
                  <td>Rs. 580,200.00</td>
                  <td style={{ color: 'var(--green)' }}>+7.6%</td>
                </tr>
                <tr>
                  <td>SaaS &amp; Subscription Revenue</td>
                  <td>Rs. 285,000.00</td>
                  <td>Rs. 240,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+18.8%</td>
                </tr>
                <tr>
                  <td>Consulting &amp; Support Services</td>
                  <td>Rs. 75,000.00</td>
                  <td>Rs. 68,400.00</td>
                  <td style={{ color: 'var(--green)' }}>+9.6%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total Revenue</td>
                  <td>Rs. 984,500.00</td>
                  <td>Rs. 888,600.00</td>
                  <td style={{ color: 'var(--green)' }}>+10.8%</td>
                </tr>

                <tr className="section-header">
                  <td colSpan={4}>Cost of Goods Sold (COGS)</td>
                </tr>
                <tr>
                  <td>Cloud Hosting &amp; Infrastructure</td>
                  <td>Rs. 145,200.00</td>
                  <td>Rs. 138,000.00</td>
                  <td>+5.2%</td>
                </tr>
                <tr>
                  <td>Direct Freight &amp; Logistics</td>
                  <td>Rs. 112,000.00</td>
                  <td>Rs. 128,400.00</td>
                  <td style={{ color: 'var(--green)' }}>-12.8%</td>
                </tr>
                <tr>
                  <td>Merchant &amp; Processing Fees</td>
                  <td>Rs. 55,000.00</td>
                  <td>Rs. 49,200.00</td>
                  <td>+11.8%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total COGS</td>
                  <td>Rs. 312,200.00</td>
                  <td>Rs. 315,600.00</td>
                  <td style={{ color: 'var(--green)' }}>-1.1%</td>
                </tr>

                <tr className="subtotal-row" style={{ background: '#eaf4f7' }}>
                  <td><strong>Gross Profit (Margin: 68.3%)</strong></td>
                  <td><strong>Rs. 672,300.00</strong></td>
                  <td><strong>Rs. 573,000.00</strong></td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>+17.3%</td>
                </tr>

                <tr className="section-header">
                  <td colSpan={4}>Operating Expenses (OPEX)</td>
                </tr>
                <tr>
                  <td>Salaries &amp; Payroll</td>
                  <td>Rs. 265,000.00</td>
                  <td>Rs. 245,000.00</td>
                  <td>+8.2%</td>
                </tr>
                <tr>
                  <td>Marketing &amp; Growth Acquisition</td>
                  <td>Rs. 84,000.00</td>
                  <td>Rs. 72,000.00</td>
                  <td>+16.7%</td>
                </tr>
                <tr>
                  <td>Office &amp; Facilities Leases</td>
                  <td>Rs. 42,500.00</td>
                  <td>Rs. 42,000.00</td>
                  <td>+1.2%</td>
                </tr>
                <tr>
                  <td>Software Tools &amp; SaaS Stack</td>
                  <td>Rs. 32,600.00</td>
                  <td>Rs. 28,400.00</td>
                  <td>+14.8%</td>
                </tr>
                <tr>
                  <td>Depreciation &amp; Amortization</td>
                  <td>Rs. 18,000.00</td>
                  <td>Rs. 16,500.00</td>
                  <td>+9.1%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total Operating Expenses</td>
                  <td>Rs. 442,100.00</td>
                  <td>Rs. 403,900.00</td>
                  <td>+9.5%</td>
                </tr>

                <tr className="subtotal-row">
                  <td>Operating Profit (EBITDA)</td>
                  <td>Rs. 230,200.00</td>
                  <td>Rs. 169,100.00</td>
                  <td style={{ color: 'var(--green)' }}>+36.1%</td>
                </tr>
                <tr>
                  <td>Corporate Tax Provision &amp; Interest</td>
                  <td>-Rs. 51,900.00</td>
                  <td>-Rs. 41,500.00</td>
                  <td>+25.1%</td>
                </tr>

                <tr className="total-row">
                  <td>Net Income (Profit Margin: 18.1%)</td>
                  <td>Rs. 178,300.00</td>
                  <td>Rs. 127,600.00</td>
                  <td style={{ color: 'var(--green)' }}>+39.7%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE SHEET */}
      {activeTab === 'Balance sheet' && (
        <div className="statement-panel">
          <div className="statement-top-bar">
            <div>
              <span className="eyebrow">Statement of Financial Position</span>
              <h3>Balance Sheet (As of 16 June 2026)</h3>
            </div>
            <Action icon="download" onClick={() => downloadCSV('Balance sheet')}>
              Download Balance Sheet (.csv)
            </Action>
          </div>

          <div className="statement-table-wrapper">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Current Balance</th>
                  <th>Prior Year End</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="section-header">
                  <td colSpan={4}>Current Assets</td>
                </tr>
                <tr>
                  <td>Cash and Cash Equivalents (Barclays + Stripe)</td>
                  <td>Rs. 184,290.00</td>
                  <td>Rs. 152,400.00</td>
                  <td style={{ color: 'var(--green)' }}>+20.9%</td>
                </tr>
                <tr>
                  <td>Accounts Receivable (Trade Debtors)</td>
                  <td>Rs. 142,680.00</td>
                  <td>Rs. 118,900.00</td>
                  <td>+20.0%</td>
                </tr>
                <tr>
                  <td>Short-Term Liquid Deposits</td>
                  <td>Rs. 50,000.00</td>
                  <td>Rs. 35,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+42.9%</td>
                </tr>
                <tr>
                  <td>Inventory &amp; Prepayments</td>
                  <td>Rs. 38,400.00</td>
                  <td>Rs. 42,100.00</td>
                  <td>-8.8%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total Current Assets</td>
                  <td>Rs. 415,370.00</td>
                  <td>Rs. 348,400.00</td>
                  <td style={{ color: 'var(--green)' }}>+19.2%</td>
                </tr>

                <tr className="section-header">
                  <td colSpan={4}>Non-Current Assets</td>
                </tr>
                <tr>
                  <td>Property, Plant &amp; Equipment (Net)</td>
                  <td>Rs. 210,000.00</td>
                  <td>Rs. 224,000.00</td>
                  <td>-6.3%</td>
                </tr>
                <tr>
                  <td>Intellectual Property &amp; Technology</td>
                  <td>Rs. 85,000.00</td>
                  <td>Rs. 92,000.00</td>
                  <td>-7.6%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total Non-Current Assets</td>
                  <td>Rs. 295,000.00</td>
                  <td>Rs. 316,000.00</td>
                  <td>-6.6%</td>
                </tr>

                <tr className="total-row">
                  <td>TOTAL ASSETS</td>
                  <td>Rs. 710,370.00</td>
                  <td>Rs. 664,400.00</td>
                  <td style={{ color: 'var(--green)' }}>+6.9%</td>
                </tr>

                <tr className="section-header">
                  <td colSpan={4}>Current Liabilities</td>
                </tr>
                <tr>
                  <td>Accounts Payable (Trade Creditors)</td>
                  <td>Rs. 94,820.00</td>
                  <td>Rs. 88,400.00</td>
                  <td>+7.3%</td>
                </tr>
                <tr>
                  <td>Accrued Operating Expenses</td>
                  <td>Rs. 28,400.00</td>
                  <td>Rs. 25,100.00</td>
                  <td>+13.1%</td>
                </tr>
                <tr>
                  <td>VAT &amp; Corporate Taxes Payable</td>
                  <td>Rs. 42,150.00</td>
                  <td>Rs. 34,900.00</td>
                  <td>+20.8%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total Current Liabilities</td>
                  <td>Rs. 165,370.00</td>
                  <td>Rs. 148,400.00</td>
                  <td>+11.4%</td>
                </tr>

                <tr className="section-header">
                  <td colSpan={4}>Long-Term Liabilities</td>
                </tr>
                <tr>
                  <td>Senior Term Bank Loan</td>
                  <td>Rs. 120,000.00</td>
                  <td>Rs. 150,000.00</td>
                  <td style={{ color: 'var(--green)' }}>-20.0%</td>
                </tr>
                <tr>
                  <td>Capital Lease Obligations</td>
                  <td>Rs. 45,000.00</td>
                  <td>Rs. 56,000.00</td>
                  <td style={{ color: 'var(--green)' }}>-19.6%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total Long-Term Liabilities</td>
                  <td>Rs. 165,000.00</td>
                  <td>Rs. 206,000.00</td>
                  <td style={{ color: 'var(--green)' }}>-19.9%</td>
                </tr>

                <tr className="section-header">
                  <td colSpan={4}>Shareholders&rsquo; Equity</td>
                </tr>
                <tr>
                  <td>Issued Share Capital</td>
                  <td>Rs. 100,000.00</td>
                  <td>Rs. 100,000.00</td>
                  <td>0.0%</td>
                </tr>
                <tr>
                  <td>Retained Earnings</td>
                  <td>Rs. 280,000.00</td>
                  <td>Rs. 210,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+33.3%</td>
                </tr>
                <tr className="subtotal-row">
                  <td>Total Shareholders&rsquo; Equity</td>
                  <td>Rs. 380,000.00</td>
                  <td>Rs. 310,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+22.6%</td>
                </tr>

                <tr className="total-row">
                  <td>TOTAL LIABILITIES &amp; EQUITY</td>
                  <td>Rs. 710,370.00</td>
                  <td>Rs. 664,400.00</td>
                  <td style={{ color: 'var(--green)' }}>BALANCED ✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FORECAST */}
      {activeTab === 'Forecast' && (
        <div className="statement-panel">
          <div className="statement-top-bar">
            <div>
              <span className="eyebrow">Predictive Analytics</span>
              <h3>Runway &amp; Financial Projections (2026 – 2027)</h3>
            </div>
            <Action icon="download" onClick={() => downloadCSV('Forecast')}>
              Download Projections (.csv)
            </Action>
          </div>

          <div className="forecast-grid">
            <div className="forecast-card">
              <span className="eyebrow">Cash Runway</span>
              <strong>18.4 mos</strong>
              <h4>Safe Buffer</h4>
              <p>Based on current operating burn rate and projected collection cycles.</p>
            </div>
            <div className="forecast-card">
              <span className="eyebrow">Net Cash Flow Target</span>
              <strong style={{ color: 'var(--green)' }}>+Rs. 265,000</strong>
              <h4>Full Year Outlook</h4>
              <p>Weighted 78% probability across conservative order backlog pipelines.</p>
            </div>
            <div className="forecast-card">
              <span className="eyebrow">Annual YoY Growth</span>
              <strong style={{ color: 'var(--blue)' }}>+14.2%</strong>
              <h4>Topline Revenue</h4>
              <p>Supported by new subscription contracts and expansion in enterprise accounts.</p>
            </div>
          </div>

          <div className="statement-table-wrapper">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Quarter</th>
                  <th>Projected Revenue</th>
                  <th>Projected OPEX</th>
                  <th>Net Cash Flow</th>
                  <th>Runway</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Q1 2026 (Actual)</td>
                  <td>Rs. 472,000.00</td>
                  <td>Rs. 388,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+Rs. 84,000.00</td>
                  <td>17.2 mos</td>
                  <td><Badge tone="success">100%</Badge></td>
                </tr>
                <tr>
                  <td>Q2 2026 (Current Q)</td>
                  <td>Rs. 512,500.00</td>
                  <td>Rs. 412,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+Rs. 100,500.00</td>
                  <td>18.4 mos</td>
                  <td><Badge tone="success">95%</Badge></td>
                </tr>
                <tr>
                  <td>Q3 2026 (Projected)</td>
                  <td>Rs. 558,000.00</td>
                  <td>Rs. 435,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+Rs. 123,000.00</td>
                  <td>19.8 mos</td>
                  <td><Badge tone="info">85%</Badge></td>
                </tr>
                <tr>
                  <td>Q4 2026 (Projected)</td>
                  <td>Rs. 625,000.00</td>
                  <td>Rs. 460,000.00</td>
                  <td style={{ color: 'var(--green)' }}>+Rs. 165,000.00</td>
                  <td>22.1 mos</td>
                  <td><Badge tone="neutral">75%</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// MAIN FINANCE OFFICER DASHBOARD SHELL
// ----------------------------------------------------
export default function FinanceOfficerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const title = useMemo(() => {
    return NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Overview';
  }, [activeTab]);

  const handleConfirmLogout = () => {
    localStorage.removeItem('finagent_token');
    localStorage.removeItem('finagent_role');
    localStorage.removeItem('finagent_name');
    localStorage.removeItem('finagent_is_primary');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <Sidebar
        active={activeTab}
        onChange={setActiveTab}
      />
      <main className="main">
        <Topbar
          title={title}
          onNotifications={() => setNotificationsOpen(!notificationsOpen)}
          onNavigate={setActiveTab}
          onLogout={() => setShowLogoutModal(true)}
        />

        {notificationsOpen && (
          <div className="notifications">
            <div className="panel-heading">
              <h3>Notifications</h3>
              <Badge tone="info">3 new</Badge>
            </div>
            <p>
              <strong>Northstar Office Co.</strong>
              <br />
              Payment review is due by 4:00 PM.
            </p>
            <p>
              <strong>Bank feed connected</strong>
              <br />
              47 records were matched successfully.
            </p>
            <p>
              <strong>VAT deadline</strong>
              <br />
              Return is due in 9 days.
            </p>
          </div>
        )}

        {activeTab === 'dashboard' && <OverviewPage goTo={setActiveTab} />}
        {activeTab === 'invoice' && <LiveInvoice />}
        {activeTab === 'review' && <LiveReview />}
        {activeTab === 'reconcile' && <LiveReconcile />}
        {activeTab === 'reports' && <LiveReports />}
      </main>

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <Badge tone="neutral">Sign Out</Badge>
                <h3>Confirm Logout</h3>
                <small style={{ color: 'var(--muted)' }}>
                  Finance Officer: Amara Mensah
                </small>
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
              <Action onClick={() => setShowLogoutModal(false)}>
                Cancel
              </Action>
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
