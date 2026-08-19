const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const Anomaly = require('../models/Anomaly');
const { detectAndStoreAnomalies, detectRecurringExpenses } = require('../services/anomaly/anomalyService');

/** GET /api/anomalies — runs detection fresh and returns the full list (open + reviewed). */
const listAnomalies = asyncHandler(async (req, res) => {
  const anomalies = await detectAndStoreAnomalies(req.user._id, {});
  const counts = anomalies.reduce(
    (acc, a) => {
      acc.total += 1;
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    },
    { total: 0, high: 0, medium: 0, low: 0 }
  );
  res.json({ success: true, anomalies, counts });
});

/** PATCH /api/anomalies/:id — review / dismiss / mark investigated */
const updateAnomaly = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['open', 'reviewed', 'dismissed', 'investigated'].includes(status)) {
    throw ApiError.badRequest('Invalid status value');
  }
  const anomaly = await Anomaly.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { status },
    { new: true }
  );
  if (!anomaly) throw ApiError.notFound('Anomaly not found');
  res.json({ success: true, anomaly });
});

/** GET /api/anomalies/recurring */
const listRecurring = asyncHandler(async (req, res) => {
  const recurring = await detectRecurringExpenses(req.user._id);
  res.json({ success: true, recurring });
});

module.exports = { listAnomalies, updateAnomaly, listRecurring };
