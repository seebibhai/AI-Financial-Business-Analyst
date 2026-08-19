const Papa = require('papaparse');
const XLSX = require('xlsx');
const ApiError = require('../../utils/apiError');

/**
 * Parses a CSV buffer into an array of row objects keyed by header name.
 * Uses PapaParse in "dynamicTyping: false" mode so we control number/date
 * coercion explicitly later in dataNormalizer, rather than trusting an
 * auto-typed value.
 */
function parseCsv(buffer) {
  const text = buffer.toString('utf-8');
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors && result.errors.length) {
    const fatal = result.errors.filter((e) => e.type === 'Delimiter' || e.row === undefined);
    if (fatal.length) {
      throw ApiError.badRequest('Could not parse CSV file. Check that it is a valid, comma-separated file.');
    }
  }

  const headers = result.meta.fields || [];
  if (!headers.length) {
    throw ApiError.badRequest('No columns detected in this CSV file.');
  }

  return { headers, rows: result.data };
}

/**
 * Parses an Excel buffer (.xlsx/.xls). Returns all sheet names plus rows
 * for the requested (or first) sheet so the client can offer a sheet picker.
 */
function parseExcel(buffer, sheetName) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    throw ApiError.badRequest('Could not read this Excel file. It may be corrupted or password-protected.');
  }

  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) {
    throw ApiError.badRequest('This Excel file has no worksheets.');
  }

  const targetSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const sheet = workbook.Sheets[targetSheet];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];

  if (!headers.length) {
    throw ApiError.badRequest(`No data found in worksheet "${targetSheet}".`);
  }

  return { sheetNames, activeSheet: targetSheet, headers, rows };
}

function parseByFileType(buffer, fileType, sheetName) {
  if (fileType === 'csv') {
    const { headers, rows } = parseCsv(buffer);
    return { sheetNames: null, activeSheet: null, headers, rows };
  }
  if (fileType === 'xlsx' || fileType === 'xls') {
    return parseExcel(buffer, sheetName);
  }
  throw ApiError.badRequest(`Unsupported file type: ${fileType}`);
}

module.exports = { parseCsv, parseExcel, parseByFileType };
