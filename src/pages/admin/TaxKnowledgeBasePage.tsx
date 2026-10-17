// src/pages/admin/TaxKnowledgeBasePage.tsx
// Implements FR-CT-02, FR-CT-03, FR-CT-07, FR-CT-10, Table 6, and Table 18 of the FinAgent SRS.
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

export interface TaxStatute {
  clauseId: string;
  source: 'Income Tax Ordinance 2001' | 'Sales Tax Act 1990' | 'PRA Punjab Sales Tax 2012' | 'FBR SRO';
  jurisdiction: 'Federal (FBR)' | 'Punjab (PRA)';
  section: string;
  title: string;
  withholdingRate: string;
  summary: string;
  effectiveDate: string;
}

export interface KBVersion {
  version: string;
  releaseDate: string;
  statutesCount: number;
  chunksIndexed: number;
  notes: string;
  isActive: boolean;
}

const STATUTES_DATA: TaxStatute[] = [
  {
    clauseId: 'ITO-SEC-153-1A',
    source: 'Income Tax Ordinance 2001',
    jurisdiction: 'Federal (FBR)',
    section: 'Section 153(1)(a)',
    title: 'Sale of Goods - Withholding Tax on Commercial Supplies',
    withholdingRate: '5.0% (Company) / 5.5% (Individual/AOP)',
    summary: 'Deduction of advance income tax at source by prescribed persons making payment for supply of goods.',
    effectiveDate: '01 Jul 2025',
  },
  {
    clauseId: 'ITO-SEC-153-1B',
    source: 'Income Tax Ordinance 2001',
    jurisdiction: 'Federal (FBR)',
    section: 'Section 153(1)(b)',
    title: 'Rendering of Professional & Contractual Services',
    withholdingRate: '9.0% (Company) / 11.0% (Other)',
    summary: 'Tax deduction on gross payments for services rendered or contract execution by corporate entities.',
    effectiveDate: '01 Jul 2025',
  },
  {
    clauseId: 'PRA-SEC-14-SCH2',
    source: 'PRA Punjab Sales Tax 2012',
    jurisdiction: 'Punjab (PRA)',
    section: 'Second Schedule, Entry 14',
    title: 'Punjab Provincial Sales Tax on Freight & Transport Services',
    withholdingRate: '16.0% (Standard PRA rate)',
    summary: 'Sales tax on services rendered within the province of Punjab under Punjab Revenue Authority jurisdiction.',
    effectiveDate: '01 Jul 2025',
  },
  {
    clauseId: 'STA-SEC-73',
    source: 'Sales Tax Act 1990',
    jurisdiction: 'Federal (FBR)',
    section: 'Section 73',
    title: 'Banking Channel Payment Requirement',
    withholdingRate: 'Non-deductible if cash > Rs. 50,000',
    summary: 'Mandates all input tax claims for purchases exceeding Rs. 50,000 to be settled strictly through business banking channels.',
    effectiveDate: '01 Jul 2024',
  },
  {
    clauseId: 'FBR-SRO-345-2025',
    source: 'FBR SRO',
    jurisdiction: 'Federal (FBR)',
    section: 'SRO 345(I)/2025',
    title: 'Withholding Tax Rules for Active vs Non-Active Taxpayers',
    withholdingRate: '100% Surcharge for Non-Filers',
    summary: 'Doubles standard withholding deduction rate on payments to individuals/companies not listed on the Active Taxpayer List (ATL).',
    effectiveDate: '15 Aug 2025',
  },
];

const INITIAL_VERSIONS: KBVersion[] = [
  {
    version: 'v2026.2-FBR-PRA',
    releaseDate: '14 Oct 2026',
    statutesCount: 48,
    chunksIndexed: 312,
    notes: 'Updated with latest FBR SRO Withholding tables and PRA Second Schedule amendments.',
    isActive: true,
  },
  {
    version: 'v2026.1-FBR-PRA',
    releaseDate: '15 Jul 2026',
    statutesCount: 44,
    chunksIndexed: 285,
    notes: 'Incorporated FY 2026-27 Finance Act changes for Income Tax and Punjab Sales Tax.',
    isActive: false,
  },
  {
    version: 'v2025.4-BASE',
    releaseDate: '10 Jan 2026',
    statutesCount: 39,
    chunksIndexed: 240,
    notes: 'Initial localized Pakistan tax knowledge base baseline.',
    isActive: false,
  },
];

export const TaxKnowledgeBasePage: React.FC = () => {
  const [statutes] = useState<TaxStatute[]>(STATUTES_DATA);
  const [versions, setVersions] = useState<KBVersion[]>(INITIAL_VERSIONS);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [feedback, setFeedback] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<KBVersion | null>(null);

  // Upload modal inputs
  const [newVersionTag, setNewVersionTag] = useState('v2026.3-FBR-PRA');
  const [statuteTitle, setStatuteTitle] = useState('');
  const [statuteNotes, setStatuteNotes] = useState('');

  const activeVersion = versions.find((v) => v.isActive) || versions[0];

  const filteredStatutes = statutes.filter((s) => {
    const matchSearch = `${s.clauseId} ${s.section} ${s.title} ${s.summary}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchSource = sourceFilter === 'All' || s.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const handleRollback = (ver: KBVersion) => {
    const updated = versions.map((v) => ({
      ...v,
      isActive: v.version === ver.version,
    }));
    setVersions(updated);
    setSelectedVersion(null);
    setFeedback(
      `Knowledge Base active version switched to ${ver.version}. Compliance & Tax Agent will cite this version for subsequent decisions (FR-CT-10).`
    );
  };

  const handleImportNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statuteTitle) return;

    const newVer: KBVersion = {
      version: newVersionTag,
      releaseDate: 'Today',
      statutesCount: activeVersion.statutesCount + 1,
      chunksIndexed: activeVersion.chunksIndexed + 14,
      notes: statuteNotes || `Imported ${statuteTitle}`,
      isActive: true,
    };

    const updated = [newVer, ...versions.map((v) => ({ ...v, isActive: false }))];
    setVersions(updated);
    setShowUploadModal(false);
    setStatuteTitle('');
    setStatuteNotes('');
    setFeedback(
      `Successfully indexed "${statuteTitle}". Vectorized into local Top-5 RAG store under active version ${newVer.version}.`
    );
  };

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="Tax Knowledge Base"
        actions={
          <AdminButton
            icon="upload"
            kind="primary"
            onClick={() => setShowUploadModal(true)}
          >
            Import SRO / Tax Law Update
          </AdminButton>
        }
      />

      {/* KPI Cards */}
      <div className="stat-grid">
        <AdminStatCard
          detail="Currently active in RAG pipeline"
          icon="check"
          label="Active KB Version"
          tone="success"
          value={activeVersion.version}
        />
        <AdminStatCard
          detail="ITO 2001, STA 1990, PRA 2012"
          icon="tax"
          label="Indexed Clauses"
          value={String(activeVersion.statutesCount)}
        />
        <AdminStatCard
          detail="Local top-5 chunk retrieval"
          icon="bot"
          label="Vector Chunks"
          tone="info"
          value={String(activeVersion.chunksIndexed)}
        />
        <AdminStatCard
          detail="Primary: Punjab (PRA) + FBR"
          icon="shield"
          label="Jurisdiction Scope"
          value="FBR / PRA"
        />
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="success">{feedback}</AdminFeedback>
        </div>
      )}

      {/* Version Summary & History Panel */}
      <AdminPanel style={{ marginBottom: 18 }}>
        <AdminPanelHead
          action={
            <AdminBadge tone="success">
              Last Updated: {activeVersion.releaseDate}
            </AdminBadge>
          }
          eyebrow="Knowledge Base Provenance & Auditability "
          title="Active Tax Law Version & Rollback History"
        />

        <div className="kb-summary">
          <div>
            <span>Active Knowledge Base</span>
            <strong>{activeVersion.version}</strong>
          </div>
          <div>
            <span>Last Updated</span>
            <strong>{activeVersion.releaseDate}</strong>
          </div>
          <div>
            <span>Statutes & SROs</span>
            <strong>{activeVersion.statutesCount} legal clauses</strong>
          </div>
          <div>
            <span>Vector Store Status</span>
            <AdminBadge tone="success">Indexed & Embedded</AdminBadge>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Effective Date</th>
                <th>Indexed Clauses</th>
                <th>Vector Chunks</th>
                <th>Release Summary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((ver) => (
                <tr key={ver.version}>
                  <td data-label="Version">
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{ver.version}</strong>
                  </td>
                  <td data-label="Date">{ver.releaseDate}</td>
                  <td data-label="Clauses">{ver.statutesCount}</td>
                  <td data-label="Chunks">{ver.chunksIndexed}</td>
                  <td data-label="Notes">
                    <span style={{ fontSize: '8px', color: 'var(--navy)' }}>{ver.notes}</span>
                  </td>
                  <td data-label="Status">
                    <AdminBadge tone={ver.isActive ? 'success' : 'neutral'}>
                      {ver.isActive ? 'Active' : 'Archived'}
                    </AdminBadge>
                  </td>
                  <td data-label="Actions">
                    {!ver.isActive && (
                      <AdminButton kind="quiet" onClick={() => setSelectedVersion(ver)}>
                        Roll back
                      </AdminButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      {/* Indexed Tax Clauses Browser */}
      <AdminPanel>
        <AdminPanelHead

          title="Indexed Tax Clauses & Withholding Schedules"
        />

        <div className="filter-bar">
          <label className="search-field">
            <AdminIcon name="search" size={16} />
            <input
              placeholder="Search clause ID, section, withholding rate, or description..."
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="All">All Legal Sources</option>
            <option value="Income Tax Ordinance 2001">Income Tax Ordinance 2001 (Federal)</option>
            <option value="Sales Tax Act 1990">Sales Tax Act 1990 (Federal)</option>
            <option value="PRA Punjab Sales Tax 2012">Punjab Sales Tax 2012 (PRA)</option>
            <option value="FBR SRO">FBR SRO Notifications</option>
          </select>
        </div>

        {filteredStatutes.length === 0 ? (
          <AdminEmptyState
            text="No clauses matched your filter criteria."
            title="No clauses found"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Clause ID & Law</th>
                  <th>Section</th>
                  <th>Subject & Withholding Rate</th>
                  <th>Statutory Summary</th>
                  <th>Jurisdiction</th>
                </tr>
              </thead>
              <tbody>
                {filteredStatutes.map((s) => (
                  <tr key={s.clauseId}>
                    <td data-label="Clause ID">
                      <div>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{s.clauseId}</strong>
                        <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                          {s.source}
                        </small>
                      </div>
                    </td>
                    <td data-label="Section">
                      <strong>{s.section}</strong>
                    </td>
                    <td data-label="Subject">
                      <div>
                        <span>{s.title}</span>
                        <small
                          style={{
                            color: 'var(--cyan)',
                            display: 'block',
                            fontWeight: 700,
                            marginTop: 3,
                          }}
                        >
                          Rate: {s.withholdingRate}
                        </small>
                      </div>
                    </td>
                    <td data-label="Summary">
                      <p
                        style={{
                          margin: 0,
                          fontSize: '8px',
                          color: 'var(--text-muted)',
                          maxWidth: 380,
                          whiteSpace: 'normal',
                          lineHeight: 1.4,
                        }}
                      >
                        {s.summary}
                      </p>
                    </td>
                    <td data-label="Jurisdiction">
                      <AdminBadge
                        tone={s.jurisdiction.includes('Punjab') ? 'warning' : 'info'}
                      >
                        {s.jurisdiction}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {/* Rollback Modal */}
      {selectedVersion && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="modal-icon">
              <AdminIcon name="warning" />
            </span>
            <h2>Confirm Rollback to {selectedVersion.version}</h2>
            <p>
              In accordance with FR-CT-10, switching the active knowledge base version will
              cause subsequent invoice evaluations to cite clauses from{' '}
              <b>{selectedVersion.version}</b>. Historical audit logs will retain their original
              version tags.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <AdminButton onClick={() => setSelectedVersion(null)}>Cancel</AdminButton>
              <AdminButton kind="primary" onClick={() => handleRollback(selectedVersion)}>
                Confirm Rollback
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* Upload SRO Modal */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 'min(500px, 100%)' }}>
            <span className="modal-icon">
              <AdminIcon name="upload" />
            </span>
            <h2>Import Statutory Tax Law / SRO Notification</h2>
            <p>
              Upload official gazette notification from FBR or PRA. The file will be segmented into
              vector chunks for local top-5 RAG retrieval.
            </p>
            <form onSubmit={handleImportNotification} style={{ marginTop: 14 }}>
              <div className="form-grid" style={{ padding: 0 }}>
                <label className="field full">
                  <span>Document / SRO Title *</span>
                  <input
                    required
                    placeholder="e.g. FBR SRO 450(I)/2026 - Updated Withholding Rates"
                    type="text"
                    value={statuteTitle}
                    onChange={(e) => setStatuteTitle(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>New Version Tag *</span>
                  <input
                    required
                    type="text"
                    value={newVersionTag}
                    onChange={(e) => setNewVersionTag(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Jurisdiction</span>
                  <select defaultValue="Punjab (PRA)">
                    <option value="Federal (FBR)">Federal (FBR)</option>
                    <option value="Punjab (PRA)">Punjab (PRA)</option>
                  </select>
                </label>
                <label className="field full">
                  <span>Release Notes / Clause Impact</span>
                  <textarea
                    placeholder="Summarize changes to withholding rates or applicability rules..."
                    rows={3}
                    value={statuteNotes}
                    onChange={(e) => setStatuteNotes(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      padding: 8,
                      fontSize: 10,
                    }}
                  />
                </label>
                <label className="field full">
                  <span>Attach Gazette PDF</span>
                  <input type="file" accept=".pdf" style={{ marginTop: 4 }} />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <AdminButton onClick={() => setShowUploadModal(false)}>Cancel</AdminButton>
                <AdminButton kind="primary" type="submit">
                  Index & Activate Version
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxKnowledgeBasePage;
