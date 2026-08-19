const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const Forecast = require('../models/Forecast');
const analyticsEngine = require('../services/analytics/analyticsEngine');
const { forecastMetric } = require('../services/forecast/forecastService');
const { forecastRequestSchema } = require('../validators/dataValidators');

async function runForecast(req, metric) {
  const parsed = forecastRequestSchema.safeParse({ ...req.body, metric });
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid forecast request', parsed.error.flatten().fieldErrors);
  }
  const { horizon, method } = parsed.data;

  const range = analyticsEngine.resolveDateRange({ preset: 'all' });
  const tx = await analyticsEngine.fetchTransactions(req.user._id, range);
  const series = analyticsEngine.computeMonthlySeries(tx);

  const result = forecastMetric(series, metric, { horizon, method });

  if (result.dataPointsUsed > 0) {
    await Forecast.create({
      userId: req.user._id,
      metric,
      method,
      historicalPeriods: result.historicalPeriods,
      predictions: result.predictions,
      dataPointsUsed: result.dataPointsUsed,
      horizon,
      reliable: result.reliable,
      notes: result.notes,
    });
  }

  return result;
}

const forecastRevenue = asyncHandler(async (req, res) => {
  const result = await runForecast(req, 'revenue');
  res.json({ success: true, ...result });
});

const forecastExpenses = asyncHandler(async (req, res) => {
  const result = await runForecast(req, 'expenses');
  res.json({ success: true, ...result });
});

const forecastProfit = asyncHandler(async (req, res) => {
  const result = await runForecast(req, 'profit');
  res.json({ success: true, ...result });
});

/** GET /api/forecast/history — previously generated forecasts, most recent first. */
const forecastHistory = asyncHandler(async (req, res) => {
  const forecasts = await Forecast.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ success: true, forecasts });
});

module.exports = { forecastRevenue, forecastExpenses, forecastProfit, forecastHistory };
