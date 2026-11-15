// src/pages/admin/VendorManagementPage.tsx
// Implements UC-7 (Manage System Settings: Vendor List & Blacklist) of the FinAgent SRS.
import React, { useEffect, useState } from 'react';
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

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

// Same email rule as the login and registration pages
const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
// NTN: digits and hyphens only, for example 1234567-8
const NTN_PATTERN = /^[0-9-]{7,15}$/;

interface Vendor {
  id: number;
  name: string;
  tax_number: string | null;
  contact_email: string | null;
  blacklisted: boolean;
  created_at: string;
}

const getToken = () =>
  localStorage.getItem('finagent_token') ?? sessionStorage.getItem('finagent_token') ?? '';

async function callApi(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Request failed');
  }
  return data;
}

export const VendorManagementPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [feedback, setFeedback] = useState('');
  const [blacklistingVendor, setBlacklistingVendor] = useState<Vendor | null>(null);
  const [blacklistReasonInput, setBlacklistReasonInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [newVendor, setNewVendor] = useState({ name: '', tax_number: '', contact_email: '' });

  const loadVendors = async () => {
    try {
      const data: Vendor[] = await callApi('/admin/vendors');
      setVendors([...data].sort((a, b) => b.id - a.id));
    } catch (e) {
      setFeedback(`Could not load vendors: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const matchSearch = `${v.name} ${v.tax_number ?? ''} ${v.contact_email ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const status = v.blacklisted ? 'Blacklisted' : 'Active';
    const matchStatus = statusFilter === 'All' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const blacklistedCount = vendors.filter((v) => v.blacklisted).length;
  const activeCount = vendors.length - blacklistedCount;
  const missingTaxCount = vendors.filter((v) => !v.tax_number).length;

  const openAddModal = () => {
    setModalError('');
    setNewVendor({ name: '', tax_number: '', contact_email: '' });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setModalError('');
  };

  const closeBlacklistModal = () => {
    setBlacklistingVendor(null);
    setModalError('');
  };

  const handleToggleStatus = async (vendor: Vendor) => {
    if (!vendor.blacklisted) {
      setBlacklistingVendor(vendor);
      setBlacklistReasonInput('');
      setModalError('');
      return;
    }
    try {
      await callApi(`/admin/vendors/${vendor.id}`, 'PATCH', { blacklisted: false });
      await loadVendors();
      setFeedback(`Vendor "${vendor.name}" restored to Active. The change is saved in the audit log.`);
    } catch (e) {
      setFeedback(`Could not restore "${vendor.name}": ${(e as Error).message}`);
    }
  };

  const confirmBlacklist = async () => {
    if (!blacklistingVendor) return;
    const target = blacklistingVendor;
    const reason = blacklistReasonInput.trim() || 'Administrator flagged as blacklisted.';
    setModalError('');
    try {
      await callApi(`/admin/vendors/${target.id}`, 'PATCH', { blacklisted: true, reason });
      await loadVendors();
      closeBlacklistModal();
      setFeedback(
        `Vendor "${target.name}" blacklisted. Transactions from this vendor will now be sent to human review. The reason is saved in the audit log.`
      );
    } catch (e) {
      setModalError(`Could not blacklist "${target.name}": ${(e as Error).message}`);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newVendor.name.trim();
    const ntn = newVendor.tax_number.trim();
    const email = newVendor.contact_email.trim().toLowerCase();

    // All three fields are required
    if (!name || !ntn || !email) {
      setModalError('Please fill in all fields: vendor name, NTN and accounts email.');
      return;
    }
    if (!NTN_PATTERN.test(ntn)) {
      setModalError('Please enter a valid NTN, for example 1234567-8 (digits and hyphen only).');
      return;
    }
    if (email.length > 150 || !EMAIL_PATTERN.test(email)) {
      setModalError('Please enter a valid accounts email, for example billing@supplier.pk.');
      return;
    }

    setModalError('');
    try {
      await callApi('/admin/vendors', 'POST', {
        name,
        tax_number: ntn,
        contact_email: email,
      });
      await loadVendors();
      closeAddModal();
      setFeedback(`Vendor "${name}" added successfully.`);
    } catch (err) {
      setModalError(`Could not add vendor: ${(err as Error).message}`);
    }
  };

  return (
    <div className="page">
      <AdminPageHead
        title="Vendor & Blacklist Management"
        actions={
          <AdminButton icon="plus" kind="primary" onClick={openAddModal}>
            Add New Vendor
          </AdminButton>
        }
      />

      <div className="stat-grid">
        <AdminStatCard
          detail="Registered supplier directory"
          icon="shield"
          label="Total Vendors"
          value={String(vendors.length)}
        />
        <AdminStatCard
          detail="Active in three-way matching"
          icon="check"
          label="Active Suppliers"
          tone="success"
          value={String(activeCount)}
        />
        <AdminStatCard
          detail="Triggers a hard flag"
          icon="warning"
          label="Blacklisted Entities"
          tone="danger"
          value={String(blacklistedCount)}
        />
        <AdminStatCard
          detail="Tax number not recorded"
          icon="tax"
          label="Missing Tax Number"
          tone={missingTaxCount > 0 ? 'warning' : 'info'}
          value={String(missingTaxCount)}
        />
      </div>

      {feedback && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone={feedback.startsWith('Could not') ? 'error' : 'success'}>
            {feedback}
          </AdminFeedback>
        </div>
      )}

      <AdminPanel>
        <AdminPanelHead
          eyebrow="Supplier Registry & Anomaly Prevention"
          title="Vendor Directory & Compliance Status"
        />

        <div className="filter-bar">
          <label className="search-field">
            <AdminIcon name="search" size={16} />
            <input
              placeholder="Search vendor name, tax number or email..."
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses ({vendors.length})</option>
            <option value="Active">Active ({activeCount})</option>
            <option value="Blacklisted">Blacklisted ({blacklistedCount})</option>
          </select>
        </div>

        {filteredVendors.length === 0 ? (
          <AdminEmptyState
            text="Add a vendor, or adjust your search and filter."
            title="No vendors found"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor ID & Name</th>
                  <th>Tax Number (NTN)</th>
                  <th>Contact Email</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => (
                  <tr key={v.id}>
                    <td data-label="Vendor">
                      <div>
                        <strong>{v.name}</strong>
                        <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                          VND-{String(v.id).padStart(3, '0')}
                        </small>
                      </div>
                    </td>
                    <td data-label="Tax Number">{v.tax_number || '—'}</td>
                    <td data-label="Email">{v.contact_email || '—'}</td>
                    <td data-label="Status">
                      <AdminBadge tone={v.blacklisted ? 'danger' : 'success'}>
                        {v.blacklisted ? 'Blacklisted' : 'Active'}
                      </AdminBadge>
                    </td>
                    <td data-label="Added">{new Date(v.created_at).toLocaleDateString()}</td>
                    <td data-label="Actions">
                      <AdminButton
                        kind={v.blacklisted ? 'secondary' : 'danger'}
                        onClick={() => handleToggleStatus(v)}
                      >
                        {v.blacklisted ? 'Restore' : 'Blacklist'}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {/* Blacklist window */}
      {blacklistingVendor && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="modal-icon danger">
              <AdminIcon name="warning" />
            </span>
            <h2>Blacklist Vendor: {blacklistingVendor.name}</h2>
            <p>
              Any transaction from a blacklisted vendor raises a <b>Hard / Critical Flag</b> and is
              always sent to human review.
            </p>
            {modalError && (
              <div style={{ marginTop: 12 }}>
                <AdminFeedback tone="error">{modalError}</AdminFeedback>
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <label className="field full">
                <span>Reason for Blacklisting (saved in the audit trail)</span>
                <textarea
                  placeholder="e.g. Inactive on FBR ATL list, duplicate invoices, suspected shell entity"
                  rows={3}
                  value={blacklistReasonInput}
                  onChange={(e) => setBlacklistReasonInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    padding: 8,
                    fontSize: 10,
                  }}
                />
              </label>
            </div>
            <div>
              <AdminButton onClick={closeBlacklistModal}>Cancel</AdminButton>
              <AdminButton kind="danger" onClick={confirmBlacklist}>
                Confirm Blacklisting
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* Add vendor window */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 'min(500px, 100%)' }}>
            <span className="modal-icon">
              <AdminIcon name="shield" />
            </span>
            <h2>Add New Vendor</h2>
            <p>Vendors in this list are used during three-way matching and anomaly checks. All fields are required.</p>
            {modalError && (
              <div style={{ marginTop: 12 }}>
                <AdminFeedback tone="error">{modalError}</AdminFeedback>
              </div>
            )}
            <form onSubmit={handleCreateVendor} style={{ marginTop: 14 }} noValidate>
              <div className="form-grid" style={{ padding: 0 }}>
                <label className="field full">
                  <span>Vendor / Business Name *</span>
                  <input
                    required
                    maxLength={200}
                    placeholder="e.g. Lahore Industrial Supplies Ltd."
                    type="text"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>NTN (National Tax No.) *</span>
                  <input
                    required
                    maxLength={15}
                    placeholder="e.g. 1234567-8"
                    type="text"
                    value={newVendor.tax_number}
                    onChange={(e) => setNewVendor({ ...newVendor, tax_number: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Accounts Email *</span>
                  <input
                    required
                    maxLength={150}
                    placeholder="e.g. billing@supplier.pk"
                    type="email"
                    value={newVendor.contact_email}
                    onChange={(e) => setNewVendor({ ...newVendor, contact_email: e.target.value })}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <AdminButton onClick={closeAddModal}>Cancel</AdminButton>
                <AdminButton kind="primary" type="submit">
                  Save Vendor
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagementPage;