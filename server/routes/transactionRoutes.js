const express = require('express');
const { listTransactions, getTransaction, exportTransactionsCsv } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/export/csv', exportTransactionsCsv);
router.get('/', listTransactions);
router.get('/:id', getTransaction);

module.exports = router;
