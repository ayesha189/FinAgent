import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Icon,
  Button,
  Badge,
  Section,
  PanelHeader,
  PageHeader,
  FeedbackBanner,
  EmptyState,
  type IconName,
} from "./ui";

function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "info",
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <span className={"stat-icon stat-" + tone}>
        <Icon name={icon} />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </div>
  );
}

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  entity: string;
  type: string;
  hash: string;
  previous: string;
  source: string;
  explanation: string;
}

export const initialAuditEntries: AuditEntry[] = [
  {
    id: "AUD-8421",
    time: "16 Jun 2026, 10:42:18",
    actor: "FinAgent",
    action: "Transaction approved",
    entity: "Invoice INV-2048",
    type: "Decision",
    hash: "8f3a…92cd",
    previous: "17bc…a901",
    source: "Three-way match; VAT-KB-17; Vendor master",
    explanation:
      "Auto-approved because the purchase order, goods receipt, invoice total, and verified supplier account matched within policy tolerance.",
  },
  {
    id: "AUD-8420",
    time: "16 Jun 2026, 10:31:04",
    actor: "Amara Mensah",
    action: "Human review completed",
    entity: "Invoice INV-2047",
    type: "Review",
    hash: "17bc…a901",
    previous: "62ae…1f0b",
    source: "Reviewer note; VAT-KB-22",
    explanation:
      "Approved after the Finance Officer confirmed the updated supplier bank details using independent evidence.",
  },
  {
    id: "AUD-8419",
    time: "16 Jun 2026, 10:18:52",
    actor: "FinAgent",
    action: "Transaction blocked",
    entity: "Invoice INV-2046",
    type: "Decision",
    hash: "62ae…1f0b",
    previous: "e203…7a48",
    source: "Duplicate detection; Risk rule HARD-04",
    explanation:
      "Blocked because the invoice number, vendor, amount, and issue date matched a transaction already posted.",
  },
  {
    id: "AUD-8418",
    time: "16 Jun 2026, 09:55:37",
    actor: "System Administrator",
    action: "Policy version activated",
    entity: "Knowledge base v4.2",
    type: "Configuration",
    hash: "e203…7a48",
    previous: "913d…44fe",
    source: "Administrative change record",
    explanation:
      "Knowledge-base version v4.2 was activated. Historical decisions remain linked to the version used at decision time.",
  },
  {
    id: "AUD-8417",
    time: "16 Jun 2026, 09:42:11",
    actor: "FinAgent",
    action: "Transaction flagged",
    entity: "Invoice INV-2045",
    type: "Decision",
    hash: "913d…44fe",
    previous: "b451…80aa",
    source: "Confidence threshold; Vendor verification",
    explanation:
      "Sent for human review because supplier identity confidence fell below the configured 87% threshold.",
  },
];

export interface DecisionRecord {
  invoice: string;
  vendor: string;
  amount: string;
  outcome: string;
  date: string;
  confidence: number;
  match: string;
  rule: string;
  reviewer: string;
  reason: string;
}

export const initialDecisions: DecisionRecord[] = [
  {
    invoice: "INV-2048",
    vendor: "Harbour Office Ltd.",
    amount: "Rs. 8,420.00",
    outcome: "Approved",
    date: "16 Jun 2026",
    confidence: 96,
    match: "Matched",
    rule: "Priority 1 · Hard constraints passed",
    reviewer: "Not required",
    reason: "All evidence aligned.",
  },
  {
    invoice: "INV-2047",
    vendor: "Blue Arc Logistics",
    amount: "Rs. 14,280.00",
    outcome: "Human-reviewed",
    date: "16 Jun 2026",
    confidence: 78,
    match: "Conditional",
    rule: "Priority 4 · Human escalation",
    reviewer: "Amara Mensah · Approved",
    reason: "Bank change independently confirmed.",
  },
  {
    invoice: "INV-2046",
    vendor: "Kite Systems Ltd.",
    amount: "Rs. 3,190.00",
    outcome: "Blocked",
    date: "16 Jun 2026",
    confidence: 99,
    match: "Duplicate",
    rule: "Priority 1 · Hard block",
    reviewer: "Not applicable",
    reason: "Exact duplicate of posted invoice INV-1981.",
  },
  {
    invoice: "INV-2045",
    vendor: "Northstar Advisory",
    amount: "Rs. 21,750.00",
    outcome: "Human-reviewed",
    date: "16 Jun 2026",
    confidence: 64,
    match: "Mismatch",
    rule: "Priority 3 · Low confidence",
    reviewer: "Pending",
    reason: "Supplier identity and tax treatment require verification.",
  },
];

export function AuditorDashboard() {
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState("Today, 10:40");

  const handleVerify = () => {
    setVerifying(true);
    window.setTimeout(() => {
      setVerifying(false);
      setLastVerified("Just now");
    }, 900);
  };

  return (
    <div className="page">
      <PageHeader
        title="Auditor Dashboard"

      />

      <Section className="chain-health">
        <div className="chain-status">
          <span>
            <Icon name="shield" />
          </span>
          <div>
            <Badge tone="success">
              <i />
              Verified
            </Badge>
            <h2>Audit log integrity confirmed</h2>
            <p>Last verification {lastVerified}</p>
          </div>
        </div>

        <Button
          disabled={verifying}
          icon="refresh"
          kind="primary"
          onClick={handleVerify}
        >
          {verifying ? "Verifying…" : "Verify now"}
        </Button>
      </Section>

      <div className="monitor-stats auditor-stats">
        <StatCard
          detail="Since 00:00"
          icon="monitor"
          label="Entries Logged Today"
          value="842"
        />
        <StatCard
          detail="68.4% of decisions"
          icon="check"
          label="Auto-approved"
          tone="success"
          value="576"
        />
        <StatCard
          detail="Sent to review"
          icon="warning"
          label="Flagged"
          tone="warning"
          value="91"
        />
        <StatCard
          detail="Hard controls applied"
          icon="lock"
          label="Blocked"
          tone="danger"
          value="24"
        />
        <StatCard
          detail="Finance Officer decisions"
          icon="users"
          label="Human-reviewed"
          value="151"
        />
      </div>

      <div className="auditor-dashboard-grid">
        <Section>
          <PanelHeader
            action={
              <Button kind="quiet" onClick={() => navigate("/auditor/audit-trail")}>
                View audit trail
              </Button>
            }

            title="Recent activity"
          />
          {initialAuditEntries.slice(0, 4).map((entry) => (
            <button
              key={entry.id}
              className="audit-activity"
              onClick={() => navigate("/auditor/audit-trail")}
              type="button"
            >
              <span
                className={
                  entry.action.includes("blocked")
                    ? "danger"
                    : entry.action.includes("review")
                      ? "warning"
                      : ""
                }
              >
                <Icon
                  name={
                    entry.action.includes("blocked")
                      ? "lock"
                      : entry.action.includes("review")
                        ? "user"
                        : "check"
                  }
                  size={15}
                />
              </span>
              <div>
                <strong>{entry.action}</strong>
                <p>
                  {entry.entity} · {entry.actor}
                </p>
              </div>
              <small>{entry.time.split(", ")[1]}</small>
              <Icon name="arrow" size={14} />
            </button>
          ))}
        </Section>

        <Section>
          <PanelHeader
            action={<Badge tone="info">Last 30 days</Badge>}
            title="Summary of Rules Applied"
          />
          <div className="arbitration-chart">
            {[
              ["P1", 84, "Hard controls"],
              ["P2", 63, "Exact match"],
              ["P3", 42, "Confidence"],
              ["P4", 31, "Human review"],
              ["P5", 18, "Soft flags"],
              ["P6", 9, "Fallback"],
            ].map(([rule, pct, label]) => (
              <div key={rule as string}>
                <span>{rule}</span>
                <i>
                  <b style={{ width: `${pct}%` }} />
                </i>
                <strong>{pct}%</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>
        </Section>
      </div>

    </div>
  );
}

export function AuditTrail() {
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("All action types");
  const [userFilter, setUserFilter] = useState("All users");
  const [entityType, setEntityType] = useState("All entity types");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry>(initialAuditEntries[0]);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [banner, setBanner] = useState("");

  const filteredEntries = initialAuditEntries.filter((item) => {
    const matchesSearch = item.entity.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionType === "All action types" || item.type === actionType;
    const matchesUser = userFilter === "All users" || item.actor === userFilter;
    const matchesEntity =
      entityType === "All entity types" ||
      (entityType === "Invoice"
        ? item.entity.includes("Invoice")
        : item.entity.includes("Knowledge base"));
    return matchesSearch && matchesAction && matchesUser && matchesEntity;
  });

  const handleRunVerify = () => {
    setVerifyStatus("running");
    window.setTimeout(() => setVerifyStatus("passed"), 1000);
  };

  return (
    <div className="page">
      <PageHeader
        title="Audit Trail"

        actions={
          <>
            <Button
              icon="download"
              onClick={() => setBanner("Filtered audit log PDF prepared from prototype records.")}
            >
              Export PDF
            </Button>
            <Button
              icon="download"
              kind="primary"
              onClick={() => setBanner("Filtered audit log CSV prepared from prototype records.")}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {banner && <FeedbackBanner>{banner}</FeedbackBanner>}

      <div className="audit-integrity-layout">
        <Section>
          <PanelHeader
            action={
              <div className="integrity-actions">
                <Button kind="quiet" onClick={() => setVerifyStatus("failed")}>
                  Preview failure
                </Button>
                <Button
                  disabled={verifyStatus === "running"}
                  icon="shield"
                  kind="primary"
                  onClick={handleRunVerify}
                >
                  {verifyStatus === "running" ? "Verifying…" : "Run verification"}
                </Button>
              </div>
            }
            eyebrow="Hash-chain assurance"
            title="Integrity check"
          />
          <div className="integrity-body">
            <div className={`integrity-score ${verifyStatus === "failed" ? "failed" : ""}`}>
              <span>
                <Icon name={verifyStatus === "failed" ? "warning" : "check"} />
              </span>
              <div>
                <strong>
                  {verifyStatus === "running"
                    ? "Checking 5,842 entries"
                    : verifyStatus === "failed"
                      ? "Chain integrity failure"
                      : "Chain verified"}
                </strong>
                <p>
                  {verifyStatus === "running"
                    ? "Recomputing linked hashes…"
                    : verifyStatus === "failed"
                      ? "The first invalid link was found at AUD-8419."
                      : "No missing or modified records detected."}
                </p>
              </div>
            </div>
            {verifyStatus === "running" && (
              <div className="verify-progress">
                <i />
              </div>
            )}
            {verifyStatus === "passed" && (
              <FeedbackBanner>
                Verification passed. Every previous hash matches the next entry.
              </FeedbackBanner>
            )}
            {verifyStatus === "failed" && (
              <FeedbackBanner tone="error">
                Tampering alert: AUD-8419 does not match its recorded previous hash. Preserve evidence and escalate immediately.
              </FeedbackBanner>
            )}
          </div>
        </Section>

        <Section>
          <PanelHeader
            action={
              <Badge tone={verifyStatus === "failed" ? "danger" : "success"}>
                {verifyStatus === "failed" ? "Break detected" : "Verified"}
              </Badge>
            }
            eyebrow="Linked record sequence"
            title="Chain visualization"
          />
          <div className={`chain-blocks ${verifyStatus === "failed" ? "has-break" : ""}`}>
            {initialAuditEntries.slice(0, 4).map((entry, index) => (
              <div
                key={entry.id}
                className={verifyStatus === "failed" && index >= 2 ? "broken" : ""}
              >
                <span>
                  <Icon
                    name={verifyStatus === "failed" && index >= 2 ? "warning" : "check"}
                    size={14}
                  />
                </span>
                <strong>{entry.id}</strong>
                <small>{entry.hash}</small>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section>
        <PanelHeader title="Audit event log" />
        <div className="filter-bar audit-filters">
          <label className="search-field">
            <Icon name="search" size={15} />
            <input
              aria-label="Search audit trail"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entity or invoice"
              value={search}
            />
          </label>
          <select aria-label="Date range">
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <select
            aria-label="User"
            onChange={(e) => setUserFilter(e.target.value)}
            value={userFilter}
          >
            <option>All users</option>
            <option>FinAgent</option>
            <option>Amara Mensah</option>
            <option>System Administrator</option>
          </select>
          <select
            aria-label="Action type"
            onChange={(e) => setActionType(e.target.value)}
            value={actionType}
          >
            <option>All action types</option>
            <option>Decision</option>
            <option>Review</option>
            <option>Configuration</option>
          </select>
          <select
            aria-label="Entity type"
            onChange={(e) => setEntityType(e.target.value)}
            value={entityType}
          >
            <option>All entity types</option>
            <option>Invoice</option>
            <option>Knowledge base</option>
          </select>
        </div>

        {filteredEntries.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Hash</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((item) => (
                  <tr
                    key={item.id}
                    className={selectedEntry.id === item.id ? "selected-row" : ""}
                  >
                    <td data-label="Timestamp">{item.time}</td>
                    <td data-label="Actor">
                      <strong>{item.actor}</strong>
                    </td>
                    <td data-label="Action">{item.action}</td>
                    <td data-label="Entity">{item.entity}</td>
                    <td data-label="Hash">
                      <code>{item.hash}</code>
                    </td>
                    <td data-label="Record">
                      <Button kind="quiet" onClick={() => setSelectedEntry(item)}>
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            text="Change the date, user, action type, entity type, or search text."
            title="No entries match your selected filters"
          />
        )}


      </Section>

      <Section className="entry-detail">
        <PanelHeader
          action={<Badge tone="success">Hash linked</Badge>}
          eyebrow={selectedEntry.id}
          title="Entry detail"
        />
        <div className="entry-detail-grid">
          <div>
            <span>Timestamp</span>
            <strong>{selectedEntry.time}</strong>
          </div>
          <div>
            <span>Actor</span>
            <strong>{selectedEntry.actor}</strong>
          </div>
          <div>
            <span>Action</span>
            <strong>{selectedEntry.action}</strong>
          </div>
          <div>
            <span>Entity</span>
            <strong>{selectedEntry.entity}</strong>
          </div>
          <div>
            <span>Previous hash</span>
            <code>{selectedEntry.previous}</code>
          </div>
          <div>
            <span>Current hash</span>
            <code>{selectedEntry.hash}</code>
          </div>
        </div>
        <div className="evidence-detail">
          <div>
            <span>Decision explanation</span>
            <p>{selectedEntry.explanation}</p>
          </div>
          <div>
            <span>Sources</span>
            <p>{selectedEntry.source}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

export function DecisionReview() {
  const [selectedDecision, setSelectedDecision] = useState<DecisionRecord>(initialDecisions[0]);
  const [outcomeFilter, setOutcomeFilter] = useState("All outcomes");

  const filteredDecisions =
    outcomeFilter === "All outcomes"
      ? initialDecisions
      : initialDecisions.filter((d) => d.outcome === outcomeFilter);

  const confidenceTone =
    selectedDecision.confidence >= 90
      ? "success"
      : selectedDecision.confidence >= 70
        ? "warning"
        : "danger";

  return (
    <div className="page">
      <PageHeader
        title="Decision Review"


      />

      <div className="review-layout">
        <Section className="transaction-list">
          <PanelHeader
            action={
              <select
                aria-label="Filter decision outcomes"
                onChange={(e) => setOutcomeFilter(e.target.value)}
                value={outcomeFilter}
              >
                <option>All outcomes</option>
                <option>Approved</option>
                <option>Blocked</option>
                <option>Human-reviewed</option>
              </select>
            }
            eyebrow="Recorded outcomes"
            title="Transactions"
          />
          {filteredDecisions.map((decision) => (
            <button
              key={decision.invoice}
              className={selectedDecision.invoice === decision.invoice ? "active" : ""}
              onClick={() => setSelectedDecision(decision)}
              type="button"
            >
              <div>
                <strong>{decision.invoice}</strong>
                <Badge
                  tone={
                    decision.outcome === "Approved"
                      ? "success"
                      : decision.outcome === "Blocked"
                        ? "danger"
                        : "warning"
                  }
                >
                  {decision.outcome}
                </Badge>
              </div>
              <p>{decision.vendor}</p>
              <span>
                <strong>{decision.amount}</strong>
                <small>{decision.date}</small>
              </span>
            </button>
          ))}
        </Section>

        <div className="decision-panels">
          <Section>
            <PanelHeader
              action={<Badge tone={confidenceTone}>{selectedDecision.confidence}% confidence</Badge>}
              eyebrow={`${selectedDecision.invoice} · ${selectedDecision.date}`}
              title="Decision evidence"
            />
            <div className="invoice-summary">
              <div>
                <span>Vendor</span>
                <strong>{selectedDecision.vendor}</strong>
              </div>
              <div>
                <span>Total amount</span>
                <strong>{selectedDecision.amount}</strong>
              </div>
              <div>
                <span>Invoice date</span>
                <strong>14 Jun 2026</strong>
              </div>
              <div>
                <span>VAT number</span>
                <strong>GB 214 8891 04</strong>
              </div>
            </div>
            <div className="confidence-fields">
              {[
                ["Invoice number", 99],
                ["Vendor identity", selectedDecision.confidence],
                ["Total amount", 98],
                ["Tax amount", 91],
              ].map(([fieldName, conf]) => (
                <div key={fieldName as string}>
                  <span>{fieldName}</span>
                  <Badge tone={Number(conf) >= 90 ? "success" : Number(conf) >= 70 ? "warning" : "danger"}>
                    {conf}%
                  </Badge>
                </div>
              ))}
            </div>
          </Section>

          <div className="decision-grid">
            <Section>
              <PanelHeader
                eyebrow="Purchase order · receipt · invoice"
                title="Three-way match"
              />
              <div className="decision-callout">
                <span
                  className={
                    selectedDecision.match === "Matched"
                      ? "success"
                      : selectedDecision.match === "Duplicate"
                        ? "danger"
                        : "warning"
                  }
                >
                  <Icon
                    name={selectedDecision.match === "Matched" ? "check" : "warning"}
                  />
                </span>
                <div>
                  <strong>{selectedDecision.match}</strong>
                  <p>
                    {selectedDecision.match === "Matched"
                      ? "Quantity, unit price, and received goods agree."
                      : "The evidence requires additional attention."}
                  </p>
                </div>
              </div>
            </Section>

            <Section>
              <PanelHeader
                action={<Badge tone="info">KB v4.2</Badge>}
                eyebrow="Tax determination"
                title="VAT verdict"
              />
              <div className="tax-verdict">
                <strong>Standard-rated · 20%</strong>
                <p>
                  <b>Clause VAT-KB-17:</b> Standard supply of business services within the United Kingdom.
                </p>
                <small>Knowledge base last updated 12 Jun 2026</small>
              </div>
            </Section>
          </div>

          <Section>
            <PanelHeader eyebrow="Control precedence" title="Risk and arbitration" />
            <div className="risk-arbitration">
              <div>
                <Badge tone={selectedDecision.outcome === "Blocked" ? "danger" : "warning"}>
                  {selectedDecision.outcome === "Blocked" ? "Hard flag" : "Soft flag"}
                </Badge>
                <strong>
                  {selectedDecision.outcome === "Blocked"
                    ? "Duplicate transaction evidence"
                    : "Supplier and evidence review"}
                </strong>
                <p>{selectedDecision.reason}</p>
              </div>
              <div>
                <span>Arbitration rule applied</span>
                <strong>{selectedDecision.rule}</strong>
                <p>Higher-priority hard controls override confidence-based recommendations.</p>
              </div>
            </div>
          </Section>

          <Section>
            <PanelHeader
              action={
                <Badge
                  tone={selectedDecision.reviewer === "Pending" ? "warning" : "neutral"}
                >
                  {selectedDecision.reviewer === "Not required" ||
                    selectedDecision.reviewer === "Not applicable"
                    ? "No review"
                    : "Human review"}
                </Badge>
              }

              title="Reviewer outcome"
            />
            <div className="reviewer-record">
              <Icon name="user" />
              <div>
                <strong>{selectedDecision.reviewer}</strong>
                <p>{selectedDecision.reason}</p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export function ReportsForecast() {
  const [reportType, setReportType] = useState("Profit & Loss");
  const [period, setPeriod] = useState("Year to date · Jun 2026");

  const statementRows =
    reportType === "Balance Sheet"
      ? [
        ["Cash and equivalents", "Rs.482,900"],
        ["Trade receivables", "Rs.318,450"],
        ["Total assets", "Rs.1,284,700"],
        ["Current liabilities", "Rs.426,320"],
        ["Net assets", "Rs.858,380"],
      ]
      : [
        ["Revenue", "Rs.1,842,600"],
        ["Cost of sales", "(Rs.914,200)"],
        ["Gross profit", "Rs.928,400"],
        ["Operating expenses", "(Rs.521,780)"],
        ["Net profit", "Rs.406,620"],
      ];

  return (
    <div className="page">
      <PageHeader
        title="Reports & Forecast"

      />

      <Section>
        <div className="report-controls">
          <label className="field">
            <span>Report type</span>
            <select onChange={(e) => setReportType(e.target.value)} value={reportType}>
              <option>Profit & Loss</option>
              <option>Balance Sheet</option>
              <option>Management Summary</option>
            </select>
          </label>
          <label className="field">
            <span>Reporting period</span>
            <select onChange={(e) => setPeriod(e.target.value)} value={period}>
              <option>Year to date · Jun 2026</option>
              <option>Q2 2026</option>
              <option>May 2026</option>
            </select>
          </label>
          <Button icon="download">Download stored PDF</Button>
        </div>
      </Section>

      <div className="reports-layout">
        <Section>
          <PanelHeader
            action={<Badge tone="success">Stored 16 Jun 2026, 06:00</Badge>}
            eyebrow={period}
            title={reportType}
          />
          <div className="statement">
            {statementRows.map(([label, val], idx) => (
              <div
                key={label}
                className={idx === statementRows.length - 1 ? "total" : ""}
              >
                <span>{label}</span>
                <strong>{val}</strong>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <PanelHeader title="Executive summary" />
          <div className="management-summary">
            <p>
              Revenue remains ahead of the comparable period, supported by recurring service contracts and improved collection timing.
            </p>
            <p>
              Gross margin is stable. Operating expenses increased due to planned infrastructure and compliance investment.
            </p>
            <div>
              <Icon name="eye" />
              <span>
                <strong>Auditor note</strong>
                <small>This is a stored management summary, not an independent assurance opinion.</small>
              </span>
            </div>
          </div>
        </Section>
      </div>

      <Section>
        <PanelHeader

          eyebrow="Next six months"
          title="Cash-flow forecast"
        />
        <FeedbackBanner tone="warning">
          Limited history: this estimate uses 14 months of ledger data. Treat the forecast as directional, not guaranteed.
        </FeedbackBanner>
        <div className="forecast-chart">
          {[52, 61, 58, 69, 74, 82].map((heightPct, idx) => (
            <div key={idx}>
              <strong>Rs.{[410, 438, 426, 461, 479, 512][idx]}k</strong>
              <i style={{ height: `${heightPct}%` }} />
              <span>{["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][idx]}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function TaxAnnexures() {
  const [taxType, setTaxType] = useState("VAT");
  const [period, setPeriod] = useState("Q2 2026");

  const annexureRows: [string, string, string, string, number][] = [
    ["ANX-1042", "Harbour Office Ltd.", "Rs.1,403.33", "VAT-KB-17", 96],
    ["ANX-1041", "Blue Arc Logistics", "Rs.2,380.00", "VAT-KB-17", 91],
    ["ANX-1039", "Northstar Advisory", "Rs.3,625.00", "VAT-KB-22", 74],
    ["ANX-1038", "Cedar Telecom", "Rs.482.50", "VAT-KB-09", 88],
  ];

  return (
    <div className="page">
      <PageHeader
        title="Tax Annexures"
        actions={<Button icon="download">Export annexure</Button>}
      />

      <Section>
        <div className="report-controls">
          <label className="field">
            <span>Tax type</span>
            <select onChange={(e) => setTaxType(e.target.value)} value={taxType}>
              <option>VAT</option>
              <option>Corporation Tax</option>
              <option>PAYE</option>
            </select>
          </label>
          <label className="field">
            <span>Tax period</span>
            <select onChange={(e) => setPeriod(e.target.value)} value={period}>
              <option>Q2 2026</option>
              <option>Q1 2026</option>
              <option>FY 2025</option>
            </select>
          </label>
          <div className="annexure-meta">
            <span>Knowledge base</span>
            <strong>v4.2 · Updated 12 Jun 2026</strong>
          </div>
        </div>
      </Section>

      <Section>
        <PanelHeader
          action={<Badge tone="neutral">{taxType} · {period}</Badge>}
          eyebrow="Included records"
          title="Annexure table"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entry</th>
                <th>Supplier</th>
                <th>Tax amount</th>
                <th>Cited clause</th>
                <th>Confidence</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {annexureRows
                .filter((row) => row[4] >= 80)
                .map((row) => (
                  <tr key={row[0]}>
                    <td data-label="Entry">
                      <strong>{row[0]}</strong>
                    </td>
                    <td data-label="Supplier">{row[1]}</td>
                    <td data-label="Tax amount">{row[2]}</td>
                    <td data-label="Cited clause">
                      <code>{row[3]}</code>
                    </td>
                    <td data-label="Confidence">
                      <Badge tone={row[4] >= 90 ? "success" : "warning"}>
                        {row[4]}%
                      </Badge>
                    </td>
                    <td data-label="Record">
                      <Button kind="quiet">View</Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section>
        <PanelHeader
          action={<Badge tone="warning">1 requires attention</Badge>}
          eyebrow="Excluded from annexure"
          title="Manual verification list"
        />
        <div className="manual-verification">
          <span>
            <Icon name="warning" />
          </span>
          <div>
            <strong>ANX-1039 · Northstar Advisory</strong>
            <p>Excluded because tax-clause confidence is 74%, below the 80% annexure threshold.</p>
          </div>
          <Badge tone="warning">74% confidence</Badge>
          <Button kind="quiet">Inspect evidence</Button>
        </div>
      </Section>
    </div>
  );
}

export function FinBot() {
  const [messages, setMessages] = useState<
    { from: "bot" | "user"; text: string; sources?: string }[]
  >([
    {
      from: "bot",
      text: "Ask about ledger entries, tax decisions, anomaly flags, or audit records. I will only return information available to the Auditor role.",
      sources: "Auditor permissions applied",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userQuery = input.trim();
    const queryLower = userQuery.toLowerCase();

    let botResponse = {
      text: "Not found in the records available to your Auditor permissions. Try an invoice number, audit entry ID, or tax clause.",
      sources: "No matching database record",
    };

    if (
      queryLower.includes("inv-2046") ||
      queryLower.includes("duplicate") ||
      queryLower.includes("aud-8419")
    ) {
      botResponse = {
        text: "INV-2046 was blocked by hard rule HARD-04 because its invoice number, vendor, amount, and date matched a previously posted transaction.",
        sources: "Audit entry AUD-8419 · Decision Review",
      };
    } else if (queryLower.includes("vat")) {
      botResponse = {
        text: "The current VAT annexure uses knowledge base v4.2. Three records meet the 80% confidence threshold; ANX-1039 is excluded for manual verification.",
        sources: "Tax Annexures · VAT-KB-17 · VAT-KB-22",
      };
    }

    setMessages((prev) => [
      ...prev,
      { from: "user", text: userQuery },
      { from: "bot", ...botResponse },
    ]);
    setInput("");
  };

  return (
    <div className="page finbot-page">
      <PageHeader
        title="FinBot"

      />

      <Section className="chat-panel">
        <PanelHeader


          title="Ask FinBot"
        />
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.from}`}>
              {msg.from === "bot" && (
                <span>
                  <Icon name="bot" />
                </span>
              )}
              <div>
                <small>{msg.from === "bot" ? "FinBot" : "You"}</small>
                <p>{msg.text}</p>
                {msg.sources && (
                  <em>
                    <Icon name="report" size={13} />
                    {msg.sources}
                  </em>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="suggested-prompts">
          {[
            "Why was INV-2046 blocked?",
            "Summarise the VAT annexure",
            "Find audit entry AUD-8419",
          ].map((promptText) => (
            <button
              key={promptText}
              onClick={() => setInput(promptText)}
              type="button"
            >
              {promptText}
            </button>
          ))}
        </div>

        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <label>
            <Icon name="search" />
            <input
              aria-label="Ask FinBot"
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about an invoice, clause, anomaly, or audit entry…"
              value={input}
            />
          </label>
          <Button
            disabled={!input.trim()}
            icon="arrow"
            kind="primary"
            type="submit"
          >
            Send
          </Button>
        </form>
      </Section>
    </div>
  );
}

