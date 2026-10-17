// src/pages/admin/IntegrationsSecurityPage.tsx
import React, { useState } from 'react';
import { AdminIcon } from './AdminIcons';
import {
  AdminPageHead,
  AdminPanel,
  AdminPanelHead,
  AdminBadge,
  AdminButton,
  AdminFeedback,
  AdminSettingRow,
} from './AdminUI';

interface NotificationSettings {
  critical: boolean;
  ai: boolean;
  backup: boolean;
  deadlines: boolean;
}

const DEFAULT_NOTIFS: NotificationSettings = {
  critical: true,
  ai: true,
  backup: true,
  deadlines: false,
};

interface AlertRecipient {
  name: string;
  initials: string;
  email: string;
  role: string;
  isPrimary?: boolean;
}

const INITIAL_RECIPIENTS: AlertRecipient[] = [
  {
    name: 'System Administrator',
    initials: 'SA',
    email: 'admin@northcoast.co.uk',
    role: 'Primary administrator',
    isPrimary: true,
  },
  {
    name: 'Owen Wright',
    initials: 'OW',
    email: 'owen@northcoast.co.uk',
    role: 'Security operations',
    isPrimary: false,
  },
];

export const IntegrationsSecurityPage: React.FC = () => {
  const [notifs, setNotifs] = useState<NotificationSettings>(DEFAULT_NOTIFS);
  const [recipients, setRecipients] = useState<AlertRecipient[]>(INITIAL_RECIPIENTS);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [feedback, setFeedback] = useState<string>('');
  const [simulating, setSimulating] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [restoreModal, setRestoreModal] = useState<string | null>(null);
  const [confirmRisk, setConfirmRisk] = useState(false);

  const updateNotif = (key: keyof NotificationSettings, val: boolean) => {
    setNotifs((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleTestService = (serviceName: string) => {
    setSimulating(serviceName);
    setTimeout(() => {
      setSimulating(null);
      setFeedback(`${serviceName}: simulated demonstration completed. No real service was contacted.`);
    }, 700);
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r.email !== email));
    setDirty(true);
  };

  const handleSave = () => {
    setDirty(false);
    setFeedback('Prototype settings saved.');
  };

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="Integrations & Security"
        subtitle="Manage connected services, notifications, and recovery settings."
        actions={
          <AdminButton
            disabled={!dirty}
            icon="check"
            kind="primary"
            onClick={handleSave}
          >
            Save settings
          </AdminButton>
        }
      />

      {/* Persistent Info Banner */}
      <AdminFeedback tone="info">
        Service statuses and test results on this screen are demonstration data. No backend connection is available in this prototype.
      </AdminFeedback>

      {/* Dynamic Feedback Toast */}
      {feedback && (
        <div style={{ marginTop: 14 }}>
          <AdminFeedback tone="success">{feedback}</AdminFeedback>
        </div>
      )}

      {/* Top 3 Integration Cards */}
      <div className="integration-cards">
        {[
          {
            name: 'FinAgent Backend',
            icon: 'server',
            status: 'Configured',
            check: 'Last demo check: 10:42',
            metric: 'API v2.8.4 · 42 ms',
          },
          {
            name: 'Ollama Service',
            icon: 'bot',
            status: 'Configured',
            check: 'Last demo check: 10:42',
            metric: 'llama3.1:8b · 18 tok/s',
          },
          {
            name: 'PostgreSQL Database',
            icon: 'database',
            status: 'Configured',
            check: 'Last demo check: 10:41',
            metric: 'Primary cluster · 11 ms',
          },
        ].map((card) => (
          <div key={card.name} className="integration-card">
            <span>
              <AdminIcon name={card.icon} />
            </span>
            <div>
              <h3>{card.name}</h3>
              <AdminBadge tone="success">{card.status}</AdminBadge>
              <p>{card.check}</p>
              <small>{card.metric}</small>
            </div>
            <AdminBadge tone="neutral">Demo status</AdminBadge>
          </div>
        ))}
      </div>

      {/* Two Column Grid */}
      <div className="two-column">
        {/* Left Column */}
        <div className="column">
          {/* Integration Settings */}
          <AdminPanel>
            <AdminPanelHead
              eyebrow="Endpoints and availability"
              title="Integration settings"
            />
            {[
              {
                label: 'BACKEND / API ENDPOINT',
                url: 'https://api.northcoast.internal',
                actionName: 'Backend connection',
              },
              {
                label: 'OLLAMA SERVICE ENDPOINT',
                url: 'http://ollama.internal:11434',
                actionName: 'Ollama connection',
              },
              {
                label: 'POSTGRESQL CONNECTION',
                url: '....................................',
                actionName: 'Database connection',
              },
            ].map((conn) => (
              <div key={conn.label} className="connection-row">
                <label className="field">
                  <span>{conn.label}</span>
                  <input
                    defaultValue={conn.url}
                    type="text"
                    onChange={() => setDirty(true)}
                  />
                </label>
                <label className="field timeout">
                  <span>TIMEOUT</span>
                  <div className="input-suffix">
                    <input defaultValue="30" type="number" onChange={() => setDirty(true)} />
                    <i>sec</i>
                  </div>
                </label>
                <button
                  type="button"
                  className="connection-test-btn"
                  onClick={() => handleTestService(conn.actionName)}
                >
                  <AdminIcon name="activity" size={17} />
                  <span>{simulating === conn.actionName ? 'Simulating…' : 'Test'}</span>
                </button>
              </div>
            ))}

            <div className="secure-note">
              <AdminIcon name="lock" />
              <p>
                Credentials and API keys are never shown. Protected authentication must be supplied by the deployment secret manager.
              </p>
            </div>
          </AdminPanel>

          {/* Alert Recipients & Operational Notifications */}
          <AdminPanel>
            <AdminPanelHead
              action={
                <AdminButton icon="plus" kind="quiet">
                  Add recipient
                </AdminButton>
              }
              eyebrow="Operational notifications"
              title="Alert recipients"
            />

            <div className="recipient-list">
              {recipients.map((rec) => (
                <div key={rec.email}>
                  <span>{rec.initials}</span>
                  <p>
                    <strong>{rec.email}</strong>
                    <small>{rec.role}</small>
                  </p>
                  {rec.isPrimary ? (
                    <AdminBadge tone="info">Primary</AdminBadge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(rec.email)}
                    >
                      <AdminIcon name="close" size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <AdminSettingRow
              checked={notifs.critical}
              description="Security events, outages, and critical system errors."
              title="Critical system alerts"
              onChange={(val: boolean) => updateNotif('critical', val)}
            />

            <AdminSettingRow
              checked={notifs.ai}
              description="Ollama availability and repeated inference failures."
              title="AI service failures"
              onChange={(val: boolean) => updateNotif('ai', val)}
            />

            <AdminSettingRow
              checked={notifs.backup}
              description="Failed or incomplete scheduled backup operations."
              title="Backup failures"
              onChange={(val: boolean) => updateNotif('backup', val)}
            />

            <AdminSettingRow
              checked={notifs.deadlines}
              description="Financial and compliance deadline reminders."
              title="Upcoming deadlines"
              onChange={(val: boolean) => updateNotif('deadlines', val)}
            />
          </AdminPanel>

          {/* Security Options */}
          <AdminPanel>
            <AdminPanelHead
              action={
                <AdminBadge tone="success">Secure configuration</AdminBadge>
              }
              eyebrow="Authentication and control"
              title="Security options"
            />

            <div className="form-grid">
              <label className="field">
                <span>Administrator session timeout</span>
                <div className="input-suffix">
                  <input defaultValue="30" type="number" onChange={() => setDirty(true)} />
                  <i>minutes</i>
                </div>
              </label>

              <label className="field">
                <span>Authentication policy</span>
                <select onChange={() => setDirty(true)}>
                  <option>MFA required for all users</option>
                  <option>MFA optional for auditors</option>
                </select>
              </label>
            </div>

            <div className="security-list">
              <p>
                <AdminIcon name="check" />
                <span>
                  <strong>Role authorization</strong>
                  <small>Backend enforcement required</small>
                </span>
                <AdminBadge tone="success">Configured</AdminBadge>
              </p>
              <p>
                <AdminIcon name="check" />
                <span>
                  <strong>Protected credentials</strong>
                  <small>Secret manager integration</small>
                </span>
                <AdminBadge tone="success">Configured</AdminBadge>
              </p>
              <p>
                <AdminIcon name="check" />
                <span>
                  <strong>Audit logging</strong>
                  <small>Administrative events retained</small>
                </span>
                <AdminBadge tone="success">Enabled</AdminBadge>
              </p>
            </div>
          </AdminPanel>
        </div>

        {/* Right Column */}
        <div className="column">
          {/* Email Settings */}
          <AdminPanel>
            <AdminPanelHead
              action={
                <button
                  aria-checked={emailEnabled}
                  aria-label="Email delivery toggle"
                  className={`toggle ${emailEnabled ? 'is-on' : ''}`}
                  onClick={() => {
                    setEmailEnabled(!emailEnabled);
                    setDirty(true);
                  }}
                  role="switch"
                  type="button"
                >
                  <span />
                </button>
              }
              eyebrow="SMTP delivery"
              title="Email settings"
            />

            <div className="form-grid">
              <label className="field">
                <span>Sender name</span>
                <input
                  defaultValue="FinAgent Administration"
                  onChange={() => setDirty(true)}
                />
              </label>

              <label className="field">
                <span>Sender email</span>
                <input
                  defaultValue="finagent@northcoast.co.uk"
                  onChange={() => setDirty(true)}
                />
              </label>

              <label className="field">
                <span>SMTP host</span>
                <input
                  defaultValue="smtp.office365.com"
                  onChange={() => setDirty(true)}
                />
              </label>

              <label className="field">
                <span>SMTP port</span>
                <input
                  defaultValue="587"
                  type="number"
                  onChange={() => setDirty(true)}
                />
              </label>

              <label className="field">
                <span>Encryption</span>
                <select onChange={() => setDirty(true)}>
                  <option>STARTTLS</option>
                  <option>TLS</option>
                </select>
              </label>

              <label className="field">
                <span>Authentication</span>
                <input
                  readOnly
                  type="password"
                  value="protected-credential"
                />
              </label>
            </div>

            <div className="test-block">
              <div>
                <span>Last delivery status</span>
                <strong>Demonstration only · Not tested</strong>
                <p>No error information is available.</p>
              </div>
              <AdminButton
                icon="mail"
                onClick={() => handleTestService('Test email')}
              >
                {simulating === 'Test email' ? 'Simulating…' : 'Send Test Email'}
              </AdminButton>
            </div>
          </AdminPanel>

          {/* Backup & Restore */}
          <AdminPanel>
            <AdminPanelHead
              action={
                <AdminButton
                  icon="backup"
                  kind="primary"
                  onClick={() => {
                    setFeedback('Backup creation simulated. No backend data was copied.');
                  }}
                >
                  Create Backup
                </AdminButton>
              }
              eyebrow="Recovery controls"
              title="Backup & restore"
            />

            <div className="backup-summary">
              <span>
                <AdminIcon name="check" />
              </span>
              <div>
                <strong>Last successful backup</strong>
                <p>Today, 02:00 · 8.4 GB · Encrypted</p>
              </div>
              <AdminBadge tone="success">Complete</AdminBadge>
            </div>

            <div className="form-row">
              <label className="field">
                <span>Retention</span>
                <select onChange={() => setDirty(true)}>
                  <option>30 days</option>
                  <option>60 days</option>
                  <option>90 days</option>
                </select>
              </label>

              <label className="field">
                <span>Destination</span>
                <select onChange={() => setDirty(true)}>
                  <option>Encrypted managed storage</option>
                  <option>Configured S3 storage</option>
                </select>
              </label>
            </div>

            <h3 className="subheading">Backup history</h3>

            {[
              ['16 Jun 2026, 02:00', '8.4 GB'],
              ['15 Jun 2026, 02:00', '8.3 GB'],
              ['14 Jun 2026, 02:00', '8.3 GB'],
            ].map(([date, size]) => (
              <div key={date} className="backup-row">
                <span>
                  <AdminIcon name="backup" size={16} />
                </span>
                <div>
                  <strong>{date}</strong>
                  <p>Automated · {size}</p>
                </div>
                <AdminBadge tone="success">Available</AdminBadge>
                <AdminButton
                  kind="quiet"
                  onClick={() => {
                    setRestoreModal(date);
                    setConfirmRisk(false);
                  }}
                >
                  Restore
                </AdminButton>
              </div>
            ))}

            <div className="danger-note">
              <AdminIcon name="warning" />
              <p>
                <strong>Restoring can overwrite current data.</strong> A restore must be explicitly confirmed and should only be performed after validating the selected recovery point.
              </p>
            </div>
          </AdminPanel>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="modal-icon danger">
              <AdminIcon name="warning" />
            </span>
            <h2>Confirm backup restore</h2>
            <p>
              Restore the backup from {restoreModal}? This demonstration does not alter data, but a real restore may overwrite current records.
            </p>
            <label className="confirm-check">
              <input
                checked={confirmRisk}
                type="checkbox"
                onChange={(e) => setConfirmRisk(e.target.checked)}
              />
              <span>I understand the recovery risk</span>
            </label>
            <div>
              <AdminButton onClick={() => setRestoreModal(null)}>Cancel</AdminButton>
              <AdminButton
                disabled={!confirmRisk}
                kind="danger"
                onClick={() => {
                  setRestoreModal(null);
                  setFeedback('Restore confirmation demonstrated. No backend data was changed.');
                }}
              >
                Confirm restore
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsSecurityPage;
