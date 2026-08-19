const express = require('express');
const {
  uploadFile,
  selectSheet,
  confirmMapping,
  listDataSources,
  getDataSource,
  deleteDataSource,
} = require('../controllers/dataController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect);

router.post('/upload', uploadLimiter, upload.single('file'), uploadFile);
router.get('/:id/sheet/:sheetName', selectSheet);
router.post('/:id/confirm', confirmMapping);
router.get('/', listDataSources);
router.get('/:id', getDataSource);
router.delete('/:id', deleteDataSource);

module.exports = router;
