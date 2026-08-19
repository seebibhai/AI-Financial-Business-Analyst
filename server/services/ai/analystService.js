const Conversation = require('../../models/Conversation');
const analyticsEngine = require('../analytics/analyticsEngine');
const { forecastMetric } = require('../forecast/forecastService');
const { detectAnomalies, detectRecurringExpenses } = require('../anomaly/anomalyService');
const { classifyIntent, INTENTS, MONTHS } = require('./intentService');
const aiProvider = require('./aiProvider');
const { SYSTEM_PROMPT, buildUserPrompt, fallbackExplanation } = require('./promptService');

/**
 * Resolves a bare month name ("july") to the most recent calendar
 * occurrence of that month (this year if it hasn't passed yet this
 * year's version, otherwise last year) — e.g. asking about "December"
 * in February resolves to last December, not a future one.
 */
function resolveMonthRange(monthName) {
  const now = new Date();
  const monthIndex = MONTHS.indexOf(monthName.toLowerCase());
  let year = now.getFullYear();
  if (monthIndex > now.getMonth()) year -= 1;

  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { from, to, label };
}

function monthBefore({ from }) {
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getFullYear(), prevTo.getMonth(), 1);
  const label = prevFrom.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { from: prevFrom, to: prevTo, label };
}

/** Determines the current/previous comparison ranges based on any month names found in the question. */
function resolveComparisonRanges(months) {
  if (months.length >= 2) {
    const ranges = months.slice(0, 2).map(resolveMonthRange).sort((a, b) => a.from - b.from);
    return { previous: ranges[0], current: ranges[1] };
  }
  if (months.length === 1) {
    const current = resolveMonthRange(months[0]);
    const previous = monthBefore(current);
    return { current, previous };
  }
  const current = { ...analyticsEngine.resolveDateRange({ preset: 'this_month' }), label: 'this month' };
  const previous = { ...analyticsEngine.resolveDateRange({ preset: 'last_month' }), label: 'last month' };
  return { current, previous };
}

function confidenceFromSampleSize(count) {
  if (count >= 15) return 'high';
  if (count >= 5) return 'moderate';
  return 'low';
}

async function buildEvidence(userId, intent, months) {
  switch (intent) {
    case INTENTS.EXPENSE_CHANGE:
    case INTENTS.REVENUE_CHANGE:
    case INTENTS.PERIOD_COMPARISON:
    case INTENTS.BUSINESS_SUMMARY: {
      const { current, previous } = resolveComparisonRanges(months);
      const [currentTx, previousTx] = await Promise.all([
        analyticsEngine.fetchTransactions(userId, current),
        analyticsEngine.fetchTransactions(userId, previous),
      ]);
      const comparison = analyticsEngine.comparePeriods(currentTx, previousTx);
      const evidence = { ...comparison, currentLabel: current.label, previousLabel: previous.label };
      const confidence = confidenceFromSampleSize(currentTx.length + previousTx.length);
      return { evidence, confidence, dataSufficiencyNote: confidence === 'low' ? 'Only a small number of transactions were found for these periods.' : null };
    }

    case INTENTS.TOP_EXPENSE_CATEGORIES:
    case INTENTS.TOP_REVENUE_CATEGORIES: {
      const range = months.length ? resolveMonthRange(months[0]) : { ...analyticsEngine.resolveDateRange({ preset: 'all' }) };
      const tx = await analyticsEngine.fetchTransactions(userId, range);
      const type = intent === INTENTS.TOP_EXPENSE_CATEGORIES ? 'expense' : 'revenue';
      const categories = analyticsEngine.computeCategoryBreakdown(tx, type, 5);
      return { evidence: { categories }, confidence: categories.length ? confidenceFromSampleSize(tx.length) : 'low' };
    }

    case INTENTS.TOP_CUSTOMERS:
    case INTENTS.TOP_VENDORS: {
      const range = months.length ? resolveMonthRange(months[0]) : { ...analyticsEngine.resolveDateRange({ preset: 'all' }) };
      const tx = await analyticsEngine.fetchTransactions(userId, range);
      const field = intent === INTENTS.TOP_CUSTOMERS ? 'customer' : 'vendor';
      const type = intent === INTENTS.TOP_CUSTOMERS ? 'revenue' : 'expense';
      const entities = analyticsEngine.computeTopEntities(tx, field, type, 5);
      return { evidence: { entities }, confidence: entities.length ? confidenceFromSampleSize(tx.length) : 'low' };
    }

    case INTENTS.MOST_PROFITABLE_PERIOD: {
      const range = analyticsEngine.resolveDateRange({ preset: 'all' });
      const tx = await analyticsEngine.fetchTransactions(userId, range);
      const series = analyticsEngine.computeMonthlySeries(tx);
      const best = series.length ? series.reduce((a, b) => (b.profit > a.profit ? b : a)) : null;
      return { evidence: { monthlySeries: series, best }, confidence: series.length >= 2 ? 'high' : 'low' };
    }

    case INTENTS.FORECAST_REVENUE:
    case INTENTS.FORECAST_EXPENSES:
    case INTENTS.FORECAST_PROFIT: {
      const range = analyticsEngine.resolveDateRange({ preset: 'all' });
      const tx = await analyticsEngine.fetchTransactions(userId, range);
      const series = analyticsEngine.computeMonthlySeries(tx);
      const metric = intent === INTENTS.FORECAST_EXPENSES ? 'expenses' : intent === INTENTS.FORECAST_PROFIT ? 'profit' : 'revenue';
      const forecast = forecastMetric(series, metric, { horizon: 1, method: 'weighted_moving_average' });
      return { evidence: { forecast }, confidence: forecast.reliable ? 'high' : 'low' };
    }

    case INTENTS.ANOMALIES: {
      const anomalies = await detectAnomalies(userId, {});
      return {
        evidence: { anomalies: anomalies.slice(0, 10).map((a) => ({ ...a, transactionId: undefined })) },
        confidence: 'high',
      };
    }

    case INTENTS.RECURRING_EXPENSES: {
      const recurring = await detectRecurringExpenses(userId);
      return { evidence: { recurring }, confidence: 'high' };
    }

    case INTENTS.GENERAL_OVERVIEW:
    default: {
      const range = analyticsEngine.resolveDateRange({ preset: 'this_month' });
      const tx = await analyticsEngine.fetchTransactions(userId, range);
      const current = analyticsEngine.computeTotals(tx);
      return { evidence: { current }, confidence: confidenceFromSampleSize(tx.length) };
    }
  }
}

/**
 * Full pipeline: question -> intent -> deterministic evidence -> AI (or
 * deterministic fallback) explanation -> persisted conversation turn.
 */
async function answerQuestion({ userId, question, conversationId, currencyCode }) {
  const { intent, months } = classifyIntent(question);
  const { evidence, confidence, dataSufficiencyNote } = await buildEvidence(userId, intent, months);

  const aiResult = await aiProvider.generateExplanation(
    SYSTEM_PROMPT,
    buildUserPrompt(question, intent, evidence, currencyCode)
  );

  const answer = aiResult.aiGenerated ? aiResult.text : fallbackExplanation(intent, evidence, currencyCode);

  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, userId });
  }
  if (!conversation) {
    conversation = new Conversation({ userId, title: question.slice(0, 60), messages: [] });
  }

  conversation.messages.push({ role: 'user', content: question });
  conversation.messages.push({
    role: 'assistant',
    content: answer,
    intent,
    evidence,
    confidence,
    aiGenerated: aiResult.aiGenerated,
  });
  await conversation.save();

  return {
    conversationId: conversation._id,
    intent,
    answer,
    evidence,
    confidence,
    dataSufficiencyNote,
    aiGenerated: aiResult.aiGenerated,
  };
}

module.exports = { answerQuestion, buildEvidence, resolveComparisonRanges };
