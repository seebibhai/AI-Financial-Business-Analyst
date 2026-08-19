/**
 * Validates raw rows against the confirmed column mapping *before* they
 * are normalized and stored. Every issue is attached to its row number
 * so the user can review exactly what was skipped and why.
 */

const DATE_FORMATS_HINT = 'Expected a recognizable date such as 2026-07-01 or 07/01/2026.';

function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const cleaned = String(raw).replace(/[,\s]/g, '').replace(/^\((.*)\)$/, '-$1'); // (100) -> -100
  const value = Number(cleaned.replace(/[^\d.\-]/g, ''));
  return Number.isFinite(value) ? value : null;
}

function parseDate(raw) {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rowFingerprint(row, mapping) {
  const date = row[mapping.date] || '';
  const amount = row[mapping.amount] ?? row[mapping.credit] ?? row[mapping.debit] ?? '';
  const desc = row[mapping.description] || '';
  return `${date}|${amount}|${desc}`.toLowerCase().trim();
}

/**
 * @param {Array<Object>} rows raw parsed rows
 * @param {Object} mapping confirmed field -> header mapping
 * @param {boolean} usesDebitCredit whether amount comes from separate debit/credit columns
 */
function validateRows(rows, mapping, usesDebitCredit) {
  const valid = [];
  const issues = [];
  const seen = new Map();
  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for 0-index, +1 for header row
    const rowIssues = [];

    const date = parseDate(row[mapping.date]);
    if (!date) {
      rowIssues.push({ row: rowNum, issue: `Missing or unrecognized date. ${DATE_FORMATS_HINT}`, severity: 'error' });
    }

    let amount = null;
    let inferredType = null;

    if (usesDebitCredit) {
      const debit = parseAmount(row[mapping.debit]);
      const credit = parseAmount(row[mapping.credit]);
      if (debit && debit !== 0) {
        amount = Math.abs(debit);
        inferredType = 'expense';
      } else if (credit && credit !== 0) {
        amount = Math.abs(credit);
        inferredType = 'revenue';
      }
    } else {
      const raw = parseAmount(row[mapping.amount]);
      if (raw !== null) {
        amount = Math.abs(raw);
        inferredType = raw < 0 ? 'expense' : 'revenue';
      }
    }

    if (amount === null) {
      rowIssues.push({ row: rowNum, issue: 'Missing or invalid amount value.', severity: 'error' });
    } else if (amount === 0) {
      rowIssues.push({ row: rowNum, issue: 'Amount is zero — row skipped.', severity: 'warning' });
    } else if (amount < 0) {
      // shouldn't happen since we took abs(), kept as a safety net
      rowIssues.push({ row: rowNum, issue: 'Negative amount could not be interpreted.', severity: 'error' });
    }

    if (mapping.category && !row[mapping.category]) {
      rowIssues.push({ row: rowNum, issue: 'Missing category — will default to "Uncategorized".', severity: 'warning' });
    }

    const hasBlockingError = rowIssues.some((i) => i.severity === 'error') || amount === 0;

    if (hasBlockingError) {
      issues.push(...rowIssues);
      return;
    }

    // Duplicate detection: identical date + amount + description
    const fingerprint = rowFingerprint(row, mapping);
    if (seen.has(fingerprint)) {
      duplicateCount += 1;
      issues.push({ row: rowNum, issue: 'Likely duplicate of an earlier row (same date, amount, description).', severity: 'warning' });
      valid.push({ row, rowNum, date, amount, inferredType, isDuplicate: true });
      return;
    }
    seen.set(fingerprint, rowNum);

    issues.push(...rowIssues); // non-blocking warnings still recorded
    valid.push({ row, rowNum, date, amount, inferredType, isDuplicate: false });
  });

  return {
    validRows: valid,
    issues,
    duplicateCount,
    validCount: valid.length,
    invalidCount: rows.length - valid.length,
  };
}

module.exports = { validateRows, parseAmount, parseDate };
