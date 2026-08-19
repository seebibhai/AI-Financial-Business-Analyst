const mongoose = require('mongoose');

const ForecastSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    metric: { type: String, enum: ['revenue', 'expenses', 'profit'], required: true },
    method: { type: String, required: true }, // e.g. "weighted_moving_average", "linear_regression"
    historicalPeriods: [
      {
        period: String,
        value: Number,
      },
    ],
    predictions: [
      {
        period: String,
        value: Number,
        lowerBound: Number,
        upperBound: Number,
      },
    ],
    dataPointsUsed: { type: Number, required: true },
    horizon: { type: Number, required: true },
    reliable: { type: Boolean, default: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Forecast', ForecastSchema);
