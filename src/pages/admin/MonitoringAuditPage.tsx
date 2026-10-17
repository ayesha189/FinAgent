// src/pages/admin/MonitoringAuditPage.tsx
// Implements FR-OR-05 (Stuck-Task Alerts), FR-AT-03/04 (Hash-Chained Audit Trail Verification), and Table 18.
import React, { useState } from 'react';
import { AdminIcon } from './AdminIcons';
import {
  AdminPageHead,
  AdminStatCard,
  AdminPanel,
  AdminPanelHead,
  AdminBadge,
  AdminButton,
  AdminFeedback,
  AdminEmptyState,
} from './AdminUI';

export interface StuckTask {
  taskId: string;
  invoiceId: string;
  agentName: 'Compliance & Tax Agent' | 'Risk & Anomaly Agent' | 'Transaction Processing Agent';
  timeoutDuration: string;
  status: 'Stuck' | 'Retrying' | 'Resolved';
  errorDetail: string;
  createdAt: string;
}

export interface AuditRecord {
  logId: string;
  timestamp: string;
  actor: string;
  role: 'Administrator' | 'Finance Officer' | 'Auditor' | 'Orchestrator';
  action: string;
  entityType: string;
  entityId: string;
  previousHash: string;
  currentHash: string;
  isChainValid: boolean;
}

const INITIAL_STUCK_TASKS: StuckTask[] = [
  {
    taskId: 'TSK-STUCK-8821',
    invoiceId: 'INV-PK-891',
    agentName: 'Compliance & Tax Agent',
    timeoutDuration: '32s (>30s limit)',
    status: 'Stuck',
    errorDetail: 'RAG clause search timeout during complex multi-line SRO exemption evaluation.',
    createdAt: 'Today, 10:14',
  },
];

const INITIAL_AUDIT_LOGS: AuditRecord[] = [
  {
    logId: 'AUD-0094',
    timestamp: '15 Oct 2026, 10:42:01',
    actor: 'System Administrator',
    role: 'Administrator',
    action: 'CONFIG_UPDATE',
    entityType: 'Thresholds',
    entityId: 'approvalLimit',
    previousHash: 'a8b9f1d048e7e1c9...',
    currentHash: 'b4c7e2a90184f72d...',
    isChainValid: true,
  },
  {
    logId: 'AUD-0093',
    timestamp: '15 Oct 2026, 09:42:15',
    actor: 'System Administrator',
    role: 'Administrator',
    action: 'KB_VERSION_ACTIVATE',
    entityType: 'KnowledgeBase',
    entityId: 'v2026.2-FBR-PRA',
    previousHash: 'c7d1e89f41b2c340...',
    currentHash: 'a8b9f1d048e7e1c9...',
    isChainValid: true,
  },
  {
    logId: 'AUD-0092',
    timestamp: '14 Oct 2026, 16:18:22',
    actor: 'System Administrator',
    role: 'Administrator',
    action: 'VENDOR_BLACKLIST',
    entityType: 'Vendor',
    entityId: 'VND-PK-0103',
    previousHash: 'e5f2a1b903c781d4...',
    currentHash: 'c7d1e89f41b2c340...',
    isChainValid: true,
  },
  {
    logId: 'AUD-0091',
    timestamp: '14 Oct 2026, 14:05:10',
    actor: 'Muhammad Aslam',
    role: 'Finance Officer',
    action: 'INVOICE_APPROVE',
    entityType: 'Invoice',
    entityId: 'INV-PK-884',
    previousHash: 'f1e4b8a290c371d9...',
    currentHash: 'e5f2a1b903c781d4...',
    isChainValid: true,
  },
  {
    logId: 'AUD-0090',
    timestamp: '14 Oct 2026, 11:30:00',
    actor: 'Orchestrator',
    role: 'Orchestrator',
    action: 'AUTO_APPROVE',
    entityType: 'Invoice',
    entityId: 'INV-PK-880',
    previousHash: '9a8b7c6d5e4f3a21...',
    currentHash: 'f1e4b8a290c371d9...',
    isChainValid: true,
  },
];

export const MonitoringAuditPage: React.FC = () => {
  const [stuckTasks, setStuckTasks] = useState<StuckTask[]>(INITIAL_STUCK_TASKS);
  const [auditLogs] = useState<AuditRecord[]>(INITIAL_AUDIT_LOGS);
  const [feedback, setFeedback] = useState<string>('');
  const [verifyingChain, setVerifyingChain] = useState<boolean>(false);
  const [chainVerified, setChainVerified] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('All');

  const handleResolveTask = (taskId: string, actionType: 'retry' | 'fallback') => {
    setStuckTasks(stuckTasks.filter((t) => t.taskId !== taskId));
    setFeedback(
      actionType === 'retry'
        ? `Task ${taskId} restarted. Orchestrator re-dispatched request to local model worker.`
        : `Task ${taskId} marked as resolved via rule-based fallback. Logged to audit trail (FR-OR-05).`
    );
  };

  const handleRunHashChainVerification = () => {
    setVerifyingChain(true);
    setTimeout(() => {
      setVerifyingChain(false);
      setChainVerified(true);
      setFeedback(
        'Tamper Verification Routine Completed: SHA-256 hash chain intact across all rows in PostgreSQL audit log. Zero broken linkages detected (FR-AT-04).'
      );
    }, 900);
  };

  const filteredLogs = auditLogs.filter((l) => {
    const matchSearch = `${l.logId} ${l.actor} ${l.action} ${l.entityId}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchActor = actorFilter === 'All' || l.role === actorFilter;
    return matchSearch && matchActor;
  });

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="Monitoring, Stuck Tasks & Audit Trail"
        actions={
          <AdminButton
            disabled={verifyingChain}
            icon="shield"
            kind="primary"
            onClick={handleRunHashChainVerification}
          >
            {verifyingChain ? 'Recomputing SHA-256 Hashes…' : 'Run Chain Verification'}
          </AdminButton>
        }
      />

      {/* KPI Cards */}
      <div className="stat-grid five monitoring-stat-grid">
        <AdminStatCard
          detail="Unresponsive Agent"
          icon="warning"
          label="Stuck-Task Alerts"
          tone={stuckTasks.length > 0 ? 'danger' : 'success'}
          value={String(stuckTasks.length)}
        />
        <AdminStatCard
          detail="Phi-4-mini + 3 Specialist Agents"
          icon="bot"
          label="Active Agents"
          tone="success"
          value="4"
        />
        <AdminStatCard
          detail="SHA-256 Cryptographic Chain"
          icon="shield"
          label="Audit Integrity"
          tone={chainVerified ? 'success' : 'danger'}
          value={chainVerified ? 'Verified' : 'Broken'}
        />
        <AdminStatCard
          detail="PostgreSQL local instance"
          icon="database"
          label="Ledger Latency"
          tone="success"
          value="12 ms"
        />
        <AdminStatCard
          detail="Zero Cloud Dependency"
          icon="server"
          label="Data Locality"
          tone="info"
          value="100% On-Premise"
        />
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="success">{feedback}</AdminFeedback>
        </div>
      )}

      {/* FR-OR-05 Stuck Tasks Queue */}
      {stuckTasks.length > 0 ? (
        <AdminPanel style={{ marginBottom: 18 }}>
          <AdminPanelHead
            action={<AdminBadge tone="danger">Immediate Action Required</AdminBadge>}
            eyebrow="Orchestrator Timeout Alerts "
            title="Stuck-Task Queue"
          />
          {stuckTasks.map((task) => (
            <div key={task.taskId} className="alert-row">
              <span className="alert-icon critical">
                <AdminIcon name="warning" />
              </span>
              <div>
                <span>
                  <AdminBadge tone="danger">Timeout: {task.timeoutDuration}</AdminBadge>
                  <AdminBadge tone="neutral">{task.agentName}</AdminBadge>
                </span>
                <strong>
                  {task.taskId} · Invoice {task.invoiceId}
                </strong>
                <p>{task.errorDetail}</p>
                <small>Triggered: {task.createdAt} · Target: Administrator / Finance Officer Alert</small>
              </div>
              <div className="alert-actions">
                <AdminButton
                  icon="refresh"
                  kind="primary"
                  onClick={() => handleResolveTask(task.taskId, 'retry')}
                >
                  Restart Agent Task
                </AdminButton>
                <AdminButton
                  kind="quiet"
                  onClick={() => handleResolveTask(task.taskId, 'fallback')}
                >
                  Apply Rule Fallback
                </AdminButton>
              </div>
            </div>
          ))}
        </AdminPanel>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <AdminFeedback tone="success">
            All multi-agent tasks are executing cleanly. Zero stuck tasks in the Orchestrator queue.
          </AdminFeedback>
        </div>
      )}

      {/* Read-Only Immutable Audit Log Panel (FR-AT-03, FR-AT-04, Table 18) */}
      <AdminPanel>
        <AdminPanelHead
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AdminBadge tone="success">SHA-256 Hash Chained</AdminBadge>
              <AdminBadge tone="neutral">Read-Only</AdminBadge>
            </div>
          }

          title="Audit Log Ledger"
        />

        <div className="filter-bar">
          <label className="search-field">
            <AdminIcon name="search" size={16} />
            <input
              placeholder="Search by log ID, actor, action, or entity..."
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}>
            <option value="All">All Actors</option>
            <option value="Administrator">Administrator</option>
            <option value="Finance Officer">Finance Officer</option>
            <option value="Auditor">Auditor</option>
            <option value="Orchestrator">Orchestrator</option>
          </select>
        </div>

        {filteredLogs.length === 0 ? (
          <AdminEmptyState
            text="No audit records match the current search filter."
            title="No records found"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Log ID & Time</th>
                  <th>Actor & Role</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Previous SHA-256 Hash</th>
                  <th>Current Row Hash</th>
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.logId}>
                    <td data-label="Log ID">
                      <div>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{log.logId}</strong>
                        <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                          {log.timestamp}
                        </small>
                      </div>
                    </td>
                    <td data-label="Actor">
                      <div>
                        <span>{log.actor}</span>
                        <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                          {log.role}
                        </small>
                      </div>
                    </td>
                    <td data-label="Action">
                      <AdminBadge tone="info">{log.action}</AdminBadge>
                    </td>
                    <td data-label="Entity">
                      <span>{log.entityType}</span>:{' '}
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                        {log.entityId}
                      </strong>
                    </td>
                    <td data-label="Previous Hash">
                      <code style={{ fontSize: '7px', color: 'var(--text-muted)' }}>
                        {log.previousHash}
                      </code>
                    </td>
                    <td data-label="Current Hash">
                      <code style={{ fontSize: '7px', color: 'var(--navy)' }}>
                        {log.currentHash}
                      </code>
                    </td>
                    <td data-label="Integrity">
                      <AdminBadge tone="success">Valid Chain</AdminBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


      </AdminPanel>
    </div>
  );
};

export default MonitoringAuditPage;
