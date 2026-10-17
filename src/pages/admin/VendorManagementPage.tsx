// src/pages/admin/VendorManagementPage.tsx
// Implements UC-7 (Manage System Settings: Vendor List & Blacklist), Table 6, Table 18, and Figure 9 of FinAgent SRS.
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

export interface Vendor {
  id: string;
  name: string;
  ntn: string; // Pakistani National Tax Number (e.g. 7-digit NTN)
  strn: string; // Sales Tax Registration Number (PRA/FBR)
  category: 'Textile Supplies' | 'Raw Materials' | 'Logistics & Freight' | 'IT & Utilities' | 'Maintenance';
  contactPerson: string;
  email: string;
  status: 'Active' | 'Blacklisted';
  totalInvoiced: string;
  blacklistReason?: string;
  updatedAt: string;
}

const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'VND-PK-0101',
    name: 'Kohinoor Spinning Mills Ltd.',
    ntn: '1428593-7',
    strn: '03-01-9999-101-71',
    category: 'Raw Materials',
    contactPerson: 'Tariq Mehmood',
    email: 'accounts@kohinoorspin.pk',
    status: 'Active',
    totalInvoiced: 'Rs. 4,850,000',
    updatedAt: '12 Oct 2026',
  },
  {
    id: 'VND-PK-0102',
    name: 'Chenab Logistics Transport',
    ntn: '2849104-2',
    strn: '03-02-8888-202-64',
    category: 'Logistics & Freight',
    contactPerson: 'Hamza Bilal',
    email: 'billing@chenablogistics.com.pk',
    status: 'Active',
    totalInvoiced: 'Rs. 1,230,000',
    updatedAt: '08 Oct 2026',
  },
  {
    id: 'VND-PK-0103',
    name: 'Al-Madina Chemical Traders',
    ntn: '3958102-5',
    strn: '03-04-7777-303-52',
    category: 'Raw Materials',
    contactPerson: 'Sajid Anwar',
    email: 'almadina.chemicals@pk-traders.com',
    status: 'Blacklisted',
    totalInvoiced: 'Rs. 780,000',
    blacklistReason: 'Duplicate invoice submission & non-compliant tax withholding (SRO 345 Violation)',
    updatedAt: '14 Oct 2026',
  },
  {
    id: 'VND-PK-0104',
    name: 'Indus Power & Electric Solutions',
    ntn: '4928173-1',
    strn: '03-05-6666-404-33',
    category: 'Maintenance',
    contactPerson: 'Zubair Qureshi',
    email: 'zubair@induspower.pk',
    status: 'Active',
    totalInvoiced: 'Rs. 2,140,000',
    updatedAt: '01 Oct 2026',
  },
  {
    id: 'VND-PK-0105',
    name: 'Fake Tech Paperless Invoicing',
    ntn: '9918273-0',
    strn: 'Unregistered',
    category: 'IT & Utilities',
    contactPerson: 'Unverified Entity',
    email: 'billing@fake-paperless.xyz',
    status: 'Blacklisted',
    totalInvoiced: 'Rs. 0',
    blacklistReason: 'FBR Sales Tax Inactive Taxpayer List (ATL) non-filer & suspected shell company',
    updatedAt: '15 Oct 2026',
  },
];

export const VendorManagementPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [feedback, setFeedback] = useState('');
  const [blacklistingVendor, setBlacklistingVendor] = useState<Vendor | null>(null);
  const [blacklistReasonInput, setBlacklistReasonInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Vendor Form State
  const [newVendor, setNewVendor] = useState({
    name: '',
    ntn: '',
    strn: '',
    category: 'Raw Materials' as Vendor['category'],
    contactPerson: '',
    email: '',
  });

  const filteredVendors = vendors.filter((v) => {
    const matchSearch = `${v.name} ${v.ntn} ${v.strn} ${v.contactPerson}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = vendors.filter((v) => v.status === 'Active').length;
  const blacklistedCount = vendors.filter((v) => v.status === 'Blacklisted').length;

  const handleToggleStatus = (vendor: Vendor) => {
    if (vendor.status === 'Active') {
      setBlacklistingVendor(vendor);
      setBlacklistReasonInput('');
    } else {
      // Re-activate vendor
      const updated = vendors.map((v) =>
        v.id === vendor.id
          ? { ...v, status: 'Active' as const, blacklistReason: undefined, updatedAt: 'Today' }
          : v
      );
      setVendors(updated);
      setFeedback(`Vendor "${vendor.name}" reinstated to Active status. Audit log updated.`);
    }
  };

  const confirmBlacklist = () => {
    if (!blacklistingVendor) return;
    const reason = blacklistReasonInput.trim() || 'Administrator flagged as blacklisted.';
    const updated = vendors.map((v) =>
      v.id === blacklistingVendor.id
        ? { ...v, status: 'Blacklisted' as const, blacklistReason: reason, updatedAt: 'Today' }
        : v
    );
    setVendors(updated);
    setBlacklistingVendor(null);
    setFeedback(
      `Vendor "${blacklistingVendor.name}" blacklisted. Orchestrator will now auto-route incoming transactions to human review under Priority 1 rule.`
    );
  };

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.ntn) return;

    const vendor: Vendor = {
      id: `VND-PK-010${vendors.length + 1}`,
      name: newVendor.name,
      ntn: newVendor.ntn,
      strn: newVendor.strn || 'Pending PRA Registration',
      category: newVendor.category,
      contactPerson: newVendor.contactPerson || 'Official Representative',
      email: newVendor.email || 'accounts@vendor.pk',
      status: 'Active',
      totalInvoiced: 'Rs. 0',
      updatedAt: 'Today',
    };

    setVendors([vendor, ...vendors]);
    setShowAddModal(false);
    setNewVendor({
      name: '',
      ntn: '',
      strn: '',
      category: 'Raw Materials',
      contactPerson: '',
      email: '',
    });
    setFeedback(`New vendor "${vendor.name}" registered successfully with NTN ${vendor.ntn}.`);
  };

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="Vendor & Blacklist Management"
        actions={
          <AdminButton
            icon="plus"
            kind="primary"
            onClick={() => setShowAddModal(true)}
          >
            Add New Vendor
          </AdminButton>
        }
      />

      {/* KPI Cards */}
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
          detail="Triggers Orchestrator Hard Flag"
          icon="warning"
          label="Blacklisted Entities"
          tone="danger"
          value={String(blacklistedCount)}
        />
        <AdminStatCard
          detail="Income Tax & Sales Tax (PRA)"
          icon="tax"
          label="Tax Verified (ATL)"
          tone="info"
          value={`${Math.round((activeCount / vendors.length) * 100)}%`}
        />
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="success">{feedback}</AdminFeedback>
        </div>
      )}

      {/* Main Vendor Panel */}
      <AdminPanel>
        <AdminPanelHead
          eyebrow="Supplier Registry & Anomaly Prevention"
          title="Vendor Directory & Compliance Status"
        />

        {/* Filter Bar */}
        <div className="filter-bar">
          <label className="search-field">
            <AdminIcon name="search" size={16} />
            <input
              placeholder="Search vendor name, NTN, STRN, or contact..."
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
            text="Try adjusting your search criteria or register a new vendor."
            title="No vendors found"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor ID & Name</th>
                  <th>NTN / STRN</th>
                  <th>Category</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Total Invoiced</th>
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
                          {v.id}
                        </small>
                      </div>
                    </td>
                    <td data-label="NTN / STRN">
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                          NTN: {v.ntn}
                        </span>
                        <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                          STRN: {v.strn}
                        </small>
                      </div>
                    </td>
                    <td data-label="Category">{v.category}</td>
                    <td data-label="Contact">
                      <div>
                        <span>{v.contactPerson}</span>
                        <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                          {v.email}
                        </small>
                      </div>
                    </td>
                    <td data-label="Status">
                      <AdminBadge tone={v.status === 'Active' ? 'success' : 'danger'}>
                        {v.status}
                      </AdminBadge>
                      {v.blacklistReason && (
                        <small
                          style={{
                            color: 'var(--red)',
                            display: 'block',
                            maxWidth: 240,
                            whiteSpace: 'normal',
                            marginTop: 3,
                          }}
                        >
                          {v.blacklistReason}
                        </small>
                      )}
                    </td>
                    <td data-label="Invoiced">
                      <strong>{v.totalInvoiced}</strong>
                    </td>
                    <td data-label="Actions">
                      <AdminButton
                        kind={v.status === 'Active' ? 'danger' : 'secondary'}
                        onClick={() => handleToggleStatus(v)}
                      >
                        {v.status === 'Active' ? 'Blacklist' : 'Restore'}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {/* Blacklist Modal */}
      {blacklistingVendor && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="modal-icon danger">
              <AdminIcon name="warning" />
            </span>
            <h2>Blacklist Vendor: {blacklistingVendor.name}</h2>
            <p>
              Under FinAgent SRS Table 14 (Orchestrator Arbitration Rule 1), any transaction from a
              blacklisted vendor immediately raises a <b>Hard / Critical Flag</b> and is blocked from
              auto-approval.
            </p>
            <div style={{ marginTop: 14 }}>
              <label className="field full">
                <span>Reason for Blacklisting (Recorded in Hash-Chained Audit Trail)</span>
                <textarea
                  placeholder="e.g. Inactive on FBR ATL list, counterfeit invoice, suspected shell entity"
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
              <AdminButton onClick={() => setBlacklistingVendor(null)}>Cancel</AdminButton>
              <AdminButton kind="danger" onClick={confirmBlacklist}>
                Confirm Blacklisting
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* Add New Vendor Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 'min(500px, 100%)' }}>
            <span className="modal-icon">
              <AdminIcon name="shield" />
            </span>
            <h2>Register New Pakistani Vendor</h2>
            <p>
              Add vendor details to the authorized supplier library. Entries will be verified during
              Three-Way Matching (Invoice, PO, GRN).
            </p>
            <form onSubmit={handleCreateVendor} style={{ marginTop: 14 }}>
              <div className="form-grid" style={{ padding: 0 }}>
                <label className="field full">
                  <span>Vendor / Business Name *</span>
                  <input
                    required
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
                    placeholder="e.g. 1234567-8"
                    type="text"
                    value={newVendor.ntn}
                    onChange={(e) => setNewVendor({ ...newVendor, ntn: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>STRN (Sales Tax Reg No.)</span>
                  <input
                    placeholder="e.g. 03-00-1234-567-89"
                    type="text"
                    value={newVendor.strn}
                    onChange={(e) => setNewVendor({ ...newVendor, strn: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Category</span>
                  <select
                    value={newVendor.category}
                    onChange={(e) =>
                      setNewVendor({ ...newVendor, category: e.target.value as Vendor['category'] })
                    }
                  >
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Textile Supplies">Textile Supplies</option>
                    <option value="Logistics & Freight">Logistics & Freight</option>
                    <option value="IT & Utilities">IT & Utilities</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </label>
                <label className="field">
                  <span>Contact Person</span>
                  <input
                    placeholder="e.g. Muhammad Aslam"
                    type="text"
                    value={newVendor.contactPerson}
                    onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                  />
                </label>
                <label className="field full">
                  <span>Accounts Email</span>
                  <input
                    placeholder="e.g. billing@supplier.pk"
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <AdminButton onClick={() => setShowAddModal(false)}>Cancel</AdminButton>
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
