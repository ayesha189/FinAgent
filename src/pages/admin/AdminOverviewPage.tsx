// src/pages/admin/AdminOverviewPage.tsx
// Implements Administrator Overview (SRS Table 6, Table 18, FR-OR-05, FR-UM-04, UC-7).
import React, { useState } from 'react';
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
} from './AdminUI';

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

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="Admin Overview"
        actions={
          <AdminButton icon="refresh" onClick={() => window.location.reload()}>
            Refresh
          </AdminButton>
        }
      />

      {/* 5 KPI Cards Strictly Relevant to Admin */}
      <div className="stat-grid five">
        <AdminStatCard
          detail="16 FO · 5 Auditor · 3 Admin"
          icon="users"
          label="Total Users"
          onClick={() => navigate('/admin/users')}
          value="24"
        />
        <AdminStatCard
          detail="Requires admin review"
          icon="clock"
          label="Pending Registrations"
          onClick={() => navigate('/admin/users')}
          tone="warning"
          value="2"
        />
        <AdminStatCard
          detail="2 blacklisted entities"
          icon="shield"
          label="Managed Vendors"
          onClick={() => navigate('/admin/vendors')}
          tone="info"
          value="5"
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
            name="PostgreSQL Audit Ledger"
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
                  Registrations (2)
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
              <div className="action-row">
                <span className="row-symbol">
                  <AdminIcon name="user" />
                </span>
                <div>
                  <strong>Finance Officer registration request</strong>
                  <p>Tariq Mehmood · tariq.m@enterprise.pk · Applied 2 hours ago</p>
                </div>
                <AdminBadge tone="warning">Pending</AdminBadge>
              </div>
              <div className="action-row">
                <span className="row-symbol">
                  <AdminIcon name="user" />
                </span>
                <div>
                  <strong>Auditor registration request</strong>
                  <p>Amina Khan · amina.k@audit-services.pk · Applied yesterday</p>
                </div>
                <AdminBadge tone="warning">Pending</AdminBadge>
              </div>
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
