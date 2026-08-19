/**
 * Converts validated rows (output of dataValidator) into documents ready
 * for the Transaction collection. This is the single place that decides
 * canonical `type` and `category` values, so revenue/expense/transfer
 * classification logic lives in one auditable spot.
 */

const CANONICAL_TYPES = ['revenue', 'expense', 'refund', 'transfer', 'other'];

function classifyType(row, mapping, inferredType) {
  const explicit = mapping.type ? String(row[mapping.type] || '').trim().toLowerCase() : '';

  if (explicit) {
    if (/refund/.test(explicit)) return 'refund';
    if (/transfer/.test(explicit)) return 'transfer';
    if (/expense|debit|cost|payment/.test(explicit)) return 'expense';
    if (/revenue|income|credit|sale/.test(explicit)) return 'revenue';
  }

  return CANONICAL_TYPES.includes(inferredType) ? inferredType : 'other';
}

function normalizeRow({ row, date, amount, inferredType, isDuplicate }, mapping, userId, dataSourceId, defaultCurrency) {
  const type = classifyType(row, mapping, inferredType);
  const category = (mapping.category && row[mapping.category] && String(row[mapping.category]).trim()) || 'Uncategorized';

  return {
    userId,
    dataSourceId,
    date,
    description: (mapping.description && row[mapping.description]) || '',
    amount,
    type,
    category,
    subcategory: '',
    currency: defaultCurrency || 'PKR',
    vendor: (mapping.vendor && row[mapping.vendor]) || '',
    customer: (mapping.customer && row[mapping.customer]) || '',
    invoiceId: (mapping.invoiceId && row[mapping.invoiceId]) || '',
    paymentMethod: (mapping.paymentMethod && row[mapping.paymentMethod]) || '',
    isDuplicate: !!isDuplicate,
    metadata: {},
  };
}

function normalizeRows(validRows, mapping, userId, dataSourceId, defaultCurrency) {
  return validRows.map((r) => normalizeRow(r, mapping, userId, dataSourceId, defaultCurrency));
}

module.exports = { normalizeRows, normalizeRow, classifyType, CANONICAL_TYPES };
