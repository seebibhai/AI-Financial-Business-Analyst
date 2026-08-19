const express = require('express');
const {
  chat,
  analyze,
  insights,
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect);

router.post('/chat', aiLimiter, chat);
router.post('/analyze', aiLimiter, analyze);
router.post('/insights', aiLimiter, insights);
router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversation);
router.patch('/conversations/:id', renameConversation);
router.delete('/conversations/:id', deleteConversation);

module.exports = router;
