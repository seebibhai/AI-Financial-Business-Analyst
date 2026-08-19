const Transaction = require('../../models/Transaction');
const { round2, percentChange, mean } = require('../../utils/financialMath');

/**
 * Resolves a named or custom date range into concrete { from, to } Date
 * objects. `to` is exclusive-end-of-day so "today" and single-day ranges
 * behave intuitively.
 */
function resolveDateRange({ preset, from, to } = {}) {
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (from && to) {
    return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) };
  }

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { from: startOfDay(start), to: endOfDay(now) };
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { from: startOfDay(start), to: endOfDay(now) };
    }
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: start, to: end };
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: endOfDay(now) };
    }
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    default: {
      // "all" — fall back to a wide-open range
      return { from: new Date(2000, 0, 1), to: endOfDay(now) };
    }
  }
}

/** Returns the immediately preceding period of equal length, for growth comparisons. */
function previousPeriodOf({ from, to }) {
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: prevFrom, to: prevTo };
}

async function fetchTransactions(userId, { from, to }, { includeDuplicates = false } = {}) {
  const query = { userId, date: { $gte: from, $lte: to } };
  if (!includeDuplicates) query.isDuplicate = { $ne: true };
  return Transaction.find(query).lean();
}

function computeTotals(transactions) {
  let revenue = 0;
  let expenses = 0;
  let refunds = 0;

  for (const t of transactions) {
    if (t.type === 'revenue') revenue += t.amount;
    else if (t.type === 'expense') expenses += t.amount;
    else if (t.type === 'refund') refunds += t.amount;
    // transfers and "other" are excluded from P&L totals by design
  }

  const netRevenue = revenue - refunds;
  const profit = netRevenue - expenses;
  const margin = netRevenue !== 0 ? round2((profit / netRevenue) * 100) : 0;

  const countable = transactions.filter((t) => t.type === 'revenue' || t.type === 'expense');

  return {
    revenue: round2(revenue),
    refunds: round2(refunds),
    netRevenue: round2(netRevenue),
    expenses: round2(expenses),
    profit: round2(profit),
    margin,
    transactionCount: transactions.length,
    avgTransaction: countable.length ? round2(mean(countable.map((t) => t.amount))) : 0,
  };
}

function computeGrowth(current, previous) {
  return {
    revenueGrowth: percentChange(current.revenue, previous.revenue),
    expenseGrowth: percentChange(current.expenses, previous.expenses),
    profitGrowth: percentChange(current.profit, previous.profit),
  };
}

/** Groups transactions into monthly {period: 'YYYY-MM', revenue, expenses, profit} buckets. */
function computeMonthlySeries(transactions) {
  const buckets = new Map();

  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) buckets.set(key, { period: key, revenue: 0, expenses: 0 });
    const b = buckets.get(key);
    if (t.type === 'revenue') b.revenue += t.amount;
    else if (t.type === 'expense') b.expenses += t.amount;
  }

  return [...buckets.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((b) => ({
      period: b.period,
      revenue: round2(b.revenue),
      expenses: round2(b.expenses),
      profit: round2(b.revenue - b.expenses),
    }));
}

/** Groups transactions by category for a given type ('revenue' | 'expense'), sorted descending. */
function computeCategoryBreakdown(transactions, type, limit = null) {
  const filtered = transactions.filter((t) => t.type === type);
  const total = filtered.reduce((acc, t) => acc + t.amount, 0);
  const buckets = new Map();

  for (const t of filtered) {
    const key = t.category || 'Uncategorized';
    buckets.set(key, (buckets.get(key) || 0) + t.amount);
  }

  let rows = [...buckets.entries()]
    .map(([category, amount]) => ({
      category,
      amount: round2(amount),
      percent: total ? round2((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (limit) rows = rows.slice(0, limit);
  return rows;
}

/** Top customers or vendors by revenue/expense amount. */
function computeTopEntities(transactions, field, type, limit = 5) {
  const filtered = transactions.filter((t) => t.type === type && t[field]);
  const buckets = new Map();

  for (const t of filtered) {
    buckets.set(t[field], (buckets.get(t[field]) || 0) + t.amount);
  }

  return [...buckets.entries()]
    .map(([name, amount]) => ({ name, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * The heart of the "evidence-based AI" feature. Compares two periods and
 * returns fully-computed deltas — overall and per category — so the AI
 * layer only ever has to *explain* numbers, never invent them.
 */
function comparePeriods(currentTx, previousTx) {
  const current = computeTotals(currentTx);
  const previous = computeTotals(previousTx);
  const growth = computeGrowth(current, previous);

  const currentExpenseCats = computeCategoryBreakdown(currentTx, 'expense');
  const previousExpenseCats = computeCategoryBreakdown(previousTx, 'expense');
  const currentRevenueCats = computeCategoryBreakdown(currentTx, 'revenue');
  const previousRevenueCats = computeCategoryBreakdown(previousTx, 'revenue');

  const categoryDelta = (currentCats, previousCats) => {
    const prevMap = new Map(previousCats.map((c) => [c.category, c.amount]));
    const curMap = new Map(currentCats.map((c) => [c.category, c.amount]));
    const allCats = new Set([...prevMap.keys(), ...curMap.keys()]);

    return [...allCats]
      .map((category) => {
        const curAmt = curMap.get(category) || 0;
        const prevAmt = prevMap.get(category) || 0;
        return { category, current: round2(curAmt), previous: round2(prevAmt), change: round2(curAmt - prevAmt) };
      })
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  };

  return {
    current,
    previous,
    growth,
    expenseCategoryChanges: categoryDelta(currentExpenseCats, previousExpenseCats),
    revenueCategoryChanges: categoryDelta(currentRevenueCats, previousRevenueCats),
  };
}

module.exports = {
  resolveDateRange,
  previousPeriodOf,
  fetchTransactions,
  computeTotals,
  computeGrowth,
  computeMonthlySeries,
  computeCategoryBreakdown,
  computeTopEntities,
  comparePeriods,
};
