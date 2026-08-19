/**
 * Pure, deterministic numeric helpers used by the analytics, forecast,
 * and anomaly services. Nothing in this file talks to the AI provider —
 * it exists specifically so financial numbers are always calculated by
 * code, never guessed by a language model.
 */

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

function mean(values) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = sum(values.map((v) => (v - m) ** 2)) / (values.length - 1);
  return Math.sqrt(variance);
}

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null; // undefined growth rate
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/** Simple moving average over the last `window` values. */
function movingAverage(values, window) {
  const slice = values.slice(-window);
  return mean(slice);
}

/**
 * Weighted moving average — more recent periods count more.
 * Weights are 1..n so the most recent period has the highest weight.
 */
function weightedMovingAverage(values, window) {
  const slice = values.slice(-window);
  if (!slice.length) return 0;
  const weights = slice.map((_, i) => i + 1);
  const weightedSum = slice.reduce((acc, v, i) => acc + v * weights[i], 0);
  return weightedSum / sum(weights);
}

/**
 * Ordinary least squares linear regression y = a + bx over evenly
 * spaced periods (x = 0..n-1). Returns the fitted slope/intercept plus
 * a function to project future periods.
 */
function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, predict: () => values[0] || 0 };

  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  return {
    slope,
    intercept,
    predict: (x) => intercept + slope * x,
  };
}

/** Residual standard error of a fitted linear regression, used for confidence bands. */
function regressionResidualStdError(values, regression) {
  const n = values.length;
  if (n < 3) return stdDev(values);
  const residuals = values.map((v, i) => v - regression.predict(i));
  const ss = sum(residuals.map((r) => r ** 2));
  return Math.sqrt(ss / (n - 2));
}

/** Z-score of a single value against a distribution. */
function zScore(value, values) {
  const m = mean(values);
  const sd = stdDev(values);
  if (sd === 0) return 0;
  return (value - m) / sd;
}

/** Interquartile range bounds, an alternative outlier method to z-score. */
function iqrBounds(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr, q1, q3 };
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return 0;
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  }
  return sortedValues[base];
}

module.exports = {
  round2,
  sum,
  mean,
  stdDev,
  percentChange,
  movingAverage,
  weightedMovingAverage,
  linearRegression,
  regressionResidualStdError,
  zScore,
  iqrBounds,
  quantile,
};
