const Transaction = require('../../models/Transaction');
const Anomaly = require('../../models/Anomaly');
const { mean, stdDev, zScore, round2 } = require('../../utils/financialMath');

const Z_SCORE_THRESHOLD_HIGH = 3;
const Z_SCORE_THRESHOLD_MEDIUM = 2;
const MIN_SAMPLE_SIZE = 5;

/**
 * Flags transactions whose amount is a statistical outlier *within its
 * own category and type* (an unusual Marketing expense is judged against
 * other Marketing expenses, not against Rent). Pure rule-based statistics
 * — no AI involved in detection, only in narrating results elsewhere.
 */
async function detectAnomalies(userId, { from, to } = {}) {
  const query = { userId, isDuplicate: { $ne: true }, type: { $in: ['revenue', 'expense'] } };
  if (from && to) query.date = { $gte: from, $lte: to };

  const transactions = await Transaction.find(query).lean();

  // Group by type+category so revenue and expense categories are judged
  // against their own peer group.
  const groups = new Map();
  for (const t of transactions) {
    const key = `${t.type}::${t.category}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const anomalies = [];

  for (const [, group] of groups) {
    if (group.length < MIN_SAMPLE_SIZE) continue; // not enough history to judge "unusual"

    const amounts = group.map((t) => t.amount);
    const groupMean = mean(amounts);
    const groupStd = stdDev(amounts);
    if (groupStd === 0) continue;

    for (const t of group) {
      const z = zScore(t.amount, amounts);
      const absZ = Math.abs(z);
      if (absZ < Z_SCORE_THRESHOLD_MEDIUM) continue;

      const severity = absZ >= Z_SCORE_THRESHOLD_HIGH ? 'high' : 'medium';
      const direction = z > 0 ? 'spike' : 'drop';
      const expectedLow = round2(Math.max(0, groupMean - 2 * groupStd));
      const expectedHigh = round2(groupMean + 2 * groupStd);

      anomalies.push({
        userId,
        transactionId: t._id,
        type: direction,
        severity,
        expectedRange: { low: expectedLow, high: expectedHigh },
        actualAmount: t.amount,
        zScore: round2(z),
        method: 'z-score',
        reason:
          direction === 'spike'
            ? `This ${t.category} ${t.type} of ${t.amount.toLocaleString()} is about ${absZ.toFixed(1)}x the typical variation for this category (usual range ${expectedLow.toLocaleString()}–${expectedHigh.toLocaleString()}).`
            : `This ${t.category} ${t.type} of ${t.amount.toLocaleString()} is unusually low compared with the typical range for this category (${expectedLow.toLocaleString()}–${expectedHigh.toLocaleString()}).`,
      });
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

/** Persists freshly detected anomalies, skipping ones already recorded for the same transaction. */
async function detectAndStoreAnomalies(userId, dateRange) {
  const detected = await detectAnomalies(userId, dateRange);
  if (!detected.length) return [];

  const existingTxIds = new Set(
    (await Anomaly.find({ userId }).select('transactionId').lean()).map((a) => String(a.transactionId))
  );

  const toInsert = detected.filter((a) => !existingTxIds.has(String(a.transactionId)));
  if (toInsert.length) await Anomaly.insertMany(toInsert);

  return Anomaly.find({ userId }).sort({ createdAt: -1 }).populate('transactionId').lean();
}

/** Simple monthly-frequency check used to flag likely recurring vendor payments. Evidence-based, not a guess. */
async function detectRecurringExpenses(userId) {
  const transactions = await Transaction.find({ userId, type: 'expense', isDuplicate: { $ne: true } }).lean();

  const byVendorCategory = new Map();
  for (const t of transactions) {
    const key = t.vendor ? `vendor::${t.vendor}` : `category::${t.category}`;
    if (!byVendorCategory.has(key)) byVendorCategory.set(key, []);
    byVendorCategory.get(key).push(t);
  }

  const recurring = [];
  for (const [key, group] of byVendorCategory) {
    if (group.length < 3) continue;
    const months = new Set(group.map((t) => `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`));
    // Appears in at least 3 distinct months with similar amounts (low variance) => likely recurring
    const amounts = group.map((t) => t.amount);
    const cv = mean(amounts) ? stdDev(amounts) / mean(amounts) : 1; // coefficient of variation
    if (months.size >= 3 && cv < 0.25) {
      const [, label] = key.split('::');
      recurring.push({
        label,
        occurrences: group.length,
        monthsSeen: months.size,
        averageAmount: round2(mean(amounts)),
      });
    }
  }

  return recurring.sort((a, b) => b.monthsSeen - a.monthsSeen);
}

module.exports = { detectAnomalies, detectAndStoreAnomalies, detectRecurringExpenses };
