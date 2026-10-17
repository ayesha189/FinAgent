# reconciliation_parser.py
# Production Rule-Based Reconciliation Engine & Statement Parser (FR-TP-07, FR-TP-01, UC-4, UC-13)
# Implements exact multi-pass matching, description normalization, balance verification, and audit logging.

import re
import csv
import io
import hashlib
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date
from difflib import SequenceMatcher
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set

# -----------------------------------------------------------------------------
# 1. Description Normalization & Similarity
# -----------------------------------------------------------------------------
NOISE_WORDS = {"dd", "trf", "payment", "pmt", "direct", "debit", "ltd", "uk", "inc", "co"}

def normalize_description(text: str) -> str:
    """
    Normalizes transaction descriptions:
    - Lowercases
    - Strips punctuation and symbols (e.g. '·', '-', '/')
    - Removes noise words ('dd', 'trf', 'payment', 'pmt', etc.)
    Example: 'DD · Equip Rental' -> 'equip rental'
    """
    if not text:
        return ""
    t = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    words = [w for w in t.split() if w not in NOISE_WORDS]
    return " ".join(words)

def compute_similarity(desc1: str, desc2: str) -> float:
    """Calculates deterministic SequenceMatcher ratio on normalized strings."""
    norm1 = normalize_description(desc1)
    norm2 = normalize_description(desc2)
    if not norm1 or not norm2:
        return 0.0
    return SequenceMatcher(None, norm1, norm2).ratio()

# -----------------------------------------------------------------------------
# 2. Data Models (Standard Library Dataclasses)
# -----------------------------------------------------------------------------
@dataclass
class LedgerEntry:
    id: str
    desc: str
    date: date
    amount: Decimal
    reference: Optional[str] = None
    matched: bool = False
    matched_txn_id: Optional[str] = None
    discrepancy_amount: Optional[Decimal] = None
    suggested_pair_id: Optional[str] = None
    suggestion_reason: Optional[str] = None

@dataclass
class BankTransaction:
    id: str
    desc: str
    date: date
    amount: Decimal
    reference: Optional[str] = None
    is_credit: bool = False  # False = Debit (outflow), True = Credit (inflow)
    matched: bool = False
    matched_ledger_id: Optional[str] = None
    discrepancy_amount: Optional[Decimal] = None
    suggested_pair_id: Optional[str] = None
    suggestion_reason: Optional[str] = None

@dataclass
class StatementValidationResult:
    is_valid: bool
    opening_balance: Decimal
    total_credits: Decimal
    total_debits: Decimal
    closing_balance: Decimal
    calculated_closing: Decimal
    balance_discrepancy: Decimal
    row_count: int
    file_hash: str
    warnings: List[str] = field(default_factory=list)

@dataclass
class ReconciliationResult:
    auto_exact_matches: List[Tuple[str, str]] = field(default_factory=list)     # [(ledger_id, bank_id)]
    auto_fuzzy_matches: List[Tuple[str, str]] = field(default_factory=list)     # [(ledger_id, bank_id)]
    suggested_candidates: List[Dict[str, str]] = field(default_factory=list)   # [{ledger_id, bank_id, reason}]
    unmatched_ledger: List[str] = field(default_factory=list)
    unmatched_bank: List[str] = field(default_factory=list)
    total_matched: int = 0
    total_unmatched: int = 0

# -----------------------------------------------------------------------------
# 3. Bank Statement Parser & Balance Verifier (FR-TP-01)
# -----------------------------------------------------------------------------
def parse_csv_statement(
    file_bytes: bytes,
    opening_balance: Optional[Decimal] = None,
    expected_closing: Optional[Decimal] = None
) -> Tuple[List[BankTransaction], StatementValidationResult]:
    """
    Parses a CSV bank statement and validates mathematical consistency:
    Balance Check Rule: Opening Balance + Total Credits - Total Debits == Closing Balance
    """
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    text = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    transactions: List[BankTransaction] = []
    total_credits = Decimal("0.00")
    total_debits = Decimal("0.00")
    row_idx = 1
    warnings: List[str] = []

    for row in reader:
        # Flexible header key resolution
        lower_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}

        # Date parsing
        date_str = lower_row.get("date") or lower_row.get("transaction date") or lower_row.get("booking date")
        txn_date = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                if date_str:
                    txn_date = datetime.strptime(date_str, fmt).date()
                    break
            except ValueError:
                pass
        if not txn_date:
            txn_date = date.today()
            warnings.append(f"Row {row_idx}: Invalid date '{date_str}', defaulted to today.")

        desc = lower_row.get("description") or lower_row.get("narrative") or lower_row.get("payee") or f"Transaction {row_idx}"
        ref = lower_row.get("reference") or lower_row.get("ref") or lower_row.get("cheque") or lower_row.get("id")

        # Amount extraction (handles Debit/Credit columns or single Amount with sign)
        amt_str = lower_row.get("amount")
        debit_str = lower_row.get("debit")
        credit_str = lower_row.get("credit")

        is_credit = False
        amt_val = Decimal("0.00")

        if debit_str and Decimal(re.sub(r"[^0-9.]", "", debit_str) or 0) > 0:
            amt_val = Decimal(re.sub(r"[^0-9.]", "", debit_str))
            is_credit = False
            total_debits += amt_val
        elif credit_str and Decimal(re.sub(r"[^0-9.]", "", credit_str) or 0) > 0:
            amt_val = Decimal(re.sub(r"[^0-9.]", "", credit_str))
            is_credit = True
            total_credits += amt_val
        elif amt_str:
            clean = re.sub(r"[^0-9.-]", "", amt_str)
            raw = Decimal(clean or 0)
            if raw < 0:
                amt_val = abs(raw)
                is_credit = False
                total_debits += amt_val
            else:
                amt_val = raw
                is_credit = True
                total_credits += amt_val

        txn = BankTransaction(
            id=f"TXN-{row_idx:04d}",
            reference=ref,
            desc=desc,
            date=txn_date,
            amount=amt_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            is_credit=is_credit
        )
        transactions.append(txn)
        row_idx += 1

    # Mathematical Balance Check
    op_bal = opening_balance if opening_balance is not None else Decimal("0.00")
    calc_closing = op_bal + total_credits - total_debits
    cl_bal = expected_closing if expected_closing is not None else calc_closing
    discrepancy = (calc_closing - cl_bal).quantize(Decimal("0.01"))

    is_valid = abs(discrepancy) == Decimal("0.00")
    if not is_valid:
        warnings.append(f"Balance check failed: Opening ({op_bal}) + Credits ({total_credits}) - Debits ({total_debits}) != Closing ({cl_bal}). Diff: {discrepancy}")

    validation = StatementValidationResult(
        is_valid=is_valid,
        opening_balance=op_bal,
        total_credits=total_credits,
        total_debits=total_debits,
        closing_balance=cl_bal,
        calculated_closing=calc_closing,
        balance_discrepancy=discrepancy,
        row_count=len(transactions),
        file_hash=file_hash,
        warnings=warnings
    )

    return transactions, validation

# -----------------------------------------------------------------------------
# 4. Deterministic Multi-Pass Reconciler (FR-TP-07 & UC-4)
# -----------------------------------------------------------------------------
def reconcile(
    ledger: List[LedgerEntry],
    bank: List[BankTransaction],
    day_window: int = 3,
    threshold: float = 0.80,
    candidate_day_window: int = 7
) -> ReconciliationResult:
    """
    Deterministic rule-based reconciler executing 4 passes:
    Pass 1: Exact (Same amount, matching reference number, date within ±3 days) -> Auto-matched
    Pass 2: Amount & Date (Same amount, date within ±3 days, normalized description similarity >= threshold) -> Auto-matched
    Pass 3: Candidate Suggestion (Same amount within candidate_day_window, or close description with fee diff) -> Suggested pairing
    Pass 4: Leftovers -> Explicitly flagged as unrecorded charge or missing payment
    """
    result = ReconciliationResult()
    used_bank: Set[str] = set()
    used_ledger: Set[str] = set()

    # Sort deterministically by (date, id) to ensure 100% reproducible results every run
    sorted_ledger = sorted(ledger, key=lambda x: (x.date, x.id))
    sorted_bank = sorted(bank, key=lambda x: (x.date, x.id))

    # --- Pass 1: Exact Reference + Amount + Date Window ---
    for L in sorted_ledger:
        if L.id in used_ledger:
            continue
        for B in sorted_bank:
            if B.id in used_bank or B.amount != L.amount:
                continue
            if abs((B.date - L.date).days) > day_window:
                continue
            # Must match reference exactly
            if L.reference and B.reference and L.reference.strip().lower() == B.reference.strip().lower():
                result.auto_exact_matches.append((L.id, B.id))
                used_bank.add(B.id)
                used_ledger.add(L.id)
                L.matched = True
                L.matched_txn_id = B.id
                B.matched = True
                B.matched_ledger_id = L.id
                break

    # --- Pass 2: Amount + Date + Normalized Description Similarity ---
    for L in sorted_ledger:
        if L.id in used_ledger:
            continue
        best_bank = None
        best_score = 0.0

        for B in sorted_bank:
            if B.id in used_bank or B.amount != L.amount:
                continue
            if abs((B.date - L.date).days) > day_window:
                continue

            score = compute_similarity(L.desc, B.desc)
            if score >= threshold and score > best_score:
                best_score = score
                best_bank = B

        if best_bank:
            result.auto_fuzzy_matches.append((L.id, best_bank.id))
            used_bank.add(best_bank.id)
            used_ledger.add(L.id)
            L.matched = True
            L.matched_txn_id = best_bank.id
            best_bank.matched = True
            best_bank.matched_ledger_id = L.id

    # --- Pass 3: Candidate Suggestions (Explained Pairs) ---
    for L in sorted_ledger:
        if L.id in used_ledger:
            continue
        for B in sorted_bank:
            if B.id in used_bank:
                continue

            days_diff = abs((B.date - L.date).days)
            same_amount = B.amount == L.amount
            sim = compute_similarity(L.desc, B.desc)

            # Scenario A: Same amount, wider date window (±7 days), different description
            if same_amount and days_diff <= candidate_day_window:
                reason = "Same amount, different description"
                pair_id = f"pair-{L.id}-{B.id}"
                L.suggested_pair_id = pair_id
                L.suggestion_reason = reason
                B.suggested_pair_id = pair_id
                B.suggestion_reason = reason
                result.suggested_candidates.append({
                    "ledger_id": L.id,
                    "bank_id": B.id,
                    "reason": reason,
                    "type": "same_amount_diff_desc"
                })
                break

            # Scenario B: High description similarity, small amount difference (e.g., fee/surcharge)
            diff = abs(B.amount - L.amount)
            if sim >= 0.70 and diff <= Decimal("50.00"):
                reason = f"Similar description, Rs. {diff:.2f} difference (Surcharge/Fee)"
                pair_id = f"pair-{L.id}-{B.id}"
                L.suggested_pair_id = pair_id
                L.suggestion_reason = reason
                B.suggested_pair_id = pair_id
                B.suggestion_reason = reason
                result.suggested_candidates.append({
                    "ledger_id": L.id,
                    "bank_id": B.id,
                    "reason": reason,
                    "type": "amount_discrepancy"
                })
                break

    # --- Pass 4: Leftovers ---
    for L in sorted_ledger:
        if L.id not in used_ledger:
            result.unmatched_ledger.append(L.id)
    for B in sorted_bank:
        if B.id not in used_bank:
            result.unmatched_bank.append(B.id)

    result.total_matched = len(result.auto_exact_matches) + len(result.auto_fuzzy_matches)
    result.total_unmatched = len(result.unmatched_ledger) + len(result.unmatched_bank)
    return result

# -----------------------------------------------------------------------------
# 5. Manual Match Action & Dispute Detection (UC-13)
# -----------------------------------------------------------------------------
def pair_manual_match(
    ledger_entry: LedgerEntry,
    bank_entry: BankTransaction,
    officer_name: str
) -> Dict:
    """
    Pairs a ledger entry with a bank transaction manually.
    If amounts differ, flags as Discrepancy with the difference calculated,
    enabling Draft Dispute Email (UC-13).
    """
    diff = bank_entry.amount - ledger_entry.amount
    is_discrepancy = abs(diff) > Decimal("0.00")

    match_status = "discrepancy" if is_discrepancy else "matched"
    reconciled_at = datetime.utcnow().isoformat()

    audit_entry = {
        "timestamp": reconciled_at,
        "officer": officer_name,
        "action": "discrepancy" if is_discrepancy else "manual_match",
        "ledger_id": ledger_entry.id,
        "bank_id": bank_entry.id,
        "diff_amount": float(diff),
        "details": f"Paired {ledger_entry.id} with {bank_entry.id}. Status: {match_status} (Diff: Rs. {abs(diff):.2f})"
    }

    return {
        "match_status": match_status,
        "discrepancy_amount": float(abs(diff)) if is_discrepancy else 0.0,
        "can_dispute": is_discrepancy,
        "audit_entry": audit_entry
    }
