const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const Transaction = require('../models/Transaction');
const analyticsEngine = require('../services/analytics/analyticsEngine');

/** GET /api/transactions — search, filter, sort, and paginate. */
const listTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    search = '',
    type,
    category,
    from,
    to,
    sortBy = 'date',
    sortDir = 'desc',
  } = req.query;

  const query = { userId: req.user._id };
  if (type) query.type = type;
  if (category) query.category = category;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { vendor: { $regex: search, $options: 'i' } },
      { customer: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const allowedSort = new Set(['date', 'amount', 'category', 'type']);
  const sortField = allowedSort.has(sortBy) ? sortBy : 'date';
  const sortOrder = sortDir === 'asc' ? 1 : -1;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  res.json({
    success: true,
    transactions,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

/** GET /api/transactions/:id */
const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!transaction) throw ApiError.notFound('Transaction not found');
  res.json({ success: true, transaction });
});

/** GET /api/transactions/export/csv — exports the filtered set as CSV. */
const exportTransactionsCsv = asyncHandler(async (req, res) => {
  const range = analyticsEngine.resolveDateRange({
    preset: req.query.preset,
    from: req.query.from,
    to: req.query.to,
  });
  const transactions = await analyticsEngine.fetchTransactions(req.user._id, range, { includeDuplicates: true });

  const header = 'Date,Description,Amount,Type,Category,Vendor,Customer,Currency\n';
  const rows = transactions
    .map((t) =>
      [
        new Date(t.date).toISOString().slice(0, 10),
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount,
        t.type,
        t.category,
        `"${(t.vendor || '').replace(/"/g, '""')}"`,
        `"${(t.customer || '').replace(/"/g, '""')}"`,
        t.currency,
      ].join(',')
    )
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions-export.csv"');
  res.send(header + rows);
});

module.exports = { listTransactions, getTransaction, exportTransactionsCsv };
