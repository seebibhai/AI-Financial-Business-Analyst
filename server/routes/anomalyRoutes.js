const express = require('express');
const { listAnomalies, updateAnomaly, listRecurring } = require('../controllers/anomalyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/recurring', listRecurring);
router.get('/', listAnomalies);
router.patch('/:id', updateAnomaly);

module.exports = router;
