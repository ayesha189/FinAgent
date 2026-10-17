// src/pages/admin/DeadlinesCalendarPage.tsx
// Implements FR-DN-01, FR-DN-02, FR-DN-03, FR-DN-04, and Table 18 of the FinAgent SRS.
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
} from './AdminUI';

export interface TaxDeadline {
  id: string;
  authority: 'FBR' | 'PRA' | 'SECP';
  filingType: string;
  period: string;
  dueDate: string;
  daysRemaining: number;
  status: 'Upcoming' | 'Urgent' | 'Compliant' | 'Dispatched';
  linkedAnnexure: string;
  penaltyClause: string;
}

const INITIAL_DEADLINES: TaxDeadline[] = [
  {
    id: 'DL-2026-10-FBR',
    authority: 'FBR',
    filingType: 'Monthly Withholding Tax Statement (Sec 165)',
    period: 'September 2026',
    dueDate: '15 Oct 2026',
    daysRemaining: 0,
    status: 'Urgent',
    linkedAnnexure: 'Annexure-A (Withholding Tax Schedule)',
    penaltyClause: 'Sec 182 ITO 2001 (Rs. 10,000 + Rs. 200/day)',
  },
  {
    id: 'DL-2026-10-PRA',
    authority: 'PRA',
    filingType: 'Punjab Sales Tax on Services Monthly Return',
    period: 'September 2026',
    dueDate: '18 Oct 2026',
    daysRemaining: 3,
    status: 'Upcoming',
    linkedAnnexure: 'Annexure-P (PRA Withholding & Sales Return)',
    penaltyClause: 'Sec 48 PSTS Act 2012 (Rs. 5,000 late fee)',
  },
  {
    id: 'DL-2026-10-FBR-C',
    authority: 'FBR',
    filingType: 'Federal Sales Tax Return Annexure-C',
    period: 'September 2026',
    dueDate: '18 Oct 2026',
    daysRemaining: 3,
    status: 'Upcoming',
    linkedAnnexure: 'Annexure-C (Domestic Purchase Invoice Feed)',
    penaltyClause: 'Sec 33 STA 1990 (5% penalty on tax payable)',
  },
  {
    id: 'DL-2026-11-FBR',
    authority: 'FBR',
    filingType: 'Monthly Withholding Tax Statement (Sec 165)',
    period: 'October 2026',
    dueDate: '15 Nov 2026',
    daysRemaining: 31,
    status: 'Compliant',
    linkedAnnexure: 'Annexure-A (Pending October Close)',
    penaltyClause: 'Sec 182 ITO 2001',
  },
  {
    id: 'DL-2026-12-SECP',
    authority: 'SECP',
    filingType: 'Annual Corporate Income Tax Return & Financial Statements',
    period: 'Tax Year 2026',
    dueDate: '31 Dec 2026',
    daysRemaining: 77,
    status: 'Compliant',
    linkedAnnexure: 'Annual Audited P&L & Balance Sheet',
    penaltyClause: 'Companies Act 2017 & Sec 114 ITO 2001',
  },
];

export const DeadlinesCalendarPage: React.FC = () => {
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>(INITIAL_DEADLINES);
  const [feedback, setFeedback] = useState('');

  const handleSendReminder = (dl: TaxDeadline) => {
    setFeedback(
      `Reminder notification dispatched for "${dl.filingType}" to all Finance Officers via in-app banner and Email Gateway (FR-DN-03).`
    );
  };

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="Statutory Filing Deadlines & Alerts"

        actions={
          <AdminButton
            icon="bell"
            kind="primary"
            onClick={() =>
              setFeedback(
                'Broadcasted statutory deadline digest for October 2026 to Finance Officer notification queues.'
              )
            }
          >
            Dispatch All Reminders
          </AdminButton>
        }
      />

      {/* KPI Cards */}
      <div className="stat-grid">
        <AdminStatCard
          detail="Due within 72 hours"
          icon="warning"
          label="Urgent Deadlines"
          tone="warning"
          value="2"
        />
        <AdminStatCard
          detail="FBR Federal IRIS schedules"
          icon="calendar"
          label="FBR Filings"
          value="3"
        />
        <AdminStatCard
          detail="Punjab Revenue Authority"
          icon="tax"
          label="PRA Filings"
          tone="info"
          value="1"
        />
        <AdminStatCard
          detail="Statutory compliance status"
          icon="check"
          label="Penalty Exposure"
          tone="success"
          value="Rs. 0"
        />
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="success">{feedback}</AdminFeedback>
        </div>
      )}

      {/* Deadlines Panel */}
      <AdminPanel>
        <AdminPanelHead
          action={
            <AdminBadge tone="neutral">
              Automated Alerts & Notifications
            </AdminBadge>
          }
          eyebrow="Statutory Compliance Calendar"
          title="Active Tax Filing Schedule & Penalties"
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Statutory Filing</th>
                <th>Authority</th>
                <th>Tax Period</th>
                <th>Due Date</th>
                <th>Time Remaining</th>
                <th>Linked Annexure</th>
                <th>Statutory Penalty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((dl) => (
                <tr key={dl.id}>
                  <td data-label="Filing">
                    <div>
                      <strong>{dl.filingType}</strong>
                      <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                        {dl.id}
                      </small>
                    </div>
                  </td>
                  <td data-label="Authority">
                    <AdminBadge tone={dl.authority === 'PRA' ? 'warning' : 'info'}>
                      {dl.authority}
                    </AdminBadge>
                  </td>
                  <td data-label="Period">{dl.period}</td>
                  <td data-label="Due Date">
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{dl.dueDate}</strong>
                  </td>
                  <td data-label="Remaining">
                    <AdminBadge
                      tone={
                        dl.daysRemaining === 0
                          ? 'danger'
                          : dl.daysRemaining <= 5
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {dl.daysRemaining === 0
                        ? 'Due Today'
                        : `${dl.daysRemaining} days left`}
                    </AdminBadge>
                  </td>
                  <td data-label="Annexure">
                    <span style={{ fontSize: '8px', color: 'var(--navy)' }}>
                      {dl.linkedAnnexure}
                    </span>
                  </td>
                  <td data-label="Penalty">
                    <small style={{ color: 'var(--red)', display: 'block' }}>
                      {dl.penaltyClause}
                    </small>
                  </td>
                  <td data-label="Actions">
                    <AdminButton kind="quiet" onClick={() => handleSendReminder(dl)}>
                      Send Alert
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
};

export default DeadlinesCalendarPage;
