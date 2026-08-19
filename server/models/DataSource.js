const mongoose = require('mongoose');

const DataSourceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['csv', 'xlsx', 'xls'], required: true },
    fileSize: { type: Number, required: true },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'completed', 'warning', 'failed'],
      default: 'uploading',
    },
    recordCount: { type: Number, default: 0 },
    validRecordCount: { type: Number, default: 0 },
    invalidRecordCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    columnMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    detectedColumns: [{ type: String }],
    validationIssues: [
      {
        row: Number,
        issue: String,
        severity: { type: String, enum: ['error', 'warning'] },
      },
    ],
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

DataSourceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DataSource', DataSourceSchema);
