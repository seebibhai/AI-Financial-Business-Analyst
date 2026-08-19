const mongoose = require('mongoose');

const AnomalySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    type: { type: String, enum: ['spike', 'drop', 'unusual_category'], required: true },
    severity: { type: String, enum: ['high', 'medium', 'low'], required: true },
    expectedRange: {
      low: Number,
      high: Number,
    },
    actualAmount: { type: Number, required: true },
    zScore: { type: Number },
    method: { type: String, default: 'z-score' },
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'reviewed', 'dismissed', 'investigated'], default: 'open' },
  },
  { timestamps: true }
);

AnomalySchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Anomaly', AnomalySchema);
