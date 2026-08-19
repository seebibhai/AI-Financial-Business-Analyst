const {
  weightedMovingAverage,
  linearRegression,
  regressionResidualStdError,
  stdDev,
  round2,
} = require('../../utils/financialMath');

const MIN_PERIODS_FOR_FORECAST = 3;
const RECOMMENDED_PERIODS = 6;

/**
 * Generates a forecast for the next `horizon` periods from a monthly
 * series like [{ period: '2026-01', revenue: 100 }, ...]. Always returns
 * a `reliable` flag and a human-readable note — the caller/UI must not
 * present a forecast as a guarantee, and with too little data we refuse
 * to produce a confident number at all.
 */
function forecastMetric(monthlySeries, metric, { horizon = 1, method = 'weighted_moving_average' } = {}) {
  const values = monthlySeries.map((m) => m[metric]);
  const periods = monthlySeries.map((m) => m.period);

  if (values.length < MIN_PERIODS_FOR_FORECAST) {
    return {
      metric,
      method,
      reliable: false,
      dataPointsUsed: values.length,
      horizon,
      historicalPeriods: monthlySeries.map((m) => ({ period: m.period, value: m[metric] })),
      predictions: [],
      notes: `Not enough historical data to produce a reliable forecast. At least ${MIN_PERIODS_FOR_FORECAST} comparable periods are recommended (ideally ${RECOMMENDED_PERIODS}+). Only ${values.length} period(s) available.`,
    };
  }

  const predictions = [];
  const errorMargin =
    method === 'linear_regression'
      ? regressionResidualStdError(values, linearRegression(values))
      : stdDev(values.slice(-RECOMMENDED_PERIODS));

  if (method === 'linear_regression') {
    const regression = linearRegression(values);
    for (let h = 1; h <= horizon; h += 1) {
      const x = values.length - 1 + h;
      const predicted = Math.max(0, regression.predict(x));
      predictions.push(buildPrediction(periods, h, predicted, errorMargin));
    }
  } else {
    // weighted_moving_average: re-feed each new prediction back in so
    // a multi-period horizon still has a trend to lean on.
    const working = [...values];
    for (let h = 1; h <= horizon; h += 1) {
      const predicted = Math.max(0, weightedMovingAverage(working, Math.min(RECOMMENDED_PERIODS, working.length)));
      predictions.push(buildPrediction(periods, h, predicted, errorMargin));
      working.push(predicted);
    }
  }

  const reliable = values.length >= RECOMMENDED_PERIODS;

  return {
    metric,
    method,
    reliable,
    dataPointsUsed: values.length,
    horizon,
    historicalPeriods: monthlySeries.map((m) => ({ period: m.period, value: m[metric] })),
    predictions,
    notes: reliable
      ? 'Model-based forecast; not a guarantee.'
      : `Model-based forecast using only ${values.length} historical periods (${RECOMMENDED_PERIODS}+ recommended). Treat this as a rough estimate; not a guarantee.`,
  };
}

function buildPrediction(periods, h, predicted, errorMargin) {
  const lastPeriod = periods[periods.length - 1];
  const [y, m] = lastPeriod.split('-').map(Number);
  const d = new Date(y, m - 1 + h, 1);
  const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  return {
    period: label,
    value: round2(predicted),
    lowerBound: round2(Math.max(0, predicted - 1.28 * errorMargin)), // ~80% interval
    upperBound: round2(predicted + 1.28 * errorMargin),
  };
}

module.exports = { forecastMetric, MIN_PERIODS_FOR_FORECAST, RECOMMENDED_PERIODS };
