// frontend/src/pages/finance/LivePages.tsx
// Real backend-connected versions of: Process Invoice, Review Queue, Reconciliation, Reports.
// Uses the same CSS classes as FinanceOfficerDashboard.css, so the look does not change.
import React, { useEffect, useRef, useState } from 'react';
import { api, downloadFile, money } from '../../utils/api';

// ---------- tiny shared UI ----------
type Tone = 'neutral' | 'success' | 'warning' | 'info';
const Badge = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) => (
    <span className={`badge badge-${tone}`}>{children}</span>
);
const Btn = ({
    children, kind = 'secondary', onClick, disabled, type = 'button',
}: {
    children: React.ReactNode; kind?: 'primary' | 'secondary' | 'quiet';
    onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit';
}) => (
    <button className={`action action-${kind}`} onClick={onClick} disabled={disabled} type={type}>
        <span>{children}</span>
    </button>
);
const ErrorBox = ({ text }: { text: string | null }) =>
    text ? (
        <div role="alert" style={{
            margin: '0 0 14px', padding: '10px 14px', border: '1px solid #e5b4b4',
            background: '#fdf0f0', color: '#9b1c1c', borderRadius: 4, fontSize: 12.5
        }}>{text}</div>
    ) : null;
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
const toneOf = (s: string): Tone =>
    ['approved', 'matched', 'compliant', 'none'].includes(s) ? 'success'
        : ['blocked', 'rejected', 'non_compliant', 'hard', 'mismatch', 'amount_mismatch'].includes(s) ? 'warning'
            : 'info';

// =====================================================================
// 1) PROCESS INVOICE  (upload -> review fields -> process -> voucher)
// =====================================================================
const FIELD_DEFS: [string, string, 'text' | 'date' | 'number'][] = [
    ['vendor_name', 'Supplier', 'text'],
    ['invoice_number', 'Invoice number', 'text'],
    ['invoice_date', 'Invoice date', 'date'],
    ['total_amount', 'Total amount', 'number'],
    ['tax_amount', 'Tax amount', 'number'],
    ['po_number', 'PO number', 'text'],
];

export function LiveInvoice() {
    const fileRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [up, setUp] = useState<any>(null);
    const [status, setStatus] = useState('');
    const [form, setForm] = useState<Record<string, string>>({});
    const [category, setCategory] = useState('goods');
    const [dirty, setDirty] = useState(false);
    const [result, setResult] = useState<any>(null);

    const reset = () => { setUp(null); setResult(null); setError(null); setDirty(false); };

    async function onFile(file: File) {
        reset();
        setBusy('Reading the document and extracting fields...');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const r = await api('/invoices/upload', { method: 'POST', form: fd });
            setUp(r);
            setStatus(r.status);
            const f: Record<string, string> = {};
            FIELD_DEFS.forEach(([k]) => { f[k] = r.fields?.[k] == null ? '' : String(r.fields[k]); });
            setForm(f);
            setCategory(r.fields?.category ?? 'goods');
        } catch (e) { setError(msg(e)); }
        setBusy(null);
    }

    function buildPayload() {
        const p: Record<string, unknown> = { category };
        FIELD_DEFS.forEach(([k, , type]) => {
            const v = (form[k] ?? '').trim();
            if (v === '') return;
            p[k] = type === 'number' ? Number(v.replace(/,/g, '')) : v;
        });
        return p;
    }

    async function saveFields() {
        const r = await api(`/invoices/${up.invoice_id}/fields`, { method: 'PUT', json: buildPayload() });
        setStatus(r.status);
        setDirty(false);
        return r.status as string;
    }

    async function processNow() {
        setError(null);
        try {
            let st = status;
            if (dirty || st === 'manual_queue') {
                setBusy('Saving your corrections...');
                st = await saveFields();
            }
            if (st !== 'extracted') {
                setError('Required fields are still missing: supplier, invoice number and total amount.');
                setBusy(null);
                return;
            }
            setBusy('Running match, tax and risk checks (the local AI writes the explanations, this can take a minute)...');
            setResult(await api(`/invoices/${up.invoice_id}/process`, { method: 'POST' }));
        } catch (e) { setError(msg(e)); }
        setBusy(null);
    }

    const conf = up ? Math.round((up.confidence ?? 0) * 100) : 0;

    return (
        <div className="page page-enter">
            <section className="opening compact-opening">
                <div>
                    <p className="date">Invoice workspace</p>
                    <h2>Process a supplier invoice</h2>
                    <p>Upload an invoice to extract, match, tax-check and risk-check it. Approved invoices get a voucher.</p>
                </div>
            </section>

            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />

            <ErrorBox text={error} />

            {busy && (
                <section className="panel" style={{ marginBottom: 16 }}>
                    <div className="panel-heading"><div><span className="eyebrow">Working</span><h3>{busy}</h3></div>
                        <Badge tone="warning">Please wait</Badge></div>
                </section>
            )}

            {!up && !busy && (
                <button className="upload-zone" type="button" onClick={() => fileRef.current?.click()}>
                    <strong>Choose an invoice file</strong>
                    <p>PDF, PNG, JPG or TXT</p>
                    <span className="action action-primary">Browse files from computer</span>
                </button>
            )}

            {up && (
                <section className="document-review">
                    <div className="panel extracted">
                        <div className="panel-heading">
                            <div><span className="eyebrow">Extracted data · invoice #{up.invoice_id}</span><h3>Review fields</h3></div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Badge tone={conf >= 80 ? 'success' : 'warning'}>{conf}% confidence</Badge>
                                {up.llm_used && <Badge tone="info">AI-assisted</Badge>}
                            </div>
                        </div>
                        {status === 'manual_queue' && (
                            <p style={{ fontSize: 12.5, color: '#9b6b00' }}>
                                Some required fields could not be read. Fill them in below, then press Process.
                            </p>
                        )}
                        {FIELD_DEFS.map(([k, label, type]) => (
                            <label key={k} className="field">
                                <span>{label}</span>
                                <div>
                                    <input type={type === 'number' ? 'text' : type} value={form[k] ?? ''}
                                        disabled={!!result}
                                        onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setDirty(true); }} />
                                </div>
                            </label>
                        ))}
                        <label className="field">
                            <span>Category</span>
                            <div>
                                <select value={category} disabled={!!result}
                                    onChange={(e) => { setCategory(e.target.value); setDirty(true); }}>
                                    <option value="goods">Goods</option>
                                    <option value="services">Services</option>
                                </select>
                            </div>
                        </label>
                        {!result && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                <Btn kind="primary" onClick={processNow} disabled={!!busy}>Process invoice</Btn>
                                <Btn kind="quiet" onClick={() => { reset(); fileRef.current?.click(); }} disabled={!!busy}>Upload another</Btn>
                            </div>
                        )}
                    </div>

                    {result && (
                        <div className="panel">
                            <div className="panel-heading">
                                <div><span className="eyebrow">Decision</span>
                                    <h3>{result.status === 'approved' ? 'Approved for payment'
                                        : result.status === 'pending_review' ? 'Sent to review queue'
                                            : result.status === 'blocked' ? 'Blocked' : result.status}</h3></div>
                                <Badge tone={toneOf(result.status)}>{result.status}</Badge>
                            </div>
                            <p style={{ fontSize: 13 }}>{result.reason}</p>
                            <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>Rule applied: {result.rule_applied}</p>

                            {result.match && (
                                <p style={{ fontSize: 12.5 }}><Badge tone={toneOf(result.match.status)}>Match: {result.match.status}</Badge>{' '}
                                    {result.match.details}</p>
                            )}
                            {result.tax && (
                                <p style={{ fontSize: 12.5 }}><Badge tone={toneOf(result.tax.status)}>Tax: {result.tax.status}</Badge>{' '}
                                    {result.tax.explanation}{' '}
                                    <small style={{ color: 'var(--muted)' }}>({result.tax.explained_by === 'ollama' ? 'explained by local AI' : 'template text'})</small></p>
                            )}
                            {result.risk && (
                                <p style={{ fontSize: 12.5 }}><Badge tone={toneOf(result.risk.flag)}>Risk: {result.risk.score} ({result.risk.flag})</Badge>{' '}
                                    {result.risk.explanation}{' '}
                                    <small style={{ color: 'var(--muted)' }}>({result.risk.explained_by === 'ollama' ? 'explained by local AI' : 'template text'})</small></p>
                            )}

                            {result.voucher && (
                                <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--line)', borderRadius: 4 }}>
                                    <span className="eyebrow">Voucher</span>
                                    <h3 style={{ margin: '4px 0' }}>{result.voucher.voucher_number}</h3>
                                    <p style={{ margin: 0, fontSize: 12.5 }}>Amount: <strong>{money(result.voucher.amount)}</strong></p>
                                    <p style={{ margin: '4px 0 10px', fontSize: 11, wordBreak: 'break-all', color: 'var(--muted)' }}>
                                        SHA-256: {result.voucher.batch_hash}</p>
                                    <Btn kind="primary" onClick={() =>
                                        downloadFile(`/payments/${result.voucher.payment_id}/file`, `${result.voucher.voucher_number}.csv`)
                                            .catch((e) => setError(msg(e)))}>Download payment file</Btn>
                                </div>
                            )}
                            <div style={{ marginTop: 14 }}>
                                <Btn kind="quiet" onClick={reset}>Process another invoice</Btn>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

// =====================================================================
// 2) REVIEW QUEUE  (GET /review/flagged, POST /review/{id}/decision)
// =====================================================================
export function LiveReview() {
    const [items, setItems] = useState<any[]>([]);
    const [sel, setSel] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<any>(null);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true);
        try { setItems(await api('/review/flagged')); setSel(0); } catch (e) { setError(msg(e)); }
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    const cur = items[sel];

    async function decide(decision: 'approve' | 'reject') {
        if (!cur) return;
        setBusy(true); setError(null);
        try {
            const r = await api(`/review/${cur.id}/decision`, {
                method: 'POST', json: decision === 'reject' ? { decision, reason: reason.trim() } : { decision },
            });
            setDone(r); setRejecting(false); setReason('');
            await load();
        } catch (e) { setError(msg(e)); }
        setBusy(false);
    }

    return (
        <div className="page page-enter">
            <section className="opening compact-opening">
                <div><p className="date">{items.length} open items</p><h2>Review queue</h2></div>
                <Btn kind="quiet" onClick={load}>Refresh</Btn>
            </section>

            <ErrorBox text={error} />

            {done && (
                <div style={{
                    margin: '0 0 14px', padding: '10px 14px', border: '1px solid #a9c4af',
                    background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 4, fontSize: 12.5
                }}>
                    Invoice #{done.invoice_id} {done.status}.{' '}
                    {done.voucher && <>Voucher <strong>{done.voucher.voucher_number}</strong> issued (hash {done.voucher.batch_hash.slice(0, 12)}…){' '}
                        <button type="button" className="action action-quiet" onClick={() =>
                            downloadFile(`/payments/${done.voucher.payment_id}/file`, `${done.voucher.voucher_number}.csv`)
                                .catch((e) => setError(msg(e)))}>Download</button></>}
                </div>
            )}

            {loading ? <p>Loading...</p> : items.length === 0 ? (
                <div className="panel"><p style={{ margin: 0 }}>Nothing is waiting for review.</p></div>
            ) : (
                <section className="review-layout">
                    <div className="review-list">
                        {items.map((it, i) => (
                            <button key={it.id} type="button" className={`review-row ${sel === i ? 'selected' : ''}`}
                                onClick={() => { setSel(i); setDone(null); }}>
                                <span><strong>{it.vendor_name}</strong><small>{it.invoice_number}</small></span>
                                <strong>{money(it.total_amount)}</strong>
                            </button>
                        ))}
                    </div>

                    {cur && (
                        <div className="panel review-detail">
                            <div className="panel-heading">
                                <div>
                                    <Badge tone="warning">{cur.decision?.rule_applied ?? 'Needs review'}</Badge>
                                    <h3>{cur.vendor_name} · {cur.invoice_number}</h3>
                                </div>
                                <strong>{money(cur.total_amount)}</strong>
                            </div>

                            <div className="evidence">
                                <div className="evidence-score">{cur.risk?.risk_score ?? '-'}</div>
                                <div>
                                    <strong>Why it was sent to you</strong>
                                    <p>{cur.decision?.reason}</p>
                                </div>
                            </div>

                            {cur.risk && <p style={{ fontSize: 12.5 }}><Badge tone={toneOf(cur.risk.flag_type)}>Risk {cur.risk.risk_score} ({cur.risk.flag_type})</Badge> {cur.risk.explanation}</p>}
                            {cur.tax && <p style={{ fontSize: 12.5 }}><Badge tone={toneOf(cur.tax.decision_status)}>Tax: {cur.tax.decision_status}</Badge> {cur.tax.explanation}</p>}
                            {cur.match && <p style={{ fontSize: 12.5 }}><Badge tone={toneOf(cur.match.match_status)}>Match: {cur.match.match_status}</Badge> {cur.match.details}</p>}
                            {cur.tax?.clause_id && (
                                <div className="clause"><small>Tax clause</small><p>{cur.tax.clause_id} · knowledge base {cur.tax.kb_version}</p></div>
                            )}

                            <div className="decision-actions">
                                <Btn onClick={() => setRejecting(true)} disabled={busy}>Reject with reason</Btn>
                                <Btn kind="primary" onClick={() => decide('approve')} disabled={busy}>Approve payment</Btn>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {rejecting && cur && (
                <div className="modal-backdrop" onClick={() => setRejecting(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><div><Badge tone="warning">Reject payment</Badge>
                            <h3>Reason is required</h3>
                            <small style={{ color: 'var(--muted)' }}>{cur.vendor_name} · {cur.invoice_number}</small></div></div>
                        <div className="modal-body">
                            <textarea className="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Bank account not verified with the supplier" />
                        </div>
                        <div className="modal-footer">
                            <Btn onClick={() => setRejecting(false)}>Cancel</Btn>
                            <Btn kind="primary" disabled={!reason.trim() || busy} onClick={() => decide('reject')}>Confirm rejection</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =====================================================================
// 3) RECONCILIATION  (upload statement, list, dispute email)
// =====================================================================
export function LiveReconcile() {
    const fileRef = useRef<HTMLInputElement>(null);
    const [rows, setRows] = useState<any[]>([]);
    const [summary, setSummary] = useState<Record<string, number> | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mail, setMail] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    async function load() {
        try { setRows(await api('/reconciliation')); } catch (e) { setError(msg(e)); }
    }
    useEffect(() => { load(); }, []);

    async function onFile(file: File) {
        setBusy(true); setError(null); setMail(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const r = await api('/reconciliation/upload', { method: 'POST', form: fd });
            setSummary(r.summary);
            await load();
        } catch (e) { setError(msg(e)); }
        setBusy(false);
    }

    async function draft(id: number) {
        setError(null); setCopied(false);
        try { setMail(await api('/reconciliation/dispute-email', { method: 'POST', json: { reconciliation_id: id } })); }
        catch (e) { setError(msg(e)); }
    }

    const label: Record<string, string> = {
        matched: 'Matched', amount_mismatch: 'Amount mismatch',
        unmatched_bank: 'Not in our records', unmatched_ledger: 'Not on bank statement',
    };

    return (
        <div className="page page-enter">
            <section className="opening compact-opening">
                <div><p className="date">Bank reconciliation</p><h2>Match the bank statement with issued vouchers</h2>
                    <p>CSV columns needed: date, description, amount, reference.</p></div>
                <Btn kind="primary" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Importing...' : 'Import statement'}</Btn>
            </section>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />

            <ErrorBox text={error} />

            {summary && (
                <div style={{ margin: '0 0 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(summary).map(([k, v]) => (
                        <Badge key={k} tone={toneOf(k)}>{label[k] ?? k}: {v}</Badge>
                    ))}
                </div>
            )}

            <div className="panel">
                <div className="panel-heading"><div><span className="eyebrow">Results</span><h3>Reconciliation records</h3></div>
                    <Btn kind="quiet" onClick={load}>Refresh</Btn></div>
                {rows.length === 0 ? <p style={{ margin: 0 }}>No statement imported yet.</p> : (
                    <div className="statement-table-wrapper">
                        <table className="statement-table">
                            <thead><tr><th>Status</th><th>Voucher</th><th>Bank reference</th><th>Voucher amount</th><th>Bank amount</th><th>Difference</th><th /></tr></thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id}>
                                        <td><Badge tone={toneOf(r.match_status)}>{label[r.match_status] ?? r.match_status}</Badge></td>
                                        <td>{r.payment?.voucher_number ?? '-'}</td>
                                        <td>{r.bank?.reference_number ?? '-'}</td>
                                        <td>{r.payment ? money(r.payment.amount) : '-'}</td>
                                        <td>{r.bank ? money(r.bank.amount) : '-'}</td>
                                        <td>{money(r.discrepancy_amount)}</td>
                                        <td>{r.match_status !== 'matched' && r.payment_id
                                            ? <Btn kind="quiet" onClick={() => draft(r.id)}>Draft dispute email</Btn> : null}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {mail && (
                <div className="modal-backdrop" onClick={() => setMail(null)}>
                    <div className="modal-card" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><div><Badge tone="warning">Dispute email</Badge><h3>{mail.subject}</h3></div></div>
                        <div className="modal-body">
                            <textarea className="reason-textarea" rows={10} readOnly value={mail.body} />
                        </div>
                        <div className="modal-footer">
                            <Btn onClick={() => { navigator.clipboard.writeText(`${mail.subject}\n\n${mail.body}`); setCopied(true); }}>
                                {copied ? 'Copied' : 'Copy draft'}</Btn>
                            {mail.mailto && <a className="action action-secondary" href={mail.mailto}>Open in email app</a>}
                            <Btn kind="primary" onClick={() => setMail(null)}>Close</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =====================================================================
// 4) REPORTS & FORECAST  (POST /reports/generate, POST /ledger)
// =====================================================================
type Tab = 'Summary' | 'Profit & loss' | 'Balance sheet' | 'Forecast';

export function LiveReports() {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [rep, setRep] = useState<any>(null);
    const [tab, setTab] = useState<Tab>('Summary');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [le, setLe] = useState({ entry_date: '', entry_type: 'revenue', category: 'sales', amount: '' });
    const [leMsg, setLeMsg] = useState<string | null>(null);

    async function generate() {
        setBusy(true); setError(null);
        try {
            const json: Record<string, string> = {};
            if (from) json.from_date = from;
            if (to) json.to_date = to;
            setRep(await api('/reports/generate', { method: 'POST', json }));
        } catch (e) { setError(msg(e)); }
        setBusy(false);
    }

    async function addLedger() {
        setLeMsg(null); setError(null);
        try {
            await api('/ledger', { method: 'POST', json: { ...le, amount: Number(le.amount) } });
            setLeMsg('Ledger entry saved. Generate the report again to include it.');
            setLe({ ...le, amount: '' });
        } catch (e) { setError(msg(e)); }
    }

    const pnl = rep?.pnl;
    const bs = rep?.balance_sheet;
    const fc = rep?.forecast;

    return (
        <div className="page page-enter">
            <section className="opening compact-opening">
                <div><p className="date">Management reporting</p><h2>Performance and forecast</h2>
                    <p>Built from the ledger. Leave the dates empty to use all data.</p></div>
            </section>

            <ErrorBox text={error} />

            <div className="panel" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label className="field"><span>From</span><div><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div></label>
                    <label className="field"><span>To</span><div><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></label>
                    <Btn kind="primary" onClick={generate} disabled={busy}>{busy ? 'Generating...' : 'Generate report'}</Btn>
                </div>
                <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12.5 }}>Add a ledger entry (revenue or expense)</summary>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
                        <label className="field"><span>Date</span><div><input type="date" value={le.entry_date} onChange={(e) => setLe({ ...le, entry_date: e.target.value })} /></div></label>
                        <label className="field"><span>Type</span><div>
                            <select value={le.entry_type} onChange={(e) => setLe({ ...le, entry_type: e.target.value })}>
                                <option value="revenue">Revenue</option><option value="expense">Expense</option></select></div></label>
                        <label className="field"><span>Category</span><div><input value={le.category} onChange={(e) => setLe({ ...le, category: e.target.value })} /></div></label>
                        <label className="field"><span>Amount</span><div><input value={le.amount} onChange={(e) => setLe({ ...le, amount: e.target.value })} /></div></label>
                        <Btn onClick={addLedger} disabled={!le.entry_date || !le.amount}>Save entry</Btn>
                    </div>
                    {leMsg && <p style={{ fontSize: 12, color: 'var(--green)' }}>{leMsg}</p>}
                </details>
            </div>

            {!rep ? <p style={{ fontSize: 13 }}>Press “Generate report” to see the figures.</p> : (
                <>
                    <div className="report-tabs">
                        {(['Summary', 'Profit & loss', 'Balance sheet', 'Forecast'] as Tab[]).map((t) => (
                            <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
                        ))}
                    </div>

                    {tab === 'Summary' && (
                        <section className="panel summary-copy">
                            <span className="eyebrow">Management summary · period {rep.period}</span>
                            <h3>{money(pnl.net_profit)} net {pnl.net_profit >= 0 ? 'profit' : 'loss'}</h3>
                            <p>{rep.summary}</p>
                        </section>
                    )}

                    {tab === 'Profit & loss' && (
                        <div className="statement-panel"><div className="statement-table-wrapper">
                            <table className="statement-table">
                                <thead><tr><th>Line item</th><th>Amount</th></tr></thead>
                                <tbody>
                                    <tr className="subtotal-row"><td>Revenue</td><td>{money(pnl.revenue)}</td></tr>
                                    <tr className="section-header"><td colSpan={2}>Expenses by category</td></tr>
                                    {Object.entries(pnl.expenses_by_category as Record<string, number>).map(([k, v]) => (
                                        <tr key={k}><td>{k}</td><td>{money(v)}</td></tr>
                                    ))}
                                    <tr className="subtotal-row"><td>Total expenses</td><td>{money(pnl.expenses)}</td></tr>
                                    <tr className="total-row"><td>Net profit</td><td>{money(pnl.net_profit)}</td></tr>
                                </tbody>
                            </table></div></div>
                    )}

                    {tab === 'Balance sheet' && (
                        <div className="statement-panel"><div className="statement-table-wrapper">
                            <table className="statement-table">
                                <thead><tr><th>Item</th><th>Amount</th></tr></thead>
                                <tbody>
                                    <tr className="section-header"><td colSpan={2}>Assets</td></tr>
                                    <tr><td>Cash</td><td>{money(bs.assets.cash)}</td></tr>
                                    <tr className="section-header"><td colSpan={2}>Liabilities</td></tr>
                                    <tr><td>Accounts payable (issued, not yet reconciled)</td><td>{money(bs.liabilities.accounts_payable)}</td></tr>
                                    <tr className="total-row"><td>Equity</td><td>{money(bs.equity)}</td></tr>
                                </tbody>
                            </table>
                            <p style={{ fontSize: 11.5, color: 'var(--muted)', padding: '8px 12px' }}>{bs.note}</p></div></div>
                    )}

                    {tab === 'Forecast' && (
                        <div className="statement-panel">
                            <div className="forecast-grid">
                                <div className="forecast-card"><span className="eyebrow">Method</span>
                                    <strong style={{ fontSize: 18 }}>{fc.method === 'linear_trend' ? 'Linear trend' : fc.method === 'moving_average' ? 'Moving average' : 'No data'}</strong>
                                    <p>{fc.note}</p></div>
                                {fc.values.map((v: number, i: number) => (
                                    <div className="forecast-card" key={i}><span className="eyebrow">Next month +{i + 1}</span>
                                        <strong style={{ color: v >= 0 ? 'var(--green)' : '#9b1c1c' }}>{money(v)}</strong>
                                        <p>Expected net cash flow</p></div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
