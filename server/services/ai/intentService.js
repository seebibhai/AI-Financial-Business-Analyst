/**
 * Classifies a natural-language question into one of a fixed set of
 * supported intents, plus any period references it can find (month
 * names, "last month", "this month", "July vs August", etc).
 *
 * This is deliberately rule-based rather than a second LLM call: it is
 * fast, free, fully deterministic, and — most importantly — it is the
 * boundary that decides which backend analytics function runs. The AI
 * never chooses what to query; it only explains what this layer already
 * computed. See CRITICAL AI SECURITY RULE in the project README.
 */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const INTENTS = {
  EXPENSE_CHANGE: 'expense_change_explanation',
  REVENUE_CHANGE: 'revenue_change_explanation',
  TOP_EXPENSE_CATEGORIES: 'top_expense_categories',
  TOP_REVENUE_CATEGORIES: 'top_revenue_categories',
  TOP_CUSTOMERS: 'top_customers',
  TOP_VENDORS: 'top_vendors',
  MOST_PROFITABLE_PERIOD: 'most_profitable_period',
  FORECAST_REVENUE: 'forecast_revenue',
  FORECAST_EXPENSES: 'forecast_expenses',
  FORECAST_PROFIT: 'forecast_profit',
  ANOMALIES: 'anomalies',
  RECURRING_EXPENSES: 'recurring_expenses',
  PERIOD_COMPARISON: 'period_comparison',
  BUSINESS_SUMMARY: 'business_summary',
  GENERAL_OVERVIEW: 'general_overview',
};

function extractMonthMentions(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const month of MONTHS) {
    if (lower.includes(month)) found.push(month);
  }
  return found;
}

function classifyIntent(question) {
  const q = question.toLowerCase();
  const months = extractMonthMentions(q);

  const has = (...needles) => needles.some((n) => q.includes(n));

  if (has('predict', 'forecast', 'next month', 'projection')) {
    if (has('expense', 'cost', 'spending')) return { intent: INTENTS.FORECAST_EXPENSES, months };
    if (has('profit')) return { intent: INTENTS.FORECAST_PROFIT, months };
    return { intent: INTENTS.FORECAST_REVENUE, months };
  }

  if (has('recurring', 'subscription')) {
    return { intent: INTENTS.RECURRING_EXPENSES, months };
  }

  if (has('unusual', 'anomaly', 'anomalies', 'odd', 'strange')) {
    return { intent: INTENTS.ANOMALIES, months };
  }

  if (has('biggest expense', 'top expense', 'largest expense', 'expense categor')) {
    return { intent: INTENTS.TOP_EXPENSE_CATEGORIES, months };
  }

  if (has('biggest revenue', 'top revenue', 'largest revenue', 'revenue categor', 'top product')) {
    return { intent: INTENTS.TOP_REVENUE_CATEGORIES, months };
  }

  if (has('top customer', 'best customer', 'which customer')) {
    return { intent: INTENTS.TOP_CUSTOMERS, months };
  }

  if (has('top vendor', 'which vendor', 'biggest vendor', 'top supplier')) {
    return { intent: INTENTS.TOP_VENDORS, months };
  }

  if (has('most profitable', 'highest profit', 'best month')) {
    return { intent: INTENTS.MOST_PROFITABLE_PERIOD, months };
  }

  if (has('summar', 'overview of my business', 'how is my business')) {
    return { intent: INTENTS.BUSINESS_SUMMARY, months };
  }

  if (
    (has('why') && has('expense', 'cost', 'spending')) ||
    (has('expense', 'cost') && has('higher', 'increase', 'went up', 'grew', 'up'))
  ) {
    return { intent: INTENTS.EXPENSE_CHANGE, months };
  }

  if (
    (has('why') && has('revenue', 'sales', 'income')) ||
    (has('revenue', 'sales') && has('decrease', 'lower', 'dropped', 'down', 'increase', 'higher'))
  ) {
    return { intent: INTENTS.REVENUE_CHANGE, months };
  }

  if (has('compare') || months.length >= 2) {
    return { intent: INTENTS.PERIOD_COMPARISON, months };
  }

  return { intent: INTENTS.GENERAL_OVERVIEW, months };
}

module.exports = { classifyIntent, INTENTS, MONTHS, extractMonthMentions };
