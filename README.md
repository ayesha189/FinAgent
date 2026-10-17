<div align="center">

<img src="public\finagent_system_logo.jpg" alt="FinAgent" width="170" />

# FinAgent

### Smarter Finance. Clearer Decisions.

An on-premise, multi-agent finance automation platform for invoice processing, tax compliance, risk detection, bank reconciliation and forecasting, with every decision explained and recorded in a tamper-evident audit log.


</div>

---


## About the project

FinAgent automates the repetitive work of a finance department while keeping people in control of the decisions that matter. Documents are read, checked against tax rules and risk signals, matched to records and summarised, and the outcome is presented with the reasoning behind it so that a finance officer can accept, question or override it.

The platform is designed for organisations that cannot send financial data to external services. Language-model processing runs locally, and all records stay on the organisation's own infrastructure.

## Key principles

| Principle | What it means in FinAgent |
|---|---|
| **Explainability** | Every approval, block or flag is accompanied by a plain-language reason, the tax clause relied upon and the rule that determined the outcome. |
| **Verifiability** | Audit records are linked by SHA-256 hashes. Any modification or deletion breaks the chain and is detected on verification. |
| **Data sovereignty** | Local model inference and an on-premise database. No financial data leaves the organisation. |
| **Separation of duties** | Administration, transaction handling and oversight are held by different roles, enforced on the server. |
| **Human control** | High-value, low-confidence or conflicting decisions are routed to a person rather than decided automatically. |

## Roles and capabilities

| Role | Responsibilities |
|---|---|
| **Finance Officer** | Process invoices, review flagged transactions, reconcile bank statements, draft dispute emails, generate tax annexures and payment vouchers, view reports and forecasts. |
| **Auditor** | Read-only oversight: audit trail with hash-chain verification, decision review, reports and forecasts, tax annexures. |
| **Administrator** | Approve or reject registrations, manage users and roles, configure policies and thresholds, monitor system health, view the audit trail. |

The **primary administrator** is a single seeded account with additional authority. Only the primary administrator can approve or create other administrators or change another administrator's status. The primary administrator cannot be blocked, and the system refuses to block the last active administrator.

### Use cases

- Log in
- Process invoice, including OCR data extraction, tax compliance check and risk and anomaly detection, extended by flagged-transaction review and payment voucher generation
- Reconcile bank statement, extended by dispute email drafting
- Generate tax annexure, extended by deadline alerts
- View reports and forecast
- View audit trail
- Manage system settings

## System architecture

```
┌──────────────────────────┐          ┌────────────────────────────────┐
│  React + TypeScript      │   JWT    │  FastAPI backend               │
│  Role-based dashboards   │◄────────►│  Authentication · Administration│
└──────────────────────────┘  HTTPS   │  Audit log · Reconciliation    │
                                      └───────┬─────────────────┬──────┘
                                              │                 │
                                   ┌──────────▼─────┐   ┌───────▼─────────┐
                                   │  PostgreSQL    │   │  Ollama         │
                                   │  (SQLite, dev) │   │  local LLM      │
                                   └────────────────┘   └─────────────────┘
```

An orchestrator coordinates four specialised agents and combines their outputs using fixed priority rules into one of four outcomes: approved, blocked, flagged for review, or uncertain.

| Agent | Responsibility |
|---|---|
| Transaction Processing | OCR and structuring, three-way match, bank reconciliation, payment vouchers |
| Compliance and Tax | Transaction classification, clause retrieval, compliance verdict with citation |
| Risk and Anomaly | Duplicate, blacklist, outlier and behavioural checks with explanations |
| Analytics and Reporting | Financial statements, management summaries, cash-flow forecasting |

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide icons, Motion |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Security | bcrypt password hashing, signed JWT access tokens, role-based access control |
| Data | PostgreSQL (SQLite for local development) |
| AI and documents | Ollama (local language models), Tesseract OCR, poppler |

## Repository structure

```
.
├── src/
│   ├── main.tsx · App.tsx · routes.tsx       Application entry and routing
│   ├── pages/
│   │   ├── Home.tsx                          Landing page
│   │   ├── LoginPage.tsx                     Sign in
│   │   ├── RegistrationPage.tsx              Access request
│   │   ├── admin/                            Administrator console
│   │   │   ├── AdminShell.tsx                Navigation and top bar
│   │   │   ├── AdminOverviewPage.tsx
│   │   │   ├── UserManagementPage.tsx
│   │   │   ├── PendingRegistrations.tsx
│   │   │   ├── PoliciesAIPage.tsx
│   │   │   ├── IntegrationsSecurityPage.tsx
│   │   │   └── MonitoringAuditPage.tsx
│   │   └── finance/                          Finance Officer workspace
│   ├── auditor-shell.tsx · auditor-pages.tsx Auditor portal
│   └── utils/reconciliationParser.ts         Statement parsing helpers
├── auth_module.py                            API: authentication, registration, administration
├── reconciliation_parser.py                  Rule-based reconciliation engine
├── public/                                   Static assets
└── README.md
```

## Getting started

### Prerequisites

- Node.js 20 or later
- Python 3.10 or later
- `tesseract-ocr` and `poppler-utils` (only for scanned bank statements)

### Frontend

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:3000`.

### Backend

```bash
python -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate

pip install fastapi uvicorn sqlalchemy "passlib[bcrypt]" "bcrypt<4.1" \
            python-jose email-validator pydantic

python auth_module.py                     # creates the primary administrator (once)
uvicorn auth_module:app --reload          # serves the API at http://localhost:8000
```

Interactive API documentation is available at `http://localhost:8000/docs`.

> **Cross-origin access.** The API currently allows requests only from `http://localhost:5173`. The frontend runs on port 3000, so add `"http://localhost:3000"` to `allow_origins` in `auth_module.py` before connecting the two.

### First sign-in

Sign in with the primary administrator created by the seed command. Unless overridden through environment variables, the development defaults are:

| Email | Password |
|---|---|
| `finagent@finagent.local` | `12341234` |

These defaults are for local development only. Set your own values before sharing or deploying.

## Configuration

### Backend

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./finagent.db` |
| `JWT_SECRET` | Key used to sign access tokens. Use a long random value. | `CHANGE-ME-in-env-file` |
| `PRIMARY_ADMIN_EMAIL` | Email of the seeded primary administrator | `finagent@finagent.local` |
| `PRIMARY_ADMIN_PASSWORD` | Password of the seeded primary administrator | `12341234` |
| `PRIMARY_ADMIN_NAME` | Display name of the primary administrator | `finagent` |

```bash
export DATABASE_URL="postgresql+psycopg2://finagent:password@localhost:5432/finagent"
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
```

### Frontend

Create `.env.local` (ignored by git):

```bash
VITE_API_URL=http://localhost:8000
```

## Authentication and approval workflow

1. A person requests access from the registration page and selects a role.
2. The server stores the request with status `pending`. A client can never set its own status.
3. An administrator reviews the request under **Pending Registrations**. Administrator requests are visible to, and decided by, the primary administrator only.
4. Approval sets the status to `active` and the user can sign in. Rejected, pending and blocked accounts receive a clear message and no token.
5. Every API request re-reads the account from the database, so blocking or changing a role takes effect immediately.

Account states: `pending` · `active` · `rejected` · `blocked`

Guarantees enforced by the API:

- Approval can never promote a user to administrator.
- Only the primary administrator can create administrator accounts.
- The primary administrator and the last active administrator cannot be blocked.
- Every administrative action is written to the audit log.

## Security

- Passwords are hashed with bcrypt. Access tokens are signed JWTs that expire after 60 minutes.
- Authorisation is enforced on the server using the role stored in the database. Interface-level hiding is a convenience, not a control.
- Request schemas reject unknown fields, preventing clients from supplying privileged attributes.
- Audit records are hash-chained and append-only. Verification recomputes the chain and reports the first broken entry.
- Secrets are supplied through environment variables, and `.env*` files are excluded from version control.
- Before any non-local deployment: replace the default credentials, set a strong `JWT_SECRET`, serve over HTTPS, and add rate limiting to the login and registration endpoints.

## Implementation status

| Area | Status |
|---|---|
| Landing, login and registration pages | Interface complete. Login is connected to the API. Registration is not yet connected. |
| Administrator: Pending Registrations | Connected to the API |
| Administrator: Overview, User Management, Policies and AI, Integrations and Security, Monitoring and Audit | Interface complete, using sample data |
| Finance Officer workspace | Interface complete, using sample data. Reconciliation matching logic implemented in `reconciliation_parser.py` and `reconciliationParser.ts` |
| Auditor portal | Interface complete, using sample data |
| Hash-chained audit log | Designed. Backend implementation in progress |
| Orchestrator and the four agents | Planned |
| Local model integration (Ollama) | Planned |

## Roadmap

- [ ] Connect the registration form to the API
- [ ] Connect User Management and the administrator overview to live data
- [ ] Password recovery by emailed reset link, and administrator-assisted reset
- [ ] Hash-chained audit log with verification endpoint and live auditor screens
- [ ] Invoice processing pipeline: OCR, extraction, three-way match
- [ ] Rule-based tax compliance and risk checks, then the orchestrator
- [ ] Bank statement upload, parsing and reconciliation endpoints
- [ ] Reports and cash-flow forecasting with a fallback for short histories
- [ ] Containerised deployment with Docker Compose

## Project information

| | |
|---|---|
| **Project** | FinAgent, Final Year Project |
| **Team** | Ayesha Rauf ,Aqsa Ishaq , Musfira Umer |
| **Supervisor** | Miss Aqsa Younas|
| **Institution** | Fast-Nuces |
