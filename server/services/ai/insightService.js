const analyticsEngine = require('../analytics/analyticsEngine');
const { detectAnomalies } = require('../anomaly/anomalyService');
const { fallbackExplanation } = require('./promptService');
const { INTENTS } = require('./intentService');
const aiProvider = require('./aiProvider');
const { SYSTEM_PROMPT } = require('./promptService');

/**
 * Generates the automatic "AI Business Insights" shown on the dashboard
 * without the user asking anything. Reuses the exact same evidence
 * objects as the chat pipeline so every insight is traceable back to a
 * calculated number ("View Evidence").
 */
async function generateDashboardInsights(userId, currencyCode) {
  const current = analyticsEngine.resolveDateRange({ preset: 'this_month' });
  const previous = analyticsEngine.resolveDateRange({ preset: 'last_month' });

  const [currentTx, previousTx, anomalies] = await Promise.all([
    analyticsEngine.fetchTransactions(userId, current),
    analyticsEngine.fetchTransactions(userId, previous),
    detectAnomalies(userId, {}),
  ]);

  const comparison = analyticsEngine.comparePeriods(currentTx, previousTx);
  const insights = [];

  if (currentTx.length + previousTx.length >= 5) {
    const summaryText = fallbackExplanation(INTENTS.BUSINESS_SUMMARY, comparison, currencyCode);
    insights.push({ id: 'summary', label: 'Based on uploaded data', text: summaryText, evidence: comparison });

    const topExpenseMover = comparison.expenseCategoryChanges[0];
    if (topExpenseMover && Math.abs(topExpenseMover.change) > 0) {
      insights.push({
        id: 'expense-mover',
        label: 'AI-generated insight',
        text: fallbackExplanation(INTENTS.EXPENSE_CHANGE, comparison, currencyCode),
        evidence: comparison,
      });
    }
  } else {
    insights.push({
      id: 'not-enough-data',
      label: 'Requires more data',
      text: 'Upload more transactions to unlock month-over-month insights — at least a few weeks of data across two periods works best.',
      evidence: null,
    });
  }

  if (anomalies.length) {
    insights.push({
      id: 'anomalies',
      label: 'AI-generated insight',
      text: `${anomalies.length} unusual transaction(s) were flagged based on statistical variation within their category. Review them in Anomaly Detection.`,
      evidence: { count: anomalies.length, top: anomalies.slice(0, 3) },
    });
  }

  // Optionally let the AI provider polish the top insight into a single sentence.
  // Falls back silently to the deterministic text above if unavailable.
  if (insights[0] && aiProvider.isConfigured()) {
    const polished = await aiProvider.generateExplanation(
      SYSTEM_PROMPT,
      `Rewrite this single financial insight as one crisp sentence (do not add new facts):\n\n${insights[0].text}`
    );
    if (polished.aiGenerated && polished.text) {
      insights[0] = { ...insights[0], text: polished.text, label: 'AI-generated insight' };
    }
  }

  return insights;
}

module.exports = { generateDashboardInsights };
