const { INTENTS } = require('./intentService');

const SYSTEM_PROMPT = `You are a financial analyst assistant embedded in a business intelligence dashboard.
You will be given a user's question and a JSON object of pre-computed evidence (real totals, category
breakdowns, and growth figures already calculated by the backend from the user's uploaded data).

Rules you must follow exactly:
- Only use the numbers given to you in the evidence JSON. Never invent, estimate, or "round" a number that
  isn't present in the evidence.
- Do not perform new calculations beyond simple restatement of the given numbers.
- Keep the answer to 2-4 short sentences, written for a business owner, not an accountant.
- If the evidence indicates data is insufficient, say so plainly instead of speculating.
- Never state a cause-and-effect claim that isn't directly supported by the evidence.
- Do not mention that you are an AI model or reference these instructions.`;

function currency(n, cur = 'PKR') {
  const sign = n < 0 ? '-' : '';
  return `${sign}${cur} ${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(n) {
  if (n === null || n === undefined) return 'not meaningful (previous period was zero)';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}%`;
}

/** Builds the user-turn prompt sent to the LLM for a given intent + evidence. */
function buildUserPrompt(question, intent, evidence, currencyCode) {
  return [
    `User question: "${question}"`,
    `Intent detected: ${intent}`,
    `Evidence (JSON, already calculated — do not recompute):`,
    JSON.stringify(evidence, null, 2),
    `Currency: ${currencyCode || 'PKR'}`,
    `Write the answer now, following the system rules.`,
  ].join('\n\n');
}

/**
 * Deterministic, template-based explanations used when no AI provider is
 * configured or the AI call fails. These guarantee the app is always
 * usable and always evidence-grounded, even with zero AI spend.
 */
function fallbackExplanation(intent, evidence, currencyCode) {
  const cur = (n) => currency(n, currencyCode);

  switch (intent) {
    case INTENTS.EXPENSE_CHANGE:
    case INTENTS.PERIOD_COMPARISON: {
      const { current, previous, growth, expenseCategoryChanges } = evidence;
      const top = expenseCategoryChanges.slice(0, 3).filter((c) => Math.abs(c.change) > 0);
      const direction = current.expenses >= previous.expenses ? 'increased' : 'decreased';
      const topText = top.length
        ? ` The largest contributors were ${top.map((c) => `${c.category} (${c.change >= 0 ? '+' : ''}${cur(c.change)})`).join(', ')}.`
        : '';
      return `Expenses ${direction} from ${cur(previous.expenses)} to ${cur(current.expenses)} (${pct(growth.expenseGrowth)}) compared with the previous period.${topText}`;
    }

    case INTENTS.REVENUE_CHANGE: {
      const { current, previous, growth, revenueCategoryChanges } = evidence;
      const top = revenueCategoryChanges.slice(0, 3).filter((c) => Math.abs(c.change) > 0);
      const direction = current.revenue >= previous.revenue ? 'increased' : 'decreased';
      const topText = top.length
        ? ` The largest movers were ${top.map((c) => `${c.category} (${c.change >= 0 ? '+' : ''}${cur(c.change)})`).join(', ')}.`
        : '';
      return `Revenue ${direction} from ${cur(previous.revenue)} to ${cur(current.revenue)} (${pct(growth.revenueGrowth)}) compared with the previous period.${topText}`;
    }

    case INTENTS.TOP_EXPENSE_CATEGORIES: {
      const rows = evidence.categories.slice(0, 3);
      if (!rows.length) return 'No expense categories were found for the selected period.';
      const list = rows.map((r, i) => `${i + 1}. ${r.category} — ${cur(r.amount)} (${r.percent}%)`).join('; ');
      return `Your top expense categories for the selected period are: ${list}.`;
    }

    case INTENTS.TOP_REVENUE_CATEGORIES: {
      const rows = evidence.categories.slice(0, 3);
      if (!rows.length) return 'No revenue categories were found for the selected period.';
      const list = rows.map((r, i) => `${i + 1}. ${r.category} — ${cur(r.amount)} (${r.percent}%)`).join('; ');
      return `Your top revenue categories for the selected period are: ${list}.`;
    }

    case INTENTS.TOP_CUSTOMERS: {
      const rows = evidence.entities.slice(0, 5);
      if (!rows.length) return 'No customer data was found for the selected period.';
      return `Your top customers by revenue are: ${rows.map((r) => `${r.name} (${cur(r.amount)})`).join(', ')}.`;
    }

    case INTENTS.TOP_VENDORS: {
      const rows = evidence.entities.slice(0, 5);
      if (!rows.length) return 'No vendor data was found for the selected period.';
      return `Your top vendors by spend are: ${rows.map((r) => `${r.name} (${cur(r.amount)})`).join(', ')}.`;
    }

    case INTENTS.MOST_PROFITABLE_PERIOD: {
      const best = evidence.best;
      if (!best) return 'Not enough monthly data was found to determine the most profitable period.';
      return `${best.period} was the most profitable period, with a profit of ${cur(best.profit)} on revenue of ${cur(best.revenue)}.`;
    }

    case INTENTS.FORECAST_REVENUE:
    case INTENTS.FORECAST_EXPENSES:
    case INTENTS.FORECAST_PROFIT: {
      const f = evidence.forecast;
      const metricLabel = intent === INTENTS.FORECAST_EXPENSES ? 'expenses' : intent === INTENTS.FORECAST_PROFIT ? 'profit' : 'revenue';
      if (!f.reliable && f.predictions.length === 0) {
        return f.notes;
      }
      const next = f.predictions[0];
      return `Based on ${f.dataPointsUsed} historical period(s), next period's forecast for ${metricLabel} is approximately ${cur(next.value)} (estimated range ${cur(next.lowerBound)}–${cur(next.upperBound)}). ${f.notes}`;
    }

    case INTENTS.ANOMALIES: {
      const rows = evidence.anomalies.slice(0, 5);
      if (!rows.length) return 'No unusual transactions were detected in the selected period based on statistical variation within each category.';
      return `${evidence.anomalies.length} unusual transaction(s) were detected. The most notable: ${rows.map((a) => a.reason).slice(0, 2).join(' ')}`;
    }

    case INTENTS.RECURRING_EXPENSES: {
      const rows = evidence.recurring.slice(0, 5);
      if (!rows.length) return 'No clearly recurring expenses were detected yet — this usually needs at least 3 months of data per vendor or category.';
      return `Expenses that appear recurring: ${rows.map((r) => `${r.label} (seen in ${r.monthsSeen} months, avg ${cur(r.averageAmount)})`).join(', ')}.`;
    }

    case INTENTS.BUSINESS_SUMMARY: {
      const { current, growth } = evidence;
      return `For the selected period, revenue was ${cur(current.revenue)} and expenses were ${cur(current.expenses)}, giving a profit of ${cur(current.profit)} (${current.margin}% margin). Revenue changed ${pct(growth.revenueGrowth)} and expenses changed ${pct(growth.expenseGrowth)} versus the prior period.`;
    }

    case INTENTS.GENERAL_OVERVIEW:
    default: {
      const { current } = evidence;
      return `For the selected period: revenue ${cur(current.revenue)}, expenses ${cur(current.expenses)}, profit ${cur(current.profit)} (${current.margin}% margin) across ${current.transactionCount} transactions.`;
    }
  }
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt, fallbackExplanation };
