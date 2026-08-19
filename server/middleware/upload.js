const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/apiError');

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream', // some browsers send this for .csv/.xlsx
]);

// Files are kept only in memory long enough to parse them — we never
// write untrusted uploads to disk under a user-controlled filename.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(ApiError.badRequest(`Unsupported file type "${ext}". Allowed: .csv, .xlsx, .xls`));
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(ApiError.badRequest(`Unsupported MIME type "${file.mimetype}"`));
  }
  // Reject path traversal attempts / control characters in filenames
  if (/[\\/]|\.\./.test(file.originalname)) {
    return cb(ApiError.badRequest('Invalid file name'));
  }

  cb(null, true);
}

const maxSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB) || 15;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1 },
});

/** Generates a safe, random storage-friendly identifier for a given upload. */
function safeFileId(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

module.exports = { upload, safeFileId, ALLOWED_EXTENSIONS };
