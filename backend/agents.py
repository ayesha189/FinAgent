"""All agent logic (simplified, rule-based). Agents are pure functions: no DB access,
so the Orchestrator can run them concurrently and safely."""
import io, os, re, csv, json, hashlib, urllib.request
from datetime import datetime, date
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
load_dotenv()

# ---------------------------------------------------------------- Local LLM (Ollama)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")


def llm(prompt: str, as_json: bool = False, timeout: int = 90):
    """Call the local Ollama model. Returns None if Ollama is not reachable (caller falls back)."""
    body = {"model": OLLAMA_MODEL, "stream": False, "options": {"temperature": 0},
            "messages": [{"role": "user", "content": prompt}]}
    if as_json:
        body["format"] = "json"
    try:
        req = urllib.request.Request(OLLAMA_URL + "/api/chat", json.dumps(body).encode(),
                                     {"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            text = json.loads(r.read())["message"]["content"].strip()
        return json.loads(text) if as_json else text
    except Exception:
        return None


def explain(facts: str, fallback: str):
    """LLM only EXPLAINS a decision that rules already made. Returns (text, who_wrote_it)."""
    t = llm("You are a finance assistant. Write exactly 1 or 2 short sentences for a finance "
            "officer, using ONLY the facts below. Do not add general advice, do not invent "
            "facts or numbers, and do not say 'potential' or 'could'.\n\nFACTS:\n" + facts,
            timeout=60)
    return (t, "ollama") if t else (fallback, "template")


def ollama_status():
    try:
        with urllib.request.urlopen(OLLAMA_URL + "/api/tags", timeout=3) as r:
            names = [m["name"] for m in json.loads(r.read()).get("models", [])]
        return {"running": True, "model": OLLAMA_MODEL,
                "model_available": any(n == OLLAMA_MODEL or n.startswith(OLLAMA_MODEL) for n in names),
                "installed_models": names}
    except Exception:
        return {"running": False, "model": OLLAMA_MODEL, "model_available": False, "installed_models": []}


# ---------------------------------------------------------------- Transaction Processing
def read_text(filename: str, data: bytes) -> str:
    """Step 1 of two-step reading: get raw text (PDF text, image OCR if available, txt/eml)."""
    name = filename.lower()
    try:
        if name.endswith(".pdf"):
            from pypdf import PdfReader
            return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
        if name.endswith((".png", ".jpg", ".jpeg")):
            import pytesseract
            from PIL import Image
            return pytesseract.image_to_string(Image.open(io.BytesIO(data)))
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return ""  # unreadable -> goes to the manual entry queue


def parse_date(s):
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(str(s).strip(), fmt).date()
        except ValueError:
            pass
    return None


def _num(s):
    try:
        return float(str(s).replace(",", ""))
    except ValueError:
        return None


def regex_fields(text: str):
    """Fast deterministic pass (used first, like a template)."""
    def find(pattern, flags=re.I):
        m = re.findall(pattern, text, flags)
        return m[-1].strip() if m else None

    date_pat = r"(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})"
    f = {
        "invoice_number": find(r"invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-/]*)"),
        "vendor_name": find(r"(?:vendor|supplier|from)\s*[:\-]\s*([^\n]+)"),
        "invoice_date": parse_date(find(r"(?<!due )date\s*[:\-]\s*" + date_pat) or ""),
        "due_date": parse_date(find(r"due\s*date\s*[:\-]\s*" + date_pat) or ""),
        "total_amount": _num(find(r"(?<!sub)total(?:\s*amount|\s*due)?\s*(?:\(?pkr\)?|rs\.?)?\s*[:\-]?\s*([\d,]+(?:\.\d+)?)") or ""),
        "tax_amount": _num(find(r"(?:sales\s*tax|gst|pra|tax)(?:\s*\(?\d+%\)?)?\s*[:\-]?\s*(?:pkr|rs\.?)?\s*([\d,]+(?:\.\d+)?)") or ""),
        "po_number": find(r"(?:\bPO|Purchase Order)\s*(?:No\.?|Number|#)?\s*[:\-]\s*([A-Za-z0-9][A-Za-z0-9\-/]*)", 0),
    }
    f["category"] = "services" if re.search(r"service", text, re.I) else "goods"  # rule-based class
    keys = ["invoice_number", "vendor_name", "invoice_date", "total_amount", "tax_amount", "po_number"]
    confidence = round(sum(1 for k in keys if f[k] is not None) / len(keys), 2)
    return f, confidence


FIELD_KEYS = ["invoice_number", "vendor_name", "invoice_date", "total_amount", "tax_amount", "po_number"]


def extract_fields(text: str):
    """Step 2: structure the fields. Regex first, then the local LLM fills what is still missing."""
    f, _ = regex_fields(text)
    ai = llm("Extract invoice fields from the text below. Reply ONLY with JSON using keys: vendor_name, "
             "invoice_number, invoice_date (YYYY-MM-DD), due_date (YYYY-MM-DD), total_amount (number), "
             "tax_amount (number), po_number. Use null if a field is not present.\n\nTEXT:\n" + text[:4000],
             as_json=True)
    llm_used = isinstance(ai, dict)
    if llm_used:
        for k in ("vendor_name", "invoice_number", "po_number"):
            if f.get(k) is None and ai.get(k) not in (None, "", "null"):
                f[k] = str(ai[k]).strip()
        for k in ("total_amount", "tax_amount"):
            if f.get(k) is None and ai.get(k) not in (None, "", "null"):
                f[k] = _num(ai[k])
        for k in ("invoice_date", "due_date"):
            if f.get(k) is None and ai.get(k) not in (None, "", "null"):
                f[k] = parse_date(ai[k])
    conf = round(sum(1 for k in FIELD_KEYS if f[k] is not None) / len(FIELD_KEYS), 2)
    return f, conf, llm_used


def three_way_match(inv: dict, po: dict | None, grn: dict | None, tol: float = 1.0) -> dict:
    """Deterministic Invoice vs PO vs GRN match (compares inclusive totals)."""
    if not po:
        return {"status": "missing_po", "discrepancy": 0.0, "po_id": None, "grn_id": None,
                "details": "No purchase order found for this invoice's PO number."}
    if not grn:
        return {"status": "missing_grn", "discrepancy": 0.0, "po_id": po["id"], "grn_id": None,
                "details": "No goods-received note found for this purchase order."}
    d_po = abs(inv["total_amount"] - po["total_amount"])
    d_grn = abs(inv["total_amount"] - grn["received_amount"])
    diff = max(d_po, d_grn)
    if diff <= tol:
        return {"status": "matched", "discrepancy": 0.0, "po_id": po["id"], "grn_id": grn["id"],
                "details": "Invoice, PO and GRN amounts agree."}
    return {"status": "mismatch", "discrepancy": round(diff, 2), "po_id": po["id"], "grn_id": grn["id"],
            "details": f"Invoice {inv['total_amount']} vs PO {po['total_amount']} vs GRN {grn['received_amount']}."}


def make_payment_file(voucher_no, vendor, invoice_no, amount, folder="batches"):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{voucher_no}.csv")
    content = f"voucher,vendor,invoice,amount\n{voucher_no},{vendor},{invoice_no},{amount}\n".encode()
    with open(path, "wb") as fh:
        fh.write(content)
    return path, hashlib.sha256(content).hexdigest()


def file_hash(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def parse_statement(data: bytes):
    """Bank statement CSV with columns: date, description, amount, reference."""
    rows = []
    reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig", errors="ignore")))
    for r in reader:
        r = {(k or "").strip().lower(): (v or "").strip() for k, v in r.items()}
        amt = _num(r.get("amount", ""))
        if amt is None:
            continue
        rows.append({"date": parse_date(r.get("date", "")), "description": r.get("description", ""),
                     "amount": abs(amt), "reference": r.get("reference", "")})
    return rows


def reconcile(bank_rows, ledger_rows):
    """ledger_rows: dicts with id, voucher_number, invoice_number, amount, date. Rule-based."""
    used, out = set(), []
    for i, b in enumerate(bank_rows):
        text = (b["reference"] + " " + b["description"]).lower()
        hit = next((l for l in ledger_rows if l["id"] not in used and (
            l["voucher_number"].lower() in text or
            (l["invoice_number"] and l["invoice_number"].lower() in text))), None)
        if not hit:
            hit = next((l for l in ledger_rows if l["id"] not in used
                        and abs(l["amount"] - b["amount"]) < 0.01
                        and (not b["date"] or abs((b["date"] - l["date"]).days) <= 5)), None)
        if hit:
            used.add(hit["id"])
            diff = round(b["amount"] - hit["amount"], 2)
            out.append({"bank_index": i, "payment_id": hit["id"],
                        "status": "matched" if abs(diff) < 0.01 else "amount_mismatch", "discrepancy": diff})
        else:
            out.append({"bank_index": i, "payment_id": None, "status": "unmatched_bank", "discrepancy": b["amount"]})
    for l in ledger_rows:
        if l["id"] not in used:
            out.append({"bank_index": None, "payment_id": l["id"], "status": "unmatched_ledger",
                        "discrepancy": -l["amount"]})
    return out


def draft_dispute(vendor, invoice_no, ledger_amount, bank_amount, to="", max_len=700):
    diff = round(bank_amount - ledger_amount, 2)
    body = (f"Dear {vendor},\n\nDuring reconciliation we found a difference on invoice {invoice_no}. "
            f"Our records show PKR {ledger_amount:,.2f}, the bank shows PKR {bank_amount:,.2f} "
            f"(difference PKR {diff:,.2f}). Please review and confirm the correct amount.\n\nRegards,\nFinance Team")[:max_len]
    subject = f"Payment discrepancy - invoice {invoice_no}"
    mailto = f"mailto:{to}?subject={quote(subject)}&body={quote(body)}"
    return {"subject": subject, "body": body, "mailto": mailto if len(mailto) < 1800 else None,
            "copy_to_clipboard": len(mailto) >= 1800}


# ---------------------------------------------------------------- Compliance & Tax (simplified)
KB_VERSION = "kb-v1-demo"
# DEMO knowledge base: verify these rates/clauses against current FBR / PRA notifications.
KB = {
    "goods": {"clause_id": "STA-1990-s3(1)", "rate": 18.0},
    "services": {"clause_id": "PRA-2012-s3", "rate": 16.0},
}


def tax_check(inv: dict) -> dict:
    kb = KB.get(inv["category"])
    total, tax = inv["total_amount"], inv["tax_amount"]
    base = (total - tax) if (total is not None and tax is not None) else None
    if not kb or base is None or base <= 0 or tax == 0:
        return {"status": "uncertain", "confidence": 0.4, "clause_id": None, "rate": None,
                "explanation": "Tax data missing or unclear: uncertain, needs manual review."}
    rate = round(tax / base * 100, 2)
    ok = abs(rate - kb["rate"]) <= 0.5
    fallback = (f"Tax charged at {rate}% matches the required {kb['rate']}% ({kb['clause_id']})." if ok else
                f"Tax charged at {rate}% but {kb['rate']}% is required ({kb['clause_id']}).")
    text, who = explain(f"Invoice category: {inv['category']}. Tax charged: {rate}%. Required rate: {kb['rate']}% "
                        f"under clause {kb['clause_id']}. Verdict: {'compliant' if ok else 'non-compliant'}. "
                        f"Mention the clause number.", fallback)
    if kb["clause_id"] not in text:  # a clause number is mandatory
        text = f"{text} (Clause {kb['clause_id']})"
    return {"status": "compliant" if ok else "non_compliant", "confidence": 0.95 if ok else 0.9,
            "clause_id": kb["clause_id"], "rate": rate, "explanation": text, "explained_by": who}


# ---------------------------------------------------------------- Risk & Anomaly (rule-based)
def risk_check(inv: dict, ctx: dict) -> dict:
    amount, score, why = inv["total_amount"], 0, []
    hard = False
    if ctx["duplicate"]:
        hard, score = True, score + 100
        why.append("Duplicate invoice: same vendor and invoice number already exists.")
    if ctx["blacklisted"]:
        hard, score = True, score + 100
        why.append("Vendor is blacklisted.")
    if ctx["vendor_avg"] and amount > 3 * ctx["vendor_avg"]:
        score += 50
        why.append(f"Amount is more than 3x this vendor's average ({ctx['vendor_avg']:.0f}).")
    if ctx["vendor_count"] == 0 and amount >= ctx["high_amount"]:
        score += 40
        why.append("High amount from a first-time vendor.")
    if inv["invoice_date"] and inv["invoice_date"].weekday() >= 5:
        score += 15
        why.append("Invoice dated on a weekend.")
    if amount >= 10000 and amount % 1000 == 0:
        score += 10
        why.append("Round-number amount.")
    flag = "hard" if hard else ("soft" if score >= ctx["risk_limit"] else "none")
    base = " ".join(why) or "No risk signals found."
    who = "template"
    if why:
        facts = (f"Risk score: {score} (limit {ctx['risk_limit']}). Result: {flag}. "
                 f"Invoice amount: {amount:.0f}. Rules that fired: " + base)
        base, who = explain(facts, base)
    return {"score": score, "flag": flag, "method": "rule_based", "explanation": base, "explained_by": who}


# ---------------------------------------------------------------- Orchestrator
def run_agents(inv, po, grn, risk_ctx, timeout=180):
    """Run the three agents concurrently; an agent that fails/times out is reported as stuck.
    The executor is NOT used as a context manager: that would wait for slow threads
    to finish and make the timeout useless."""
    results, stuck = {}, []
    ex = ThreadPoolExecutor(max_workers=3)
    futs = {"match": ex.submit(three_way_match, inv, po, grn),
            "tax": ex.submit(tax_check, inv),
            "risk": ex.submit(risk_check, inv, risk_ctx)}
    for name, fut in futs.items():
        try:
            results[name] = fut.result(timeout=timeout)
        except Exception:
            stuck.append(name)
    ex.shutdown(wait=False, cancel_futures=True)
    return results, stuck


def arbitrate(res, stuck, amount, approval_limit):
    """Fixed priority table from SRS Table 14. R4a/R4b are the extra safety gates."""
    if stuck:
        return "R6_timeout", "stuck", f"Agent(s) did not respond: {', '.join(stuck)}."
    risk, tax, match = res["risk"], res["tax"], res["match"]
    if risk["flag"] == "hard":
        return "R1_hard_flag", "human_review", risk["explanation"]
    if tax["status"] == "non_compliant" and tax["confidence"] >= 0.8:
        return "R2_non_compliant", "blocked", tax["explanation"]
    if risk["flag"] == "soft":
        return "R3_soft_flag", "human_review", risk["explanation"]
    if tax["status"] != "compliant" or tax["confidence"] < 0.8:
        return "R4_tax_uncertain", "human_review", tax["explanation"]
    if match["status"] != "matched":
        return "R4a_match_discrepancy", "human_review", match["details"]
    if amount > approval_limit:
        return "R4b_high_value_gate", "human_review", f"Amount {amount:,.0f} exceeds approval limit {approval_limit:,.0f}."
    return "R5_auto_approve", "approved", "Tax valid, risk low, three-way match OK."


# ---------------------------------------------------------------- Analytics & Reporting
def forecast(monthly_net: list, horizon: int = 3) -> dict:
    n = len(monthly_net)
    if n == 0:
        return {"method": "none", "note": "No history yet.", "values": []}
    if n < 6:
        avg = sum(monthly_net[-3:]) / len(monthly_net[-3:])
        return {"method": "moving_average", "note": "Less than 6 months of history: simple trend used.",
                "values": [round(avg, 2)] * horizon}
    xs = list(range(n))
    mx, my = sum(xs) / n, sum(monthly_net) / n
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, monthly_net)) / sum((x - mx) ** 2 for x in xs)
    icpt = my - slope * mx
    return {"method": "linear_trend", "note": "6+ months of history: linear trend used.",
            "values": [round(icpt + slope * (n + i), 2) for i in range(horizon)]}


def summary_text(pnl: dict, fc: dict) -> str:
    verdict = "profit" if pnl["net_profit"] >= 0 else "loss"
    txt = (f"For this period revenue was PKR {pnl['revenue']:,.0f} and expenses were PKR "
           f"{pnl['expenses']:,.0f}, giving a net {verdict} of PKR {abs(pnl['net_profit']):,.0f}.")
    if fc["values"]:
        txt += (f" Forecast ({fc['method']}) for the next month: PKR {fc['values'][0]:,.0f} net cash flow."
                f" {fc['note']}")
    text, _ = explain("Write a short management summary of these figures: " + txt, txt)
    return text