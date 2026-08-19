const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const DataSource = require('../models/DataSource');
const Transaction = require('../models/Transaction');
const { parseByFileType } = require('../services/ingestion/fileParser');
const { autoDetectMapping } = require('../services/ingestion/columnMapper');
const { validateRows } = require('../services/ingestion/dataValidator');
const { normalizeRows } = require('../services/ingestion/dataNormalizer');
const pendingUploads = require('../utils/pendingUploadsStore');

const PREVIEW_ROWS = 10;

function fileTypeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  return null;
}

/** POST /api/data/upload — parses the file and returns a preview + suggested column mapping. Nothing is stored as Transactions yet. */
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file was uploaded');

  const fileType = fileTypeFromName(req.file.originalname);
  if (!fileType) throw ApiError.badRequest('Unsupported file extension');

  const parsed = parseByFileType(req.file.buffer, fileType, req.query.sheet);
  const detection = autoDetectMapping(parsed.headers);

  const dataSource = await DataSource.create({
    userId: req.user._id,
    fileName: req.file.originalname,
    fileType,
    fileSize: req.file.size,
    status: 'processing',
    recordCount: parsed.rows.length,
    detectedColumns: parsed.headers,
    columnMapping: detection.mapping,
  });

  pendingUploads.put(String(dataSource._id), {
    userId: String(req.user._id),
    buffer: req.file.buffer,
    fileType,
    headers: parsed.headers,
    rows: parsed.rows,
    sheetNames: parsed.sheetNames,
    activeSheet: parsed.activeSheet,
  });

  res.status(201).json({
    success: true,
    dataSourceId: dataSource._id,
    fileName: dataSource.fileName,
    fileType,
    sheetNames: parsed.sheetNames,
    activeSheet: parsed.activeSheet,
    headers: parsed.headers,
    mapping: detection.mapping,
    confidence: detection.confidence,
    usesDebitCredit: detection.usesDebitCredit,
    unmappedHeaders: detection.unmappedHeaders,
    requiresConfirmation: detection.requiresConfirmation,
    totalRows: parsed.rows.length,
    preview: parsed.rows.slice(0, PREVIEW_ROWS),
  });
});

/** GET /api/data/:id/sheet/:sheetName — re-parses a different worksheet of an already-uploaded Excel file. */
const selectSheet = asyncHandler(async (req, res) => {
  const pending = pendingUploads.get(req.params.id);
  if (!pending || pending.userId !== String(req.user._id)) {
    throw ApiError.notFound('Upload session expired or not found. Please re-upload the file.');
  }
  if (!pending.sheetNames) throw ApiError.badRequest('This file has no worksheets to switch between');

  const parsed = parseByFileType(pending.buffer, pending.fileType, req.params.sheetName);
  const detection = autoDetectMapping(parsed.headers);

  pendingUploads.put(req.params.id, { ...pending, headers: parsed.headers, rows: parsed.rows, activeSheet: parsed.activeSheet });

  res.json({
    success: true,
    dataSourceId: req.params.id,
    sheetNames: parsed.sheetNames,
    activeSheet: parsed.activeSheet,
    headers: parsed.headers,
    mapping: detection.mapping,
    confidence: detection.confidence,
    usesDebitCredit: detection.usesDebitCredit,
    requiresConfirmation: detection.requiresConfirmation,
    totalRows: parsed.rows.length,
    preview: parsed.rows.slice(0, PREVIEW_ROWS),
  });
});

/** POST /api/data/:id/confirm — commits the (possibly user-edited) column mapping: validates, normalizes, and stores Transactions. */
const confirmMapping = asyncHandler(async (req, res) => {
  const dataSource = await DataSource.findOne({ _id: req.params.id, userId: req.user._id });
  if (!dataSource) throw ApiError.notFound('Data source not found');

  const pending = pendingUploads.get(req.params.id);
  if (!pending) {
    throw ApiError.badRequest('This upload session has expired. Please re-upload the file and try again.');
  }

  const { mapping, usesDebitCredit = false } = req.body;
  if (!mapping || typeof mapping !== 'object') throw ApiError.badRequest('A column mapping is required');
  if (!mapping.date) throw ApiError.badRequest('A date column must be mapped');
  if (!mapping.amount && !(usesDebitCredit && (mapping.debit || mapping.credit))) {
    throw ApiError.badRequest('An amount column (or debit/credit columns) must be mapped');
  }

  const validation = validateRows(pending.rows, mapping, usesDebitCredit);
  const currency = req.user.currency || 'PKR';
  const docs = normalizeRows(validation.validRows, mapping, req.user._id, dataSource._id, currency);

  let inserted = [];
  if (docs.length) {
    inserted = await Transaction.insertMany(docs, { ordered: false });
  }

  const hasErrors = validation.issues.some((i) => i.severity === 'error');
  dataSource.status = docs.length === 0 ? 'failed' : hasErrors || validation.duplicateCount ? 'warning' : 'completed';
  dataSource.recordCount = pending.rows.length;
  dataSource.validRecordCount = validation.validCount;
  dataSource.invalidRecordCount = validation.invalidCount;
  dataSource.duplicateCount = validation.duplicateCount;
  dataSource.columnMapping = mapping;
  dataSource.validationIssues = validation.issues.slice(0, 200); // cap stored issues
  if (docs.length === 0) dataSource.errorMessage = 'No valid rows could be extracted from this file.';
  await dataSource.save();

  pendingUploads.remove(req.params.id);

  res.json({
    success: true,
    dataSource,
    recordsInserted: inserted.length,
    validCount: validation.validCount,
    invalidCount: validation.invalidCount,
    duplicateCount: validation.duplicateCount,
    issues: validation.issues.slice(0, 50),
  });
});

/** GET /api/data — list the user's uploaded data sources. */
const listDataSources = asyncHandler(async (req, res) => {
  const sources = await DataSource.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, dataSources: sources });
});

/** GET /api/data/:id */
const getDataSource = asyncHandler(async (req, res) => {
  const source = await DataSource.findOne({ _id: req.params.id, userId: req.user._id });
  if (!source) throw ApiError.notFound('Data source not found');
  res.json({ success: true, dataSource: source });
});

/** DELETE /api/data/:id — removes the data source and every transaction it produced. */
const deleteDataSource = asyncHandler(async (req, res) => {
  const source = await DataSource.findOne({ _id: req.params.id, userId: req.user._id });
  if (!source) throw ApiError.notFound('Data source not found');

  await Transaction.deleteMany({ dataSourceId: source._id, userId: req.user._id });
  await source.deleteOne();
  pendingUploads.remove(req.params.id);

  res.json({ success: true, message: 'Data source and its transactions were deleted' });
});

module.exports = { uploadFile, selectSheet, confirmMapping, listDataSources, getDataSource, deleteDataSource };
