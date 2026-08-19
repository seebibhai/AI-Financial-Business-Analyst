const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dataSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataSource', required: true, index: true },
    date: { type: Date, required: true, index: true },
    description: { type: String, default: '', trim: true },
    amount: { type: Number, required: true }, // always stored positive; sign is carried by `type`
    type: {
      type: String,
      enum: ['revenue', 'expense', 'refund', 'transfer', 'other'],
      required: true,
      index: true,
    },
    category: { type: String, default: 'Uncategorized', trim: true, index: true },
    subcategory: { type: String, default: '', trim: true },
    currency: { type: String, default: 'PKR' },
    vendor: { type: String, default: '', trim: true },
    customer: { type: String, default: '', trim: true },
    invoiceId: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    isDuplicate: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
