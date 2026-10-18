import os, json
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import audit
import agents
from database import Base, engine, get_db, SessionLocal
from models import *
from security import (FO, ADMIN, AUDITOR, hash_password, check_password,
                      create_token, current_user, require)

DEFAULT_SETTINGS = {"approval_limit": 500000, "risk_limit": 40,
                    "high_amount": 100000, "ocr_confidence_min": 0.5}


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        # First-time users are created ONLY if SEED_PASSWORD is set (no passwords are kept in code).
        seed_pw = os.getenv("SEED_PASSWORD")
        if not db.query(User).first() and seed_pw:
            for name, email, role in [
                ("Ayesha Rauf", os.getenv("ADMIN_EMAIL", "ayesharauf189@gmail.com"), ADMIN),
                ("Aqsa Ishaq", os.getenv("OFFICER_EMAIL", "aqsaishaq573@gmail.com"), FO),
                ("Auditor", os.getenv("AUDITOR_EMAIL", "auditor@finagent.local"), AUDITOR)]:
                db.add(User(name=name, email=email, password_hash=hash_password(seed_pw), role=role))
        for k, v in DEFAULT_SETTINGS.items():
            if not db.get(Setting, k):
                db.add(Setting(key=k, value=v))
        db.commit()
    yield


app = FastAPI(title="FinAgent Backend", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def get_settings(db):
    s = dict(DEFAULT_SETTINGS)
    s.update({r.key: r.value for r in db.query(Setting).all()})
    return s


def get_or_create_vendor(db, name):
    v = db.query(Vendor).filter(Vendor.name.ilike(name)).first()
    if not v:
        v = Vendor(name=name)
        db.add(v)
        db.flush()
    return v


def row(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


@app.get("/")
def home():
    return {"message": "Backend chal raha hai"}


@app.get("/health/ollama")
def health_ollama():
    return agents.ollama_status()


@app.get("/db-test")
def db_test(db: Session = Depends(get_db)):
    return {"db": db.execute(__import__("sqlalchemy").text("SELECT 1")).scalar()}


# =============================================================== AUTH (UC-1)
class LoginIn(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None   # frontend may send either name
    password: str


@app.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    ident = (body.email or body.username or "").strip().lower()
    user = db.query(User).filter(User.email == ident).first()
    if not user or not check_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if user.status != "active":
        raise HTTPException(403, "Account is blocked")
    audit.log(db, user.id, "login", "user", user.id)
    return {"access_token": create_token(user), "token_type": "bearer", "role": user.role, "name": user.name}


@app.get("/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


# =============================================================== ADMIN (UC-7)
class UserIn(BaseModel):
    name: str
    email: str
    password: str
    role: str


class UserPatch(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None


@app.get("/admin/users")
def list_users(db: Session = Depends(get_db), u: User = Depends(require(ADMIN))):
    return [{k: v for k, v in row(x).items() if k != "password_hash"} for x in db.query(User).all()]


@app.post("/admin/users")
def create_user(b: UserIn, db: Session = Depends(get_db), u: User = Depends(require(ADMIN))):
    if b.role not in (FO, ADMIN, AUDITOR):
        raise HTTPException(400, "role must be finance_officer, administrator or auditor")
    if db.query(User).filter(User.email == b.email.lower()).first():
        raise HTTPException(400, "Email already exists")
    nu = User(name=b.name, email=b.email.lower(), password_hash=hash_password(b.password), role=b.role)
    db.add(nu); db.commit()
    audit.log(db, u.id, "create_user", "user", nu.id, f"role={b.role}")
    return {"id": nu.id}


@app.patch("/admin/users/{uid}")
def patch_user(uid: int, b: UserPatch, db: Session = Depends(get_db), u: User = Depends(require(ADMIN))):
    t = db.get(User, uid)
    if not t:
        raise HTTPException(404, "User not found")
    for f in ("name", "role", "status"):
        if getattr(b, f) is not None:
            setattr(t, f, getattr(b, f))
    if b.password:
        t.password_hash = hash_password(b.password)
    db.commit()
    audit.log(db, u.id, "update_user", "user", uid, b.model_dump_json(exclude={"password"}))
    return {"ok": True}


@app.get("/admin/settings")
def read_settings(db: Session = Depends(get_db), u: User = Depends(require(ADMIN, FO))):
    return get_settings(db)


@app.put("/admin/settings")
def update_settings(b: dict, db: Session = Depends(get_db), u: User = Depends(require(ADMIN))):
    for k, v in b.items():
        if k not in DEFAULT_SETTINGS:
            raise HTTPException(400, f"Unknown setting: {k}")
        s = db.get(Setting, k) or Setting(key=k, value=0)
        s.value = float(v)
        db.add(s)
    db.commit()
    audit.log(db, u.id, "update_settings", "settings", None, json.dumps(b))
    return get_settings(db)


class VendorIn(BaseModel):
    name: str
    tax_number: Optional[str] = None
    contact_email: Optional[str] = None
    blacklisted: bool = False


@app.get("/admin/vendors")
def list_vendors(db: Session = Depends(get_db), u: User = Depends(require(ADMIN, FO))):
    return [row(v) for v in db.query(Vendor).all()]


@app.post("/admin/vendors")
def add_vendor(b: VendorIn, db: Session = Depends(get_db), u: User = Depends(require(ADMIN))):
    v = Vendor(**b.model_dump())
    db.add(v); db.commit()
    audit.log(db, u.id, "create_vendor", "vendor", v.id, b.name)
    return row(v)


@app.patch("/admin/vendors/{vid}")
def patch_vendor(vid: int, b: dict, db: Session = Depends(get_db), u: User = Depends(require(ADMIN))):
    v = db.get(Vendor, vid)
    if not v:
        raise HTTPException(404, "Vendor not found")
    for k in ("tax_number", "contact_email", "blacklisted"):
        if k in b:
            setattr(v, k, b[k])
    db.commit()
    audit.log(db, u.id, "update_vendor", "vendor", vid, json.dumps(b))
    return row(v)


# =============================================================== PO / GRN / LEDGER (master data)
class POIn(BaseModel):
    vendor_name: str
    po_number: str
    po_date: Optional[date] = None
    total_amount: float


class GRNIn(BaseModel):
    po_number: str
    grn_number: str
    received_date: Optional[date] = None
    received_amount: float


class LedgerIn(BaseModel):
    entry_date: date
    entry_type: str   # revenue | expense
    category: str = "general"
    amount: float


@app.post("/purchase-orders")
def add_po(b: POIn, db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN))):
    v = get_or_create_vendor(db, b.vendor_name)
    po = PurchaseOrder(vendor_id=v.id, po_number=b.po_number, po_date=b.po_date, total_amount=b.total_amount)
    db.add(po); db.commit()
    audit.log(db, u.id, "create_po", "purchase_order", po.id, b.po_number)
    return row(po)


@app.get("/purchase-orders")
def list_po(db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN))):
    return [row(p) for p in db.query(PurchaseOrder).all()]


@app.post("/goods-receipts")
def add_grn(b: GRNIn, db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN))):
    po = db.query(PurchaseOrder).filter_by(po_number=b.po_number).first()
    if not po:
        raise HTTPException(404, "PO not found")
    g = GoodsReceipt(po_id=po.id, grn_number=b.grn_number, received_date=b.received_date,
                     received_amount=b.received_amount)
    db.add(g); db.commit()
    audit.log(db, u.id, "create_grn", "goods_receipt", g.id, b.grn_number)
    return row(g)


@app.post("/ledger")
def add_ledger(b: LedgerIn, db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN))):
    if b.entry_type not in ("revenue", "expense"):
        raise HTTPException(400, "entry_type must be revenue or expense")
    e = LedgerEntry(**b.model_dump(), source="manual")
    db.add(e); db.commit()
    audit.log(db, u.id, "create_ledger_entry", "ledger", e.id, f"{b.entry_type} {b.amount}")
    return row(e)


# =============================================================== PROCESS INVOICE (UC-2, 9, 10, 11, 12)
class InvoiceFields(BaseModel):
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    total_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    po_number: Optional[str] = None
    category: Optional[str] = None


REQUIRED = ("vendor_name", "invoice_number", "total_amount")


def invoice_ready(inv):
    return all(getattr(inv, k) not in (None, "") for k in REQUIRED)


@app.post("/invoices/upload")
async def upload_invoice(file: UploadFile = File(...), db: Session = Depends(get_db),
                         u: User = Depends(require(FO))):
    data = await file.read()
    os.makedirs("uploads", exist_ok=True)
    path = f"uploads/{datetime.utcnow():%Y%m%d%H%M%S}_{os.path.basename(file.filename)}"
    with open(path, "wb") as fh:
        fh.write(data)
    fields, conf, llm_used = agents.extract_fields(agents.read_text(file.filename, data))
    inv = Invoice(**fields, confidence_score=conf, document_path=path, created_by=u.id)
    if fields["vendor_name"]:
        inv.vendor_id = get_or_create_vendor(db, fields["vendor_name"]).id
    ok = invoice_ready(inv) and conf >= get_settings(db)["ocr_confidence_min"]
    inv.processing_status = "extracted" if ok else "manual_queue"
    db.add(inv); db.commit()
    audit.log(db, u.id, "upload_invoice", "invoice", inv.id, f"confidence={conf}, status={inv.processing_status}")
    return {"invoice_id": inv.id, "status": inv.processing_status, "confidence": conf, "llm_used": llm_used, "fields": fields}


@app.put("/invoices/{iid}/fields")
def correct_fields(iid: int, b: InvoiceFields, db: Session = Depends(get_db), u: User = Depends(require(FO))):
    inv = db.get(Invoice, iid)
    if not inv or inv.processing_status not in ("manual_queue", "extracted"):
        raise HTTPException(400, "Invoice not found or already processed")
    for k, v in b.model_dump(exclude_none=True).items():
        setattr(inv, k, v)
    if inv.vendor_name:
        inv.vendor_id = get_or_create_vendor(db, inv.vendor_name).id
    if invoice_ready(inv):
        inv.processing_status = "extracted"
    db.commit()
    audit.log(db, u.id, "correct_invoice_fields", "invoice", iid, b.model_dump_json(exclude_none=True))
    return {"invoice_id": iid, "status": inv.processing_status}


def issue_voucher(db, inv, approved_by):
    n = (db.query(Payment).count() or 0) + 1
    voucher = f"PV-{date.today().year}-{n:05d}"
    path, h = agents.make_payment_file(voucher, inv.vendor_name, inv.invoice_number, inv.total_amount)
    batch = PaymentBatch(batch_hash=h, file_path=path)
    db.add(batch); db.flush()
    pay = Payment(invoice_id=inv.id, batch_id=batch.id, approved_by=approved_by, voucher_number=voucher,
                  payment_date=date.today(), amount=inv.total_amount)
    db.add(pay)
    db.add(LedgerEntry(entry_date=inv.invoice_date or date.today(), entry_type="expense",
                       category=inv.category, amount=inv.total_amount, source=f"invoice:{inv.id}"))
    db.commit()
    return {"payment_id": pay.id, "voucher_number": voucher, "batch_hash": h, "amount": inv.total_amount}


@app.post("/invoices/{iid}/process")
def process_invoice(iid: int, db: Session = Depends(get_db), u: User = Depends(require(FO))):
    inv = db.get(Invoice, iid)
    if not inv or inv.processing_status != "extracted":
        raise HTTPException(400, "Invoice not found, or not ready (complete missing fields first)")
    s = get_settings(db)
    vendor = db.get(Vendor, inv.vendor_id)
    prior = db.query(Invoice).filter(Invoice.vendor_id == inv.vendor_id, Invoice.id != inv.id,
                                     Invoice.processing_status.in_(["approved", "pending_review", "rejected", "blocked"])).all()
    amounts = [p.total_amount for p in prior if p.total_amount]
    risk_ctx = {
        "duplicate": db.query(Invoice).filter(Invoice.vendor_id == inv.vendor_id, Invoice.id != inv.id,
                                              Invoice.invoice_number == inv.invoice_number).count() > 0,
        "blacklisted": bool(vendor.blacklisted),
        "vendor_avg": sum(amounts) / len(amounts) if amounts else None,
        "vendor_count": len(prior), "high_amount": s["high_amount"], "risk_limit": s["risk_limit"]}
    po = db.query(PurchaseOrder).filter_by(po_number=inv.po_number).first() if inv.po_number else None
    grn = db.query(GoodsReceipt).filter_by(po_id=po.id).order_by(GoodsReceipt.id.desc()).first() if po else None
    d = {"total_amount": inv.total_amount, "tax_amount": inv.tax_amount, "category": inv.category,
         "invoice_date": inv.invoice_date}
    res, stuck = agents.run_agents(d, row(po) if po else None, row(grn) if grn else None, risk_ctx)
    rule, action, reason = agents.arbitrate(res, stuck, inv.total_amount, s["approval_limit"])

    if "match" in res:
        m = res["match"]
        db.add(ThreeWayMatch(invoice_id=inv.id, po_id=m["po_id"], grn_id=m["grn_id"], match_status=m["status"],
                             discrepancy_amount=m["discrepancy"], details=m["details"]))
    if "tax" in res:
        t = res["tax"]
        db.add(TaxDecision(invoice_id=inv.id, kb_version=agents.KB_VERSION, clause_id=t["clause_id"],
                           tax_rate=t["rate"], tax_amount=inv.tax_amount, confidence_score=t["confidence"],
                           decision_status=t["status"], explanation=t["explanation"]))
    if "risk" in res:
        r = res["risk"]
        db.add(RiskAssessment(invoice_id=inv.id, risk_score=r["score"], flag_type=r["flag"],
                              detection_method=r["method"], explanation=r["explanation"]))
    db.add(OrchestratorDecision(invoice_id=inv.id, rule_applied=rule, final_action=action, reason=reason))
    inv.processing_status = {"approved": "approved", "blocked": "blocked",
                             "human_review": "pending_review", "stuck": "stuck"}[action]
    db.commit()
    audit.log(db, u.id, "process_invoice", "invoice", inv.id, f"rule={rule}; action={action}; {reason}")
    out = {"invoice_id": inv.id, "status": inv.processing_status, "rule_applied": rule, "reason": reason,
           "match": res.get("match"), "tax": res.get("tax"), "risk": res.get("risk")}
    if action == "approved":
        out["voucher"] = issue_voucher(db, inv, None)
        audit.log(db, u.id, "voucher_issued", "payment", out["voucher"]["payment_id"], out["voucher"]["voucher_number"])
    return out


def invoice_detail(db, inv):
    d = row(inv)
    for key, model in (("match", ThreeWayMatch), ("tax", TaxDecision), ("risk", RiskAssessment),
                       ("decision", OrchestratorDecision)):
        x = db.query(model).filter_by(invoice_id=inv.id).order_by(model.id.desc()).first()
        d[key] = row(x) if x else None
    p = db.query(Payment).filter_by(invoice_id=inv.id).first()
    if p:
        d["payment"] = row(p)
        d["payment"]["batch_hash"] = db.get(PaymentBatch, p.batch_id).batch_hash
    return d


@app.get("/invoices")
def list_invoices(status: Optional[str] = None, db: Session = Depends(get_db),
                  u: User = Depends(require(FO, ADMIN, AUDITOR))):
    q = db.query(Invoice)
    if status:
        q = q.filter(Invoice.processing_status == status)
    return [row(i) for i in q.order_by(Invoice.id.desc()).all()]


@app.get("/invoices/{iid}")
def get_invoice(iid: int, db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN, AUDITOR))):
    inv = db.get(Invoice, iid)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return invoice_detail(db, inv)


# =============================================================== REVIEW FLAGGED (UC-3)
class DecisionIn(BaseModel):
    decision: str   # approve | reject
    reason: Optional[str] = None


@app.get("/review/flagged")
def flagged(db: Session = Depends(get_db), u: User = Depends(require(FO))):
    items = db.query(Invoice).filter_by(processing_status="pending_review").all()
    return [invoice_detail(db, i) for i in items]  # blocked invoices are not listed


@app.post("/review/{iid}/decision")
def review(iid: int, b: DecisionIn, db: Session = Depends(get_db), u: User = Depends(require(FO))):
    inv = db.get(Invoice, iid)
    if not inv or inv.processing_status != "pending_review":
        raise HTTPException(400, "Invoice is not waiting for review")
    if b.decision not in ("approve", "reject"):
        raise HTTPException(400, "decision must be approve or reject")
    if b.decision == "reject" and not b.reason:
        raise HTTPException(400, "A reason is required to reject")
    db.add(Approval(invoice_id=iid, user_id=u.id, decision=b.decision, comments=b.reason))
    inv.processing_status = "approved" if b.decision == "approve" else "rejected"
    db.commit()
    audit.log(db, u.id, f"review_{b.decision}", "invoice", iid, b.reason or "")
    out = {"invoice_id": iid, "status": inv.processing_status}
    if b.decision == "approve":
        out["voucher"] = issue_voucher(db, inv, u.id)
        audit.log(db, u.id, "voucher_issued", "payment", out["voucher"]["payment_id"], out["voucher"]["voucher_number"])
    return out


@app.get("/payments/{pid}")
def payment_info(pid: int, db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN, AUDITOR))):
    p = db.get(Payment, pid)
    if not p:
        raise HTTPException(404, "Payment not found")
    b = db.get(PaymentBatch, p.batch_id)
    return {**row(p), "batch_hash": b.batch_hash, "hash_still_valid": agents.file_hash(b.file_path) == b.batch_hash}


@app.get("/payments/{pid}/file")
def payment_file(pid: int, db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN))):
    p = db.get(Payment, pid)
    if not p:
        raise HTTPException(404, "Payment not found")
    return FileResponse(db.get(PaymentBatch, p.batch_id).file_path)


# =============================================================== RECONCILIATION (UC-4, 13)
@app.post("/reconciliation/upload")
async def reconcile_upload(file: UploadFile = File(...), db: Session = Depends(get_db),
                           u: User = Depends(require(FO))):
    bank_rows = agents.parse_statement(await file.read())
    if not bank_rows:
        raise HTTPException(400, "Statement unreadable: CSV needs columns date, description, amount, reference")
    pays = db.query(Payment, Invoice).join(Invoice, Invoice.id == Payment.invoice_id)\
             .filter(Payment.payment_status == "issued").all()
    ledger = [{"id": p.id, "voucher_number": p.voucher_number, "invoice_number": i.invoice_number,
               "amount": p.amount, "date": p.payment_date} for p, i in pays]
    results = agents.reconcile(bank_rows, ledger)
    bank_ids = {}
    for idx, b in enumerate(bank_rows):
        bt = BankTransaction(reference_number=b["reference"], transaction_date=b["date"],
                             amount=b["amount"], description=b["description"])
        db.add(bt); db.flush()
        bank_ids[idx] = bt.id
    for r in results:
        db.add(Reconciliation(payment_id=r["payment_id"], bank_transaction_id=bank_ids.get(r["bank_index"]),
                              match_status=r["status"], discrepancy_amount=r["discrepancy"]))
        if r["status"] == "matched" and r["payment_id"]:
            db.get(Payment, r["payment_id"]).payment_status = "reconciled"
    db.commit()
    summary = {}
    for r in results:
        summary[r["status"]] = summary.get(r["status"], 0) + 1
    audit.log(db, u.id, "reconcile_statement", "reconciliation", None, json.dumps(summary))
    return {"summary": summary, "results": results}


@app.get("/reconciliation")
def list_recon(db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN, AUDITOR))):
    out = []
    for r in db.query(Reconciliation).order_by(Reconciliation.id.desc()).all():
        d = row(r)
        d["bank"] = row(db.get(BankTransaction, r.bank_transaction_id)) if r.bank_transaction_id else None
        d["payment"] = row(db.get(Payment, r.payment_id)) if r.payment_id else None
        out.append(d)
    return out


class DisputeIn(BaseModel):
    reconciliation_id: int


@app.post("/reconciliation/dispute-email")
def dispute(b: DisputeIn, db: Session = Depends(get_db), u: User = Depends(require(FO))):
    r = db.get(Reconciliation, b.reconciliation_id)
    if not r or r.match_status == "matched" or not r.payment_id:
        raise HTTPException(400, "No payment-linked mismatch found for this record")
    pay = db.get(Payment, r.payment_id)
    inv = db.get(Invoice, pay.invoice_id)
    bank_amt = db.get(BankTransaction, r.bank_transaction_id).amount if r.bank_transaction_id else 0.0
    vendor = db.get(Vendor, inv.vendor_id)
    mail = agents.draft_dispute(inv.vendor_name, inv.invoice_number, pay.amount, bank_amt, vendor.contact_email or "")
    audit.log(db, u.id, "draft_dispute_email", "reconciliation", r.id)
    return mail


# =============================================================== REPORTS & FORECAST (UC-6)
class ReportIn(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None


@app.post("/reports/generate")
def gen_report(b: ReportIn, db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN, AUDITOR))):
    q = db.query(LedgerEntry)
    all_entries = q.all()
    if not all_entries:
        raise HTTPException(404, "No ledger data yet")
    start, end = b.from_date or date.min, b.to_date or date.max
    ent = [e for e in all_entries if start <= e.entry_date <= end]
    if not ent:
        raise HTTPException(404, "No data for this period")
    rev = sum(e.amount for e in ent if e.entry_type == "revenue")
    exp = sum(e.amount for e in ent if e.entry_type == "expense")
    by_cat = {}
    for e in ent:
        if e.entry_type == "expense":
            by_cat[e.category] = by_cat.get(e.category, 0) + e.amount
    pnl = {"revenue": rev, "expenses": exp, "expenses_by_category": by_cat, "net_profit": rev - exp}
    # simplified balance sheet: cash = revenue - paid expenses; payables = issued-but-unreconciled vouchers
    paid = sum(p.amount for p in db.query(Payment).filter_by(payment_status="reconciled").all())
    payable = sum(p.amount for p in db.query(Payment).filter_by(payment_status="issued").all())
    cash = rev - paid
    bs = {"assets": {"cash": cash}, "liabilities": {"accounts_payable": payable},
          "equity": cash - payable, "note": "Simplified balance sheet"}
    months = {}
    for e in all_entries:
        k = e.entry_date.strftime("%Y-%m")
        months[k] = months.get(k, 0) + (e.amount if e.entry_type == "revenue" else -e.amount)
    series = [months[k] for k in sorted(months)]
    fc = agents.forecast(series)
    content = {"pnl": pnl, "balance_sheet": bs, "forecast": fc, "summary": agents.summary_text(pnl, fc),
               "kb_note": "Figures come from processed ledger entries."}
    period = f"{b.from_date or 'start'} to {b.to_date or 'today'}"
    rep = FinancialReport(report_type="full", period=period, content=json.dumps(content, default=str), generated_by=u.id)
    db.add(rep); db.commit()
    audit.log(db, u.id, "generate_report", "report", rep.id, period)
    return {"report_id": rep.id, "generated_at": rep.generated_at, "period": period, **content}


@app.get("/reports")
def list_reports(db: Session = Depends(get_db), u: User = Depends(require(FO, ADMIN, AUDITOR))):
    return [{"id": r.id, "period": r.period, "generated_at": r.generated_at,
             "content": json.loads(r.content)} for r in db.query(FinancialReport).order_by(FinancialReport.id.desc()).all()]


# =============================================================== AUDIT TRAIL (UC-8)
@app.get("/audit")
def audit_list(limit: int = 100, action: Optional[str] = None, user_id: Optional[int] = None,
               db: Session = Depends(get_db), u: User = Depends(require(AUDITOR, ADMIN))):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    return [row(a) for a in q.order_by(AuditLog.id.desc()).limit(limit).all()]


@app.get("/audit/verify")
def audit_verify(db: Session = Depends(get_db), u: User = Depends(require(AUDITOR, ADMIN))):
    return audit.verify(db)