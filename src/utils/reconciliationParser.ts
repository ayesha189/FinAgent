// src/utils/reconciliationParser.ts
// Production Rule-Based Statement Parser & Multi-Pass Reconciler (FR-TP-07, FR-TP-01, UC-4, UC-13)
// Deterministic 4-pass algorithm matching Python backend implementation.

export interface ParsedBankTransaction {
  id: string;
  ref: string;
  entity: string;
  date: string;
  amount: number;
  amt: string;
  isCredit: boolean;
  status: 'matched' | 'unmatched' | 'discrepancy';
  matchedWithId?: string;
  discrepancyAmount?: number;
  discrepancyReason?: string;
  suggestedPairId?: string;
  suggestionReason?: string;
}

export interface LedgerItem {
  id: string;
  ref: string;
  entity: string;
  date: string;
  amount: number;
  amt: string;
  status: 'matched' | 'unmatched' | 'discrepancy';
  matchedWithId?: string;
  discrepancyAmount?: number;
  discrepancyReason?: string;
  suggestedPairId?: string;
  suggestionReason?: string;
  isManualMatch?: boolean;
}

export interface StatementValidation {
  isValid: boolean;
  openingBalance: number;
  totalCredits: number;
  totalDebits: number;
  closingBalance: number;
  calculatedClosing: number;
  discrepancy: number;
  rowCount: number;
  fileHash: string;
  warnings: string[];
}

export interface ReconciliationSummary {
  exactMatchesCount: number;
  fuzzyMatchesCount: number;
  candidatesCount: number;
  discrepanciesCount: number;
  unmatchedCount: number;
}

const NOISE_WORDS = new Set([
  'dd',
  'trf',
  'payment',
  'pmt',
  'direct',
  'debit',
  'ltd',
  'uk',
  'inc',
  'co',
  'payout',
  'batch',
]);

/**
 * Normalizes text per SRS specification:
 * Lowercases, strips punctuation, removes noise words
 * Example: 'DD · Equip Rental' -> 'equip rental'
 */
export function normalizeDescription(text: string): string {
  if (!text) return '';
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return cleaned
    .split(/\s+/)
    .filter((w) => w.length > 0 && !NOISE_WORDS.has(w))
    .join(' ');
}

/**
 * Deterministic string similarity score (0.0 to 1.0)
 * Uses Dice's Coefficient / Bigram token matching (closely approximates Python SequenceMatcher)
 */
export function computeTextSimilarity(desc1: string, desc2: string): number {
  const norm1 = normalizeDescription(desc1);
  const norm2 = normalizeDescription(desc2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  // Word token overlap
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  let commonWords = 0;
  for (const w1 of words1) {
    if (words2.some((w2) => w2 === w1 || w2.includes(w1) || w1.includes(w2))) {
      commonWords++;
    }
  }
  const wordScore = (2 * commonWords) / (words1.length + words2.length);

  // Bigram character overlap for typos/stems
  const getBigrams = (str: string) => {
    const s = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      s.add(str.slice(i, i + 2));
    }
    return s;
  };
  const bigrams1 = getBigrams(norm1);
  const bigrams2 = getBigrams(norm2);
  let intersection = 0;
  bigrams1.forEach((bg) => {
    if (bigrams2.has(bg)) intersection++;
  });
  const charScore = (2 * intersection) / (bigrams1.size + bigrams2.size || 1);

  return Math.max(wordScore, charScore);
}

/**
 * Simple fast hash for file duplicate detection
 */
export function computeStringHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Format amount as Rs.
 */
export function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parses Bank Statement CSV file contents and performs mathematical balance verification.
 * Balance Rule: Opening Balance + Total Credits - Total Debits == Closing Balance
 */
export function parseBankStatementCSV(
  csvText: string,
  openingBalance = 78420.18,
  expectedClosing?: number
): { transactions: ParsedBankTransaction[]; validation: StatementValidation } {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file has insufficient rows or header is missing.');
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const dateCol = header.findIndex((h) => h.includes('date'));
  const descCol = header.findIndex((h) => h.includes('desc') || h.includes('narrat') || h.includes('payee') || h.includes('party'));
  const refCol = header.findIndex((h) => h.includes('ref') || h.includes('cheque') || h.includes('txn') || h.includes('id'));
  const debitCol = header.findIndex((h) => h.includes('debit') || h.includes('out') || h.includes('paid'));
  const creditCol = header.findIndex((h) => h.includes('credit') || h.includes('in') || h.includes('received'));
  const amtCol = header.findIndex((h) => h.includes('amount') || h.includes('val'));
  const balCol = header.findIndex((h) => h.includes('balance'));

  const transactions: ParsedBankTransaction[] = [];
  let totalCredits = 0;
  let totalDebits = 0;
  let lastReportedBalance: number | undefined = undefined;
  const warnings: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV splitting respecting quotes
    const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const cleanCells = row.map((c) => c.trim().replace(/^["']|["']$/g, ''));

    const rawDate = (dateCol >= 0 ? cleanCells[dateCol] : cleanCells[0]) || '2026-06-16';
    const rawDesc = (descCol >= 0 ? cleanCells[descCol] : cleanCells[1]) || `Statement Row ${i}`;
    const rawRef = (refCol >= 0 ? cleanCells[refCol] : '') || `TXN-${88400 + i}`;

    let isCredit = false;
    let amount = 0;

    const parseNum = (v?: string) => {
      if (!v) return 0;
      const clean = v.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    if (debitCol >= 0 && parseNum(cleanCells[debitCol]) > 0) {
      amount = parseNum(cleanCells[debitCol]);
      isCredit = false;
      totalDebits += amount;
    } else if (creditCol >= 0 && parseNum(cleanCells[creditCol]) > 0) {
      amount = parseNum(cleanCells[creditCol]);
      isCredit = true;
      totalCredits += amount;
    } else if (amtCol >= 0) {
      const parsedAmt = parseNum(cleanCells[amtCol]);
      if (parsedAmt < 0) {
        amount = Math.abs(parsedAmt);
        isCredit = false;
        totalDebits += amount;
      } else {
        amount = parsedAmt;
        isCredit = true;
        totalCredits += amount;
      }
    } else {
      amount = parseNum(cleanCells[2]);
      isCredit = false;
      totalDebits += amount;
    }

    if (balCol >= 0 && cleanCells[balCol]) {
      const b = parseNum(cleanCells[balCol]);
      if (b > 0) lastReportedBalance = b;
    }

    transactions.push({
      id: `bnk-${i}`,
      ref: rawRef,
      entity: rawDesc,
      date: rawDate,
      amount: Math.round(amount * 100) / 100,
      amt: formatRs(amount),
      isCredit,
      status: 'unmatched',
    });
  }

  // Calculate closing balance
  const calculatedClosing = Math.round((openingBalance + totalCredits - totalDebits) * 100) / 100;
  const finalExpectedClosing = expectedClosing ?? (lastReportedBalance ?? calculatedClosing);
  const discrepancy = Math.round(Math.abs(calculatedClosing - finalExpectedClosing) * 100) / 100;
  const isValid = discrepancy < 0.05;

  if (!isValid) {
    warnings.push(
      `Balance check warning: Opening (${formatRs(openingBalance)}) + Credits (${formatRs(
        totalCredits
      )}) - Debits (${formatRs(totalDebits)}) calculated ${formatRs(
        calculatedClosing
      )}, but bank statement specifies ${formatRs(finalExpectedClosing)} (Diff: ${formatRs(discrepancy)}).`
    );
  }

  const validation: StatementValidation = {
    isValid,
    openingBalance,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    closingBalance: finalExpectedClosing,
    calculatedClosing,
    discrepancy,
    rowCount: transactions.length,
    fileHash: computeStringHash(csvText),
    warnings,
  };

  return { transactions, validation };
}

/**
 * Deterministic 4-Pass Reconciler (FR-TP-07 and UC-4):
 * Pass 1: Exact Match (Same amount, same reference, ±3 days)
 * Pass 2: Amount & Date Match (Same amount, ±3 days, normalized similarity >= 0.80)
 * Pass 3: Candidate Match (Same amount, ±7 days OR similar description with small fee difference)
 * Pass 4: Leftovers (Flagged explicitly as unrecorded charge or missing ledger entry)
 */
export function runFourPassReconciliation(
  ledgerList: LedgerItem[],
  bankList: ParsedBankTransaction[],
  dayWindow = 3,
  similarityThreshold = 0.8
): {
  reconciledLedger: LedgerItem[];
  reconciledBank: ParsedBankTransaction[];
  summary: ReconciliationSummary;
} {
  // Clone to prevent mutating parameters
  const ledger: LedgerItem[] = ledgerList.map((l) => ({
    ...l,
    status: 'unmatched',
    matchedWithId: undefined,
    suggestedPairId: undefined,
    suggestionReason: undefined,
    discrepancyAmount: undefined,
  }));

  const bank: ParsedBankTransaction[] = bankList.map((b) => ({
    ...b,
    status: 'unmatched',
    matchedWithId: undefined,
    suggestedPairId: undefined,
    suggestionReason: undefined,
    discrepancyAmount: undefined,
  }));

  const usedBank = new Set<string>();
  const usedLedger = new Set<string>();

  const parseDays = (dStr: string) => {
    const t = new Date(dStr).getTime();
    return isNaN(t) ? 0 : Math.floor(t / (1000 * 3600 * 24));
  };

  let exactMatchesCount = 0;
  let fuzzyMatchesCount = 0;
  let candidatesCount = 0;

  // Deterministic order: sort by date, then ID
  const sortedLedger = [...ledger].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  // --- PASS 1: Exact Match (Amount + Exact Reference + Date Window ±3 days) ---
  for (const L of sortedLedger) {
    if (usedLedger.has(L.id)) continue;
    for (const B of bank) {
      if (usedBank.has(B.id)) continue;
      if (Math.abs(B.amount - L.amount) > 0.001) continue;
      if (Math.abs(parseDays(B.date) - parseDays(L.date)) > dayWindow) continue;

      if (L.ref && B.ref && L.ref.trim().toLowerCase() === B.ref.trim().toLowerCase()) {
        L.status = 'matched';
        L.matchedWithId = B.id;
        B.status = 'matched';
        B.matchedWithId = L.id;
        usedBank.add(B.id);
        usedLedger.add(L.id);
        exactMatchesCount++;
        break;
      }
    }
  }

  // --- PASS 2: Amount & Date + Normalized Description Similarity >= 0.80 ---
  for (const L of sortedLedger) {
    if (usedLedger.has(L.id)) continue;

    let bestBank: ParsedBankTransaction | null = null;
    let bestScore = 0;

    for (const B of bank) {
      if (usedBank.has(B.id)) continue;
      if (Math.abs(B.amount - L.amount) > 0.001) continue;
      if (Math.abs(parseDays(B.date) - parseDays(L.date)) > dayWindow) continue;

      const score = computeTextSimilarity(L.entity, B.entity);
      if (score >= similarityThreshold && score > bestScore) {
        bestScore = score;
        bestBank = B;
      }
    }

    if (bestBank) {
      L.status = 'matched';
      L.matchedWithId = bestBank.id;
      bestBank.status = 'matched';
      bestBank.matchedWithId = L.id;
      usedBank.add(bestBank.id);
      usedLedger.add(L.id);
      fuzzyMatchesCount++;
    }
  }

  // --- PASS 3: Candidate Suggestions (Unmatched but paired for Officer Review) ---
  for (const L of sortedLedger) {
    if (usedLedger.has(L.id)) continue;

    for (const B of bank) {
      if (usedBank.has(B.id)) continue;

      const sameAmount = Math.abs(B.amount - L.amount) < 0.001;
      const daysDiff = Math.abs(parseDays(B.date) - parseDays(L.date));
      const sim = computeTextSimilarity(L.entity, B.entity);

      // Candidate Scenario A: Same amount, within ±7 days, different description
      if (sameAmount && daysDiff <= 7) {
        const pairId = `pair-${L.id}-${B.id}`;
        const reason = 'Same amount, different description';
        L.suggestedPairId = pairId;
        L.suggestionReason = reason;
        B.suggestedPairId = pairId;
        B.suggestionReason = reason;
        candidatesCount++;
        break;
      }

      // Candidate Scenario B: Close vendor description, small fee discrepancy (<= Rs. 50.00)
      const diff = Math.abs(B.amount - L.amount);
      if (sim >= 0.65 && diff <= 50.0) {
        const pairId = `pair-${L.id}-${B.id}`;
        const reason = `Similar description, Rs. ${diff.toFixed(2)} difference (Surcharge/Fee)`;
        L.suggestedPairId = pairId;
        L.suggestionReason = reason;
        B.suggestedPairId = pairId;
        B.suggestionReason = reason;
        candidatesCount++;
        break;
      }
    }
  }

  // --- PASS 4: Leftovers (Flagged reasons for clarity) ---
  for (const L of ledger) {
    if (L.status === 'unmatched' && !L.suggestionReason) {
      L.suggestionReason = 'No matching bank transaction · Payment pending or unpresented';
    }
  }
  for (const B of bank) {
    if (B.status === 'unmatched' && !B.suggestionReason) {
      B.suggestionReason = 'No matching ledger entry · Potential unrecorded bank charge or interest';
    }
  }

  const discrepanciesCount = ledger.filter((l) => l.status === 'discrepancy').length;
  const unmatchedCount = ledger.filter((l) => l.status === 'unmatched').length;

  return {
    reconciledLedger: ledger,
    reconciledBank: bank,
    summary: {
      exactMatchesCount,
      fuzzyMatchesCount,
      candidatesCount,
      discrepanciesCount,
      unmatchedCount,
    },
  };
}

/**
 * Generates sample CSV bank statement content for testing bank reconciliation
 */
export function generateSampleStatementCSV(): string {
  return `Date,Description,Reference,Debit,Credit,Balance
2026-06-16,Meridian Freight,LED-1045,7120.50,,71299.68
2026-06-16,Stripe payout,LED-9941,,4820.20,76119.88
2026-06-16,Aster Works Ltd.,LED-1052,1482.00,,74637.88
2026-06-16,DD · Equip Rental,,468.00,,74169.88
2026-06-15,Apex Logistics UK (Fee incl.),,1285.00,,72884.88
2026-06-14,Beacon Soft Subscriptions,,960.00,,71924.88
2026-06-16,Barclays Account Fee,,32.50,,71892.38
`;
}
