// src/pages/admin/PoliciesAIPage.tsx
// Implements UC-7 (Manage System Settings: Thresholds & Policies), FR-OR-04, FR-RA-04, and Table 14 of the FinAgent SRS.
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

export interface PolicyControls {
  enforceHumanApprovalGate: boolean;
  blockOnTaxNonCompliance: boolean;
  routeSoftRiskFlagsToReview: boolean;
  autoRouteUncertainTaxToReview: boolean;
  enableVendorHistoryMultiplier: boolean;
  enableNewVendorHighAmountCheck: boolean;
}

const DEFAULT_CONTROLS: PolicyControls = {
  enforceHumanApprovalGate: true,
  blockOnTaxNonCompliance: true,
  routeSoftRiskFlagsToReview: true,
  autoRouteUncertainTaxToReview: true,
  enableVendorHistoryMultiplier: true,
  enableNewVendorHighAmountCheck: true,
};

const INITIAL_STATE = {
  highValueApprovalLimit: 500000, // PKR Rs. 500,000 (triggers Human Approval Gate)
  minTransactionAmount: 500, // PKR Rs. 500
  maxTransactionAmount: 25000000, // PKR Rs. 25,000,000
  isolationForestThreshold: 85, // 0.85 Anomaly Score
  vendorMultiplierLimit: 3.0, // 3x vendor historical average (FR-RA-04)
  newVendorThreshold: 100000, // Rs. 100,000 for first-time vendor
  model: 'Phi-4-mini (3.8B, 4-bit quantised)', // SRS Section 2.5
  temperature: 0.1, // Deterministic extraction
  orchestratorTimeout: 30, // 30s timeout before raising stuck-task alert (FR-OR-05)
  controls: DEFAULT_CONTROLS,
};

export const PoliciesAIPage: React.FC = () => {
  const [highValueApprovalLimit, setHighValueApprovalLimit] = useState(INITIAL_STATE.highValueApprovalLimit);
  const [minAmount, setMinAmount] = useState(INITIAL_STATE.minTransactionAmount);
  const [maxAmount, setMaxAmount] = useState(INITIAL_STATE.maxTransactionAmount);
  const [isolationForestThreshold, setIsolationForestThreshold] = useState(INITIAL_STATE.isolationForestThreshold);
  const [vendorMultiplierLimit, setVendorMultiplierLimit] = useState(INITIAL_STATE.vendorMultiplierLimit);
  const [newVendorThreshold, setNewVendorThreshold] = useState(INITIAL_STATE.newVendorThreshold);
  const [model, setModel] = useState(INITIAL_STATE.model);
  const [temperature, setTemperature] = useState(INITIAL_STATE.temperature);
  const [orchestratorTimeout, setOrchestratorTimeout] = useState(INITIAL_STATE.orchestratorTimeout);
  const [controls, setControls] = useState<PolicyControls>(INITIAL_STATE.controls);

  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasInvalidBounds =
    minAmount < 0 || maxAmount <= minAmount || highValueApprovalLimit <= minAmount || highValueApprovalLimit > maxAmount;

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const updateControl = (key: keyof PolicyControls, val: boolean) => {
    setControls((prev) => ({ ...prev, [key]: val }));
    markDirty();
  };

  const handleRestoreDefaults = () => {
    setHighValueApprovalLimit(INITIAL_STATE.highValueApprovalLimit);
    setMinAmount(INITIAL_STATE.minTransactionAmount);
    setMaxAmount(INITIAL_STATE.maxTransactionAmount);
    setIsolationForestThreshold(INITIAL_STATE.isolationForestThreshold);
    setVendorMultiplierLimit(INITIAL_STATE.vendorMultiplierLimit);
    setNewVendorThreshold(INITIAL_STATE.newVendorThreshold);
    setModel(INITIAL_STATE.model);
    setTemperature(INITIAL_STATE.temperature);
    setOrchestratorTimeout(INITIAL_STATE.orchestratorTimeout);
    setControls(DEFAULT_CONTROLS);
    setDirty(true);
    setSaved(false);
  };

  const handleDiscardChanges = () => {
    setHighValueApprovalLimit(INITIAL_STATE.highValueApprovalLimit);
    setMinAmount(INITIAL_STATE.minTransactionAmount);
    setMaxAmount(INITIAL_STATE.maxTransactionAmount);
    setIsolationForestThreshold(INITIAL_STATE.isolationForestThreshold);
    setVendorMultiplierLimit(INITIAL_STATE.vendorMultiplierLimit);
    setNewVendorThreshold(INITIAL_STATE.newVendorThreshold);
    setModel(INITIAL_STATE.model);
    setTemperature(INITIAL_STATE.temperature);
    setOrchestratorTimeout(INITIAL_STATE.orchestratorTimeout);
    setControls(INITIAL_STATE.controls);
    setDirty(false);
    setSaved(false);
  };

  const handleSaveChanges = () => {
    if (hasInvalidBounds) return;
    setDirty(false);
    setSaved(true);
  };

  return (
    <div className="page">
      {/* Page Header */}
      <AdminPageHead
        title="System Settings: Thresholds & AI Policies"
        actions={
          <>
            <AdminButton kind="quiet" onClick={handleRestoreDefaults}>
              Restore Defaults
            </AdminButton>
            <AdminButton onClick={handleDiscardChanges}>
              Discard
            </AdminButton>
            <AdminButton
              disabled={!dirty || hasInvalidBounds}
              icon="check"
              kind="primary"
              onClick={handleSaveChanges}
            >
              Save Configuration
            </AdminButton>
          </>
        }
      />

      {/* Notifications */}
      {dirty && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="warning">
            You have unsaved threshold changes. Click 'Save Configuration' to persist and write to audit trail.
          </AdminFeedback>
        </div>
      )}

      {saved && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="success">
            Settings updated successfully. Enforced on all subsequent Orchestrator invocations.
          </AdminFeedback>
        </div>
      )}

      {hasInvalidBounds && (
        <div style={{ marginBottom: 16 }}>
          <AdminFeedback tone="error">
            Invalid amount limits. High-value approval limit must be between minimum and maximum bounds.
          </AdminFeedback>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="two-column">
        {/* Left Column: Financial & Anomaly Thresholds */}
        <div className="column">
          {/* Approval Thresholds (PKR) */}
          <AdminPanel>
            <AdminPanelHead
              title="Transaction Approval Limits"
            />
            <div className="form-grid">
              <label className="field full">
                <span>High-Value Human-Approval Gate (PKR) *</span>
                <div className="input-prefix">
                  <i>Rs.</i>
                  <input
                    min="1000"
                    step="10000"
                    type="number"
                    value={highValueApprovalLimit}
                    onChange={(e) => {
                      setHighValueApprovalLimit(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '8px', marginTop: 4, display: 'block' }}>
                  Transactions equal to or exceeding this limit are routed to the Finance Officer.
                </small>
              </label>

              <label className="field">
                <span>Minimum Processable Amount</span>
                <div className="input-prefix">
                  <i>Rs.</i>
                  <input
                    min="0"
                    type="number"
                    value={minAmount}
                    onChange={(e) => {
                      setMinAmount(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </div>
              </label>

              <label className="field">
                <span>Maximum Single Invoice Cap</span>
                <div className="input-prefix">
                  <i>Rs.</i>
                  <input
                    min="1000"
                    type="number"
                    value={maxAmount}
                    onChange={(e) => {
                      setMaxAmount(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </div>
              </label>
            </div>

            <AdminSettingRow
              checked={controls.enforceHumanApprovalGate}
              title="Enforce Human-Approval Gate"
              onChange={(val) => updateControl('enforceHumanApprovalGate', val)}
            />

            <AdminSettingRow
              checked={controls.blockOnTaxNonCompliance}
              title="Strict Non-Compliance Blocking"
              onChange={(val) => updateControl('blockOnTaxNonCompliance', val)}
            />
          </AdminPanel>

          {/* Anomaly & Risk Detection (FR-RA-01, FR-RA-04) */}
          <AdminPanel>
            <AdminPanelHead

              title="Fraud & Statistical Anomaly Thresholds"
            />

            <div className="range-control">
              <div>
                <span>Isolation Forest Statistical Risk Cutoff</span>
                <strong>{isolationForestThreshold}%</strong>
              </div>
              <input
                max="99"
                min="50"
                type="range"
                value={isolationForestThreshold}
                onChange={(e) => {
                  setIsolationForestThreshold(Number(e.target.value));
                  markDirty();
                }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '8px', marginTop: 4, display: 'block' }}>
                Statistical anomaly scores exceeding {isolationForestThreshold}% generate a soft flag.
              </small>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Vendor Historical Multiplier</span>
                <div className="input-suffix">
                  <input
                    max="10"
                    min="1.5"
                    step="0.5"
                    type="number"
                    value={vendorMultiplierLimit}
                    onChange={(e) => {
                      setVendorMultiplierLimit(Number(e.target.value));
                      markDirty();
                    }}
                  />
                  <i>&times; avg</i>
                </div>
              </label>

              <label className="field">
                <span>New Vendor Alert Limit</span>
                <div className="input-prefix">
                  <i>Rs.</i>
                  <input
                    min="10000"
                    step="10000"
                    type="number"
                    value={newVendorThreshold}
                    onChange={(e) => {
                      setNewVendorThreshold(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </div>
              </label>
            </div>

            <AdminSettingRow
              checked={controls.enableVendorHistoryMultiplier}
              description="Flag any invoice exceeding 3.0x the vendor's historical average amount."
              title="Historical Outlier Flagging"
              onChange={(val) => updateControl('enableVendorHistoryMultiplier', val)}
            />

            <AdminSettingRow
              checked={controls.enableNewVendorHighAmountCheck}
              description="Flag transactions above Rs. 100,000 from first-time suppliers."
              title="New Vendor High-Value Protection"
              onChange={(val) => updateControl('enableNewVendorHighAmountCheck', val)}
            />
          </AdminPanel>
        </div>

        {/* Right Column: Local Model & Arbitration Rules */}
        <div className="column">
          {/* Local Model Server (Section 2.5: 8-16 GB Laptop Feasible) */}
          <AdminPanel>
            <AdminPanelHead

              title="Coordinator Model Configuration"
            />

            <div className="model-callout">
              <span>
                <AdminIcon name="bot" />
              </span>
              <div>
                <small>Orchestrator Coordinator Model</small>
                <strong>{model}</strong>
              </div>
            </div>

            <div className="form-grid">
              <label className="field full">
                <span>Selected Local Model</span>
                <select
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    markDirty();
                  }}
                >
                  <option value="Phi-4-mini (3.8B, 4-bit quantised)">
                    Phi-4-mini (3.8B, 4-bit) — Recommended Coordinator
                  </option>
                  <option value="Qwen 2.5 3B (4-bit quantised)">
                    Qwen 2.5 3B (4-bit) — Lightweight Alternative
                  </option>
                </select>
              </label>

              <label className="field">
                <span>Sampling Temperature</span>
                <input
                  max="0.5"
                  min="0.0"
                  step="0.05"
                  type="number"
                  value={temperature}
                  onChange={(e) => {
                    setTemperature(Number(e.target.value));
                    markDirty();
                  }}
                />
              </label>

              <label className="field">
                <span>Agent Timeout Limit (FR-OR-05)</span>
                <div className="input-suffix">
                  <input
                    max="120"
                    min="10"
                    type="number"
                    value={orchestratorTimeout}
                    onChange={(e) => {
                      setOrchestratorTimeout(Number(e.target.value));
                      markDirty();
                    }}
                  />
                  <i>sec</i>
                </div>
              </label>
            </div>
          </AdminPanel>

          {/* Orchestrator Deterministic Arbitration Rules (Table 14) */}
          <AdminPanel>
            <AdminPanelHead

              title="Orchestrator Deterministic Coordination Rules"
            />

            <div style={{ padding: '12px 18px' }}>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  {
                    pri: 'Priority 1',
                    condition: 'Risk Agent raises Hard Flag (duplicate invoice, duplicate payment, blacklisted vendor)',
                    result: 'Always routed to Human Review, regardless of tax verdict.',
                    tone: 'danger' as const,
                  },
                  {
                    pri: 'Priority 2',
                    condition: 'Compliance Agent reports non-compliance with high confidence',
                    result: 'Transaction blocked, regardless of risk score.',
                    tone: 'danger' as const,
                  },
                  {
                    pri: 'Priority 3',
                    condition: 'Risk Agent statistical anomaly score > threshold (Soft Flag)',
                    result: 'Routed to Human Review, even if tax reports valid.',
                    tone: 'warning' as const,
                  },
                  {
                    pri: 'Priority 4',
                    condition: 'Compliance Agent returns "uncertain, needs manual review"',
                    result: 'Routed to Human Review automatically.',
                    tone: 'warning' as const,
                  },
                  {
                    pri: 'Priority 5',
                    condition: 'Compliance = Valid AND Risk = Low/Normal (both high confidence)',
                    result: 'Auto-approved and payment voucher generated.',
                    tone: 'success' as const,
                  },
                  {
                    pri: 'Priority 6',
                    condition: 'Any agent is unresponsive or times out',
                    result: 'Task marked stuck; alert raised to Administrator.',
                    tone: 'info' as const,
                  },
                ].map((r) => (
                  <div
                    key={r.pri}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      paddingBottom: 8,
                      display: 'grid',
                      gridTemplateColumns: '70px 1fr auto',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <AdminBadge tone={r.tone}>{r.pri}</AdminBadge>
                    <div>
                      <strong style={{ fontSize: '9px', display: 'block' }}>{r.condition}</strong>
                      <small style={{ color: 'var(--text-muted)', fontSize: '8px' }}>{r.result}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AdminSettingRow
              checked={controls.routeSoftRiskFlagsToReview}
              description="Strictly enforce Priority 3 routing for Isolation Forest statistical outliers."
              title="Enforce Priority 3 Soft Risk Routing"
              onChange={(val) => updateControl('routeSoftRiskFlagsToReview', val)}
            />

            <AdminSettingRow
              checked={controls.autoRouteUncertainTaxToReview}
              description="Require human sign-off when clause is uncertain for tax compliance."
              title="Enforce Priority 4 Uncertain Tax Routing"
              onChange={(val) => updateControl('autoRouteUncertainTaxToReview', val)}
            />
          </AdminPanel>
        </div>
      </div>
    </div>
  );
};

export default PoliciesAIPage;
