// src/pages/admin/AdminOverviewPage.tsx
// Implements Administrator Overview (SRS Table 6, Table 18, FR-OR-05, FR-UM-04, UC-7).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminIcon } from './AdminIcons';
import {
  AdminPageHead,
  AdminButton,
  AdminStatCard,
  AdminPanel,
  AdminPanelHead,
  AdminServiceRow,
  AdminBarChart,
  AdminBadge,
  AdminFeedback,
} from './AdminUI';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

const getToken = () =>
  localStorage.getItem('finagent_token') ?? sessionStorage.getItem('finagent_token') ?? '';

async function getJson(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

interface UserRow { id: number; role: string; status: string }
interface VendorRow { id: number; blacklisted: boolean }
interface PendingRow { user_id: number; name: string; email: string; role: string; created_at: string }

const ROLE_LABEL: Record<string, string> = {
  finance_officer: 'Finance Officer',
  auditor: 'Auditor',
  administrator: 'Administrator',
};

export interface AdminOverviewPageProps {
  onNavigate?: (path: string) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ onNavigate }) => {
  const routerNavigate = useNavigate();
  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      routerNavigate(path);
    }
  };

  const [activeTab, setActiveTab] = useState<'alerts' | 'actions'>('alerts');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    try {
      const [u, v, p] = await Promise.all([
        getJson('/admin/users'),
        getJson('/admin/vendors'),
        getJson('/admin/registrations'),
      ]);
      setUsers(u);
      setVendors(v);
      setPending(p);
      setLoadError('');
    } catch {
      setLoadError('Could not load overview data. Is the backend running, and are you signed in as an administrator?');
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeUsers = users.filter((u) => u.status === 'active');
  const roleCount = (r: string) => activeUsers.filter((u) => u.role === r).length;
  const blacklistedCount = vendors.filter((v) => v.blacklisted).length;

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="Admin Overview"
        actions={
          <AdminButton icon="refresh" onClick={() => void loadData()}>
            Refresh
          </AdminButton>
        }
      />

      {loadError && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="error">{loadError}</AdminFeedback>
        </div>
      )}

      {/* 5 KPI Cards Strictly Relevant to Admin */}
      <div className="stat-grid five">
        <AdminStatCard
          detail={`${roleCount('finance_officer')} FO · ${roleCount('auditor')} Auditor · ${roleCount('administrator')} Admin`}
          icon="users"
          label="Total Users"
          onClick={() => navigate('/admin/users')}
          value={String(activeUsers.length)}
        />
        <AdminStatCard
          detail="Requires admin review"
          icon="clock"
          label="Pending Registrations"
          onClick={() => navigate('/admin/users')}
          tone="warning"
          value={String(pending.length)}
        />
        <AdminStatCard
          detail={`${blacklistedCount} blacklisted entities`}
          icon="shield"
          label="Managed Vendors"
          onClick={() => navigate('/admin/vendors')}
          tone="info"
          value={String(vendors.length)}
        />
        <AdminStatCard
          detail="FR-OR-05: 1 timeout alert"
          icon="warning"
          label="Stuck-Task Alerts"
          onClick={() => navigate('/admin/monitoring-audit')}
          tone="danger"
          value="1"
        />
        <AdminStatCard
          detail="FBR & PRA (Oct 2026)"
          icon="tax"
          label="Tax Knowledge Base"
          onClick={() => navigate('/admin/tax-kb')}
          tone="success"
          value="v2026.2"
        />
      </div>

      {/* Multi-Agent System Health & Quick Actions */}
      <div className="overview-grid">
        {/* Multi-Agent Orchestrator Health */}
        <AdminPanel>
          <AdminPanelHead
            action={
              <AdminButton
                icon="monitor"
                kind="quiet"
                onClick={() => navigate('/admin/monitoring-audit')}
              >
                Full Audit
              </AdminButton>
            }
            eyebrow="Local Execution Engine"
            title="Multi-Agent System & Local Services"
          />
          <AdminServiceRow
            icon="bot"
            metric="Active"
            name="FinAgent Orchestrator"
          />
          <AdminServiceRow
            icon="server"
            metric="Healthy"
            name="Transaction Processing Agent"
          />
          <AdminServiceRow
            icon="policy"
            metric="Healthy"
            name="Compliance & Tax Agent"
          />
          <AdminServiceRow
            icon="shield"
            metric="Tuned"
            name="Risk & Anomaly Agent"
          />
          <AdminServiceRow
            icon="database"
            metric="12 ms"
            name="finagent"
          />
        </AdminPanel>

        {/* Quick Actions Directly Aligned with Admin Use Cases (UC-7) */}
        <AdminPanel className="quick-panel">
          <AdminPanelHead eyebrow="System Settings" title="Administrative actions" />
          {[
            [
              'User Accounts & Roles',
              'Create, assign roles (Finance Officer, Auditor, Admin) or block accounts.',
              'users',
              '/admin/users',
            ],
            [
              'Vendor & Blacklist Registry',
              'Maintain vendor directory, verify NTNs, and enforce blacklisted entities.',
              'shield',
              '/admin/vendors',
            ],
            [
              'Approval & Risk Thresholds',
              'Configure high-value PKR approval limit and anomaly score cutoffs.',
              'policy',
              '/admin/policies-ai',
            ],
            [
              'Update Tax Knowledge Base',
              'Upload new FBR SROs and PRA notifications with versioning.',
              'tax',
              '/admin/tax-kb',
            ],
            [
              'Stuck Tasks & Audit Chain',
              'Resolve Orchestrator timeouts and verify SHA-256 hash-chain integrity.',
              'monitor',
              '/admin/monitoring-audit',
            ],
            [
              'Statutory Filing Deadlines',
              'Monitor FBR IRIS and PRA monthly withholding & sales tax calendars.',
              'calendar',
              '/admin/deadlines',
            ],
          ].map(([title, desc, icon, path]) => (
            <button
              key={title}
              className="quick-link"
              onClick={() => navigate(path)}
              type="button"
            >
              <span>
                <AdminIcon name={icon} />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
              <AdminIcon name="arrow" size={15} />
            </button>
          ))}
        </AdminPanel>
      </div>

      {/* Transaction & Orchestrator Metrics */}
      <AdminPanel className="usage-panel">
        <AdminPanelHead
          eyebrow="Orchestrator Arbitration Volume"
          title="Transaction & Agent Arbitration Metrics"
        />
        <div className="usage-layout">
          <div className="usage-metrics">
            <div>
              <span>Processed Invoices</span>
              <strong>18,420</strong>
              <small>Pakistani Rupees (Rs.)</small>
            </div>
            <div>
              <span>Auto-Approved</span>
              <strong>16,804</strong>
              <small>91.2% Low Risk & Compliant</small>
            </div>
            <div>
              <span>Human Gate Routed</span>
              <strong>1,616</strong>
              <small>High value, flag or uncertain</small>
            </div>
            <div>
              <span>Avg. OCR Confidence</span>
              <strong>94.8%</strong>
              <small>Target: &ge;90%</small>
            </div>
          </div>
          <div className="chart-wrap">
            <div className="chart-title">
              <strong>Orchestrator Transaction Throughput</strong>
              <span>Daily Volume (Punjab PRA Jurisdiction)</span>
            </div>
            <AdminBarChart />
          </div>
        </div>
      </AdminPanel>

      {/* Orchestrator Alerts & Pending Administrator Actions */}
      <div className="overview-grid bottom-grid">
        {/* Stuck Tasks & Priority Alerts (FR-OR-05, Table 14) */}
        <AdminPanel>
          <AdminPanelHead
            action={
              <div className="mini-tabs">
                <button
                  className={activeTab === 'alerts' ? 'active' : ''}
                  onClick={() => setActiveTab('alerts')}
                  type="button"
                >
                  Stuck Tasks (1)
                </button>
                <button
                  className={activeTab === 'actions' ? 'active' : ''}
                  onClick={() => setActiveTab('actions')}
                  type="button"
                >
                  {`Registrations (${pending.length})`}
                </button>
              </div>
            }
            eyebrow="Orchestrator & Access Control"
            title="Attention Required"
          />
          {activeTab === 'alerts' ? (
            <>
              <div className="action-row">
                <span className="row-symbol warning">
                  <AdminIcon name="warning" />
                </span>
                <div>
                  <strong>FR-OR-05 Stuck Task: Compliance Agent Timeout</strong>
                  <p>Invoice #INV-PK-891 · RAG clause search exceeded 30s timeout · Task marked stuck.</p>
                </div>
                <AdminBadge tone="danger">Action Required</AdminBadge>
              </div>
              <button
                className="panel-link"
                onClick={() => navigate('/admin/monitoring-audit')}
                type="button"
              >
                Inspect stuck tasks in Monitoring & Audit
                <AdminIcon name="arrow" size={14} />
              </button>
            </>
          ) : (
            <>
              {pending.length === 0 && (
                <div className="action-row">
                  <div>
                    <strong>No pending registrations</strong>
                    <p>New requests will appear here.</p>
                  </div>
                </div>
              )}
              {pending.slice(0, 5).map((p) => (
                <div key={p.user_id} className="action-row">
                  <span className="row-symbol">
                    <AdminIcon name="user" />
                  </span>
                  <div>
                    <strong>{ROLE_LABEL[p.role] ?? p.role} registration request</strong>
                    <p>{p.name} · {p.email} · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <AdminBadge tone="warning">Pending</AdminBadge>
                </div>
              ))}
              <button
                className="panel-link"
                onClick={() => navigate('/admin/users')}
                type="button"
              >
                Review all pending registrations
                <AdminIcon name="arrow" size={14} />
              </button>
            </>
          )}
        </AdminPanel>

        {/* Administrative Audit Log Preview */}
        <AdminPanel>
          <AdminPanelHead
            action={
              <AdminButton
                icon="monitor"
                kind="quiet"
                onClick={() => navigate('/admin/monitoring-audit')}
              >
                Verify Hash Chain
              </AdminButton>
            }
            eyebrow="Audit Trail"
            title="Recent administrative actions"
          />
          {[
            ['Tax Knowledge Base v2026.2 activated', 'System Administrator', 'Today, 09:42', 'tax'],
            ['Vendor "Al-Madina Chemical Traders" blacklisted', 'System Administrator', 'Yesterday, 16:18', 'shield'],
            ['High-value threshold adjusted to Rs. 500,000', 'System Administrator', '12 Oct, 11:03', 'policy'],
            ['Finance Officer account approved (Bilal Ahmed)', 'System Administrator', '11 Oct, 14:20', 'users'],
          ].map(([title, actor, time, icon]) => (
            <div key={title} className="activity-row">
              <span>
                <AdminIcon name={icon} size={15} />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{actor}</p>
              </div>
              <small>{time}</small>
            </div>
          ))}
        </AdminPanel>
      </div>
    </div>
  );
};

export default AdminOverviewPage;