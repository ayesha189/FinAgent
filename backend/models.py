from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Float, Boolean, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


def now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(30))  # finance_officer | administrator | auditor
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | blocked
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Vendor(Base):
    __tablename__ = "vendors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    tax_number: Mapped[Optional[str]] = mapped_column(String(50))
    contact_email: Mapped[Optional[str]] = mapped_column(String(150))
    blacklisted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    po_number: Mapped[str] = mapped_column(String(50), unique=True)
    po_date: Mapped[Optional[date]] = mapped_column(Date)
    total_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="open")


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    id: Mapped[int] = mapped_column(primary_key=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    grn_number: Mapped[str] = mapped_column(String(50), unique=True)
    received_date: Mapped[Optional[date]] = mapped_column(Date)
    received_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="received")


class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"))
    vendor_name: Mapped[Optional[str]] = mapped_column(String(200))
    invoice_number: Mapped[Optional[str]] = mapped_column(String(80))
    invoice_date: Mapped[Optional[date]] = mapped_column(Date)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    total_amount: Mapped[Optional[float]] = mapped_column(Float)
    tax_amount: Mapped[Optional[float]] = mapped_column(Float)
    po_number: Mapped[Optional[str]] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(20), default="goods")  # goods | services
    confidence_score: Mapped[float] = mapped_column(Float, default=0)
    document_path: Mapped[Optional[str]] = mapped_column(String(300))
    # manual_queue | extracted | approved | blocked | pending_review | rejected | stuck
    processing_status: Mapped[str] = mapped_column(String(20), default="extracted")
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class ThreeWayMatch(Base):
    __tablename__ = "three_way_matches"
    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    po_id: Mapped[Optional[int]] = mapped_column(ForeignKey("purchase_orders.id"))
    grn_id: Mapped[Optional[int]] = mapped_column(ForeignKey("goods_receipts.id"))
    match_status: Mapped[str] = mapped_column(String(20))
    discrepancy_amount: Mapped[float] = mapped_column(Float, default=0)
    details: Mapped[Optional[str]] = mapped_column(Text)
    matched_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    risk_score: Mapped[float] = mapped_column(Float)
    flag_type: Mapped[str] = mapped_column(String(10))  # none | soft | hard
    detection_method: Mapped[str] = mapped_column(String(30))
    explanation: Mapped[str] = mapped_column(Text)
    assessed_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class TaxDecision(Base):
    __tablename__ = "tax_decisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    kb_version: Mapped[str] = mapped_column(String(40))
    clause_id: Mapped[Optional[str]] = mapped_column(String(60))
    tax_rate: Mapped[Optional[float]] = mapped_column(Float)
    tax_amount: Mapped[Optional[float]] = mapped_column(Float)
    confidence_score: Mapped[float] = mapped_column(Float)
    decision_status: Mapped[str] = mapped_column(String(20))  # compliant | non_compliant | uncertain
    explanation: Mapped[str] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class OrchestratorDecision(Base):
    __tablename__ = "orchestrator_decisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    rule_applied: Mapped[str] = mapped_column(String(40))
    final_action: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(10))
    comments: Mapped[Optional[str]] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class PaymentBatch(Base):
    __tablename__ = "payment_batches"
    id: Mapped[int] = mapped_column(primary_key=True)
    batch_hash: Mapped[str] = mapped_column(String(64))
    file_path: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    batch_id: Mapped[int] = mapped_column(ForeignKey("payment_batches.id"))
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))  # None = auto-approved
    voucher_number: Mapped[str] = mapped_column(String(30))
    payment_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Float)
    payment_status: Mapped[str] = mapped_column(String(20), default="issued")  # issued | reconciled


class BankTransaction(Base):
    __tablename__ = "bank_transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(80))
    transaction_date: Mapped[Optional[date]] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Float)
    description: Mapped[Optional[str]] = mapped_column(String(300))


class Reconciliation(Base):
    __tablename__ = "reconciliations"
    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("payments.id"))
    bank_transaction_id: Mapped[Optional[int]] = mapped_column(ForeignKey("bank_transactions.id"))
    match_status: Mapped[str] = mapped_column(String(25))  # matched | amount_mismatch | unmatched_bank | unmatched_ledger
    discrepancy_amount: Mapped[float] = mapped_column(Float, default=0)
    reconciled_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    entry_date: Mapped[date] = mapped_column(Date)
    entry_type: Mapped[str] = mapped_column(String(10))  # revenue | expense
    category: Mapped[str] = mapped_column(String(50), default="general")
    amount: Mapped[float] = mapped_column(Float)
    source: Mapped[Optional[str]] = mapped_column(String(60))


class FinancialReport(Base):
    __tablename__ = "financial_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    report_type: Mapped[str] = mapped_column(String(20))
    period: Mapped[str] = mapped_column(String(40))
    content: Mapped[str] = mapped_column(Text)  # JSON
    generated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[float] = mapped_column(Float)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[Optional[str]] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(60))
    details: Mapped[Optional[str]] = mapped_column(Text)
    timestamp: Mapped[str] = mapped_column(String(40))  # ISO text, so the hash is stable
    previous_hash: Mapped[str] = mapped_column(String(64))
    current_hash: Mapped[str] = mapped_column(String(64))