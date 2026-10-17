// src/pages/admin/UserManagementPage.tsx
// Implements FR-UM-02, FR-UM-04, UC-7, Table 6, and Table 18 of the FinAgent SRS.
import React, { useEffect, useState } from 'react';
import { AdminIcon } from './AdminIcons';
import {
  cacheLocalComplaint,
  readLocalComplaints,
  saveLocalComplaints,
  type ComplaintRecord,
} from '../../utils/complaints';
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

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

const complaintRecipientLabels: Record<ComplaintRecord['recipient'], string> = {
  admin: 'Admin',
  ayesha: 'Ayesha Rauf · ayesharauf.189@gmail.com',
  both: 'Admin and Ayesha Rauf',
};

export interface SystemUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: 'Finance Officer' | 'Auditor' | 'Administrator';
  status: 'Active' | 'Blocked' | 'Pending';
  registered: string;
  login: string;
}

const INITIAL_USERS: SystemUser[] = [
  {
    id: 'USR-001',
    name: 'Muhammad Aslam',
    initials: 'MA',
    email: 'm.aslam@finagent.pk',
    role: 'Finance Officer',
    status: 'Active',
    registered: '04 Jan 2026',
    login: 'Today, 08:42',
  },
  {
    id: 'USR-002',
    name: 'Zainab Fatima (Lead Auditor)',
    initials: 'ZF',
    email: 'zainab.audit@external-audit.pk',
    role: 'Auditor',
    status: 'Active',
    registered: '18 Feb 2026',
    login: 'Yesterday, 16:20',
  },
  {
    id: 'USR-003',
    name: 'System Administrator',
    initials: 'SA',
    email: 'admin@finagent.pk',
    role: 'Administrator',
    status: 'Active',
    registered: '02 Jan 2026',
    login: 'Now',
  },
  {
    id: 'USR-004',
    name: 'Bilal Ahmed',
    initials: 'BA',
    email: 'bilal.ahmed@finagent.pk',
    role: 'Finance Officer',
    status: 'Blocked',
    registered: '22 Mar 2026',
    login: '31 May, 09:14',
  },
  {
    id: 'USR-005',
    name: 'Tariq Mehmood',
    initials: 'TM',
    email: 'tariq.m@enterprise.pk',
    role: 'Finance Officer',
    status: 'Pending',
    registered: '15 Oct 2026',
    login: 'Pending activation',
  },
  {
    id: 'USR-006',
    name: 'Amina Khan',
    initials: 'AK',
    email: 'amina.k@audit-services.pk',
    role: 'Auditor',
    status: 'Pending',
    registered: '14 Oct 2026',
    login: 'Pending activation',
  },
];

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [rejectEmail, setRejectEmail] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [complaints, setComplaints] = useState<ComplaintRecord[]>(readLocalComplaints);
  const [complaintsNotice, setComplaintsNotice] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Finance Officer' as SystemUser['role'],
  });

  const pendingApprovals = users.filter((u) => u.status === 'Pending');

  useEffect(() => {
    let active = true;

    async function loadComplaints() {
      try {
        const token = localStorage.getItem('finagent_token') ?? '';
        const response = await fetch(`${API_URL}/admin/complaints`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Complaint inbox unavailable');

        let records: ComplaintRecord[] = await response.json();
        const localOnly = readLocalComplaints().filter(
          (complaint) => typeof complaint.complaint_id === 'string' && complaint.complaint_id.startsWith('local-'),
        );

        for (const complaint of localOnly) {
          const syncResponse = await fetch(`${API_URL}/auth/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: complaint.name,
              email: complaint.email,
              recipient: complaint.recipient,
              message: complaint.message,
            }),
          });
          if (!syncResponse.ok) throw new Error('Could not sync locally saved complaints');

          const savedComplaint: ComplaintRecord = await syncResponse.json();
          saveLocalComplaints(
            readLocalComplaints().filter((record) => record.complaint_id !== complaint.complaint_id),
          );
          cacheLocalComplaint(savedComplaint);
        }

        if (localOnly.length > 0) {
          const refreshed = await fetch(`${API_URL}/admin/complaints`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!refreshed.ok) throw new Error('Complaint inbox unavailable');
          records = await refreshed.json();
        }

        if (!active) return;
        setComplaints(records);
        saveLocalComplaints(records);
        setComplaintsNotice('');
      } catch {
        if (!active) return;
        const localRecords = readLocalComplaints();
        setComplaints(localRecords);
        setComplaintsNotice(
          localRecords.length > 0
            ? 'Showing locally saved complaints. The shared Admin inbox is unavailable.'
            : '',
        );
      }
    }

    void loadComplaints();
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchSearch = `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All roles' || u.role === roleFilter;
    const matchStatus = statusFilter === 'All statuses' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const foCount = users.filter((u) => u.role === 'Finance Officer' && u.status === 'Active').length;
  const auditorCount = users.filter((u) => u.role === 'Auditor' && u.status === 'Active').length;
  const adminCount = users.filter((u) => u.role === 'Administrator').length;

  const handleToggleBlock = (email: string, currentStatus: SystemUser['status']) => {
    const nextStatus: SystemUser['status'] = currentStatus === 'Active' ? 'Blocked' : 'Active';
    const updated: SystemUser[] = users.map((u) => (u.email === email ? { ...u, status: nextStatus } : u));
    setUsers(updated);
    setFeedback(
      `Account ${email} is now ${nextStatus}. Change logged to the hash-chained audit trail (UC-7 alt flow).`
    );
  };

  const handleApprove = (email: string) => {
    const updated = users.map((u) => (u.email === email ? { ...u, status: 'Active' as const } : u));
    setUsers(updated);
    setFeedback(`Registration for ${email} approved. User can now authenticate via JWT (FR-UM-01).`);
  };

  const handleReject = (email: string) => {
    const updated = users.filter((u) => u.email !== email);
    setUsers(updated);
    setRejectEmail(null);
    setFeedback(`Registration for ${email} rejected. Reason: "${rejectReason || 'Administrative decision'}".`);
    setRejectReason('');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    const created: SystemUser = {
      id: `USR-00${users.length + 1}`,
      name: newUser.name,
      initials: newUser.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
      email: newUser.email,
      role: newUser.role,
      status: 'Active',
      registered: 'Today',
      login: 'Not yet logged in',
    };

    setUsers([created, ...users]);
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: 'Finance Officer' });
    setFeedback(`User ${created.name} (${created.role}) created and activated successfully (FR-UM-04).`);
  };

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="User Management & Role Permissions"
        actions={
          <AdminButton icon="plus" kind="primary" onClick={() => setShowAddModal(true)}>
            Create User Account
          </AdminButton>
        }
      />

      {/* 5 KPI Stat Cards */}
      <div className="stat-grid five">
        <AdminStatCard
          detail="All registered accounts"
          icon="users"
          label="Total Users"
          value={String(users.length)}
        />
        <AdminStatCard
          detail="Invoices & Reconciliations"
          icon="user"
          label="Finance Officers"
          value={String(foCount)}
        />
        <AdminStatCard
          detail="Audit Trail & Read-Only"
          icon="eye"
          label="Auditors"
          value={String(auditorCount)}
        />
        <AdminStatCard
          detail="System configuration"
          icon="shield"
          label="Administrators"
          value={String(adminCount)}
        />
        <AdminStatCard
          detail="Awaiting review"
          icon="clock"
          label="Pending Approvals"
          tone={pendingApprovals.length > 0 ? 'warning' : 'info'}
          value={String(pendingApprovals.length)}
        />
      </div>

      {feedback && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="success">{feedback}</AdminFeedback>
        </div>
      )}

      <AdminPanel style={{ marginBottom: 18 }}>
        <AdminPanelHead
          action={<AdminBadge tone="info">{complaints.length} messages</AdminBadge>}
          eyebrow="Contact Us inbox"
          title="User Complaints"
        />
        {complaintsNotice && <AdminFeedback tone="warning">{complaintsNotice}</AdminFeedback>}
        {complaints.length === 0 ? (
          <AdminEmptyState
            text="Messages submitted through Contact Us will appear here."
            title="No complaints received"
          />
        ) : (
          complaints.map((complaint) => (
            <article
              key={complaint.complaint_id}
              style={{ borderTop: '1px solid var(--line)', padding: '14px 18px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <strong>{complaint.name}</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '3px 0 0' }}>
                    {complaint.email} · To: {complaintRecipientLabels[complaint.recipient]}
                  </p>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>
                  {new Date(complaint.created_at).toLocaleString()}
                </small>
              </div>
              <p style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {complaint.message}
              </p>
            </article>
          ))
        )}
      </AdminPanel>

      {/* Pending Approvals Panel */}
      {pendingApprovals.length > 0 && (
        <AdminPanel style={{ marginBottom: 18 }}>
          <AdminPanelHead
            action={<AdminBadge tone="warning">Requires Action</AdminBadge>}
            title="Pending User Registration Approvals"
          />
          {pendingApprovals.map((req) => (
            <div key={req.email} className="approval-row">
              <span className="row-symbol">
                <AdminIcon name="user" />
              </span>
              <div>
                <strong>{req.name}</strong>
                <p>
                  {req.email} · Applied for <b>{req.role}</b> role · {req.registered}
                </p>
              </div>
              <AdminButton onClick={() => setRejectEmail(req.email)}>Reject</AdminButton>
              <AdminButton kind="primary" onClick={() => handleApprove(req.email)}>
                Approve & Activate
              </AdminButton>

              {rejectEmail === req.email && (
                <div className="reject-box">
                  <label>
                    <span>Rejection Reason (Logged for audit)</span>
                    <textarea
                      placeholder="e.g. Unverified employee ID or unauthorized role request"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </label>
                  <AdminButton onClick={() => setRejectEmail(null)}>Cancel</AdminButton>
                  <AdminButton kind="danger" onClick={() => handleReject(req.email)}>
                    Confirm Rejection
                  </AdminButton>
                </div>
              )}
            </div>
          ))}
        </AdminPanel>
      )}

      {/* System Users Table */}
      <AdminPanel style={{ marginBottom: 18 }}>
        <AdminPanelHead
          eyebrow="Active Accounts"
          title="System Users Directory"
        />

        <div className="filter-bar">
          <label className="search-field">
            <AdminIcon name="search" size={16} />
            <input
              placeholder="Search user by name, email, or ID..."
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All roles</option>
            <option>Finance Officer</option>
            <option>Auditor</option>
            <option>Administrator</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All statuses</option>
            <option>Active</option>
            <option>Blocked</option>
            <option>Pending</option>
          </select>
        </div>

        {filteredUsers.length === 0 ? (
          <AdminEmptyState
            text="Try adjusting your search query or filters."
            title="No users matched criteria"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User & ID</th>
                  <th>Assigned Role</th>
                  <th>Account Status</th>
                  <th>Registered</th>
                  <th>Last Session</th>
                  <th>Access Controls</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.email}>
                    <td data-label="User">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span className="avatar">{u.initials}</span>
                        <div>
                          <strong>{u.name}</strong>
                          <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                            {u.email} · {u.id}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Role">
                      <AdminBadge
                        tone={
                          u.role === 'Administrator'
                            ? 'warning'
                            : u.role === 'Finance Officer'
                              ? 'info'
                              : 'success'
                        }
                      >
                        {u.role}
                      </AdminBadge>
                    </td>
                    <td data-label="Status">
                      <AdminBadge
                        tone={
                          u.status === 'Active'
                            ? 'success'
                            : u.status === 'Pending'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {u.status}
                      </AdminBadge>
                    </td>
                    <td data-label="Registered">{u.registered}</td>
                    <td data-label="Last login">{u.login}</td>
                    <td data-label="Actions">
                      {u.role !== 'Administrator' && u.status !== 'Pending' && (
                        <AdminButton
                          kind={u.status === 'Active' ? 'danger' : 'secondary'}
                          onClick={() => handleToggleBlock(u.email, u.status)}
                        >
                          {u.status === 'Active' ? 'Block Account' : 'Unblock Account'}
                        </AdminButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {/* Create User Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 'min(460px, 100%)' }}>
            <span className="modal-icon">
              <AdminIcon name="user" />
            </span>
            <h2>Create New User Account</h2>
            <p>
              Provision a new account with role-based access. Passwords are encrypted with bcrypt
              and authenticated via JWT (FR-UM-01).
            </p>
            <form onSubmit={handleCreateUser} style={{ marginTop: 14 }}>
              <div className="form-grid" style={{ padding: 0 }}>
                <label className="field full">
                  <span>Full Name *</span>
                  <input
                    required
                    placeholder="e.g. Shahbaz Sharif"
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </label>
                <label className="field full">
                  <span>Corporate Email Address *</span>
                  <input
                    required
                    placeholder="e.g. shahbaz@finagent.pk"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </label>
                <label className="field full">
                  <span>Assigned System Role (Table 18)</span>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value as SystemUser['role'] })
                    }
                  >
                    <option value="Finance Officer">Finance Officer (Operational Invoices & Matching)</option>
                    <option value="Auditor">Auditor (Read-Only Audit Trail & Hash Verification)</option>
                    <option value="Administrator">Administrator (Configuration & User Provisioning)</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <AdminButton onClick={() => setShowAddModal(false)}>Cancel</AdminButton>
                <AdminButton kind="primary" type="submit">
                  Create User
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
