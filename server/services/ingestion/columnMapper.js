/**
 * Auto-detects a mapping from the user's raw column headers to our
 * canonical transaction fields (date, description, amount, type,
 * category, vendor, customer, invoiceId, paymentMethod).
 *
 * This never silently commits a mapping — it returns a confidence score
 * per field so the frontend can ask the user to confirm anything that
 * isn't a clear match, per the "never make destructive assumptions" rule.
 */

const FIELD_SYNONYMS = {
  date: ['date', 'transaction date', 'txn date', 'invoice date', 'posted date', 'day'],
  description: ['description', 'desc', 'memo', 'narration', 'details', 'particulars', 'notes'],
  amount: ['amount', 'value', 'total', 'sale amount', 'net amount'],
  debit: ['debit', 'expense', 'withdrawal', 'cost', 'outflow', 'money out'],
  credit: ['credit', 'revenue', 'deposit', 'income', 'inflow', 'money in', 'sale amount'],
  type: ['type', 'transaction type', 'entry type', 'category type'],
  category: ['category', 'expense category', 'revenue category', 'account'],
  vendor: ['vendor', 'supplier', 'payee', 'merchant'],
  customer: ['customer', 'client', 'buyer', 'payer'],
  invoiceId: ['invoice number', 'invoice id', 'invoice #', 'invoice no'],
  paymentMethod: ['payment method', 'method', 'mode of payment', 'channel'],
};

function normalizeHeader(h) {
  return String(h).trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
}

function scoreMatch(header, synonyms) {
  const h = normalizeHeader(header);
  if (synonyms.includes(h)) return 1;
  const partial = synonyms.some((s) => h.includes(s) || s.includes(h));
  return partial ? 0.6 : 0;
}

/**
 * Returns { mapping: { field: headerName|null }, confidence: { field: 0..1 } }
 * A single raw header may only be used for one canonical field, preferring
 * the highest-confidence assignment first (greedy, but adequate for
 * business spreadsheets which rarely have ambiguous headers).
 */
function autoDetectMapping(headers) {
  const candidates = [];

  for (const field of Object.keys(FIELD_SYNONYMS)) {
    for (const header of headers) {
      const score = scoreMatch(header, FIELD_SYNONYMS[field]);
      if (score > 0) candidates.push({ field, header, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const mapping = {};
  const confidence = {};
  const usedHeaders = new Set();

  for (const { field, header, score } of candidates) {
    if (mapping[field] || usedHeaders.has(header)) continue;
    mapping[field] = header;
    confidence[field] = score;
    usedHeaders.add(header);
  }

  // amount can come either from a single "amount" column (with a type
  // column deciding sign) or from separate debit/credit columns.
  const usesDebitCredit = !mapping.amount && (mapping.debit || mapping.credit);

  return {
    mapping,
    confidence,
    usesDebitCredit,
    unmappedHeaders: headers.filter((h) => !usedHeaders.has(h)),
    requiresConfirmation: Object.values(confidence).some((c) => c < 1) || !mapping.date || (!mapping.amount && !usesDebitCredit),
  };
}

module.exports = { autoDetectMapping, FIELD_SYNONYMS, normalizeHeader };
