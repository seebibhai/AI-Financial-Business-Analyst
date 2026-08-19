const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const Conversation = require('../models/Conversation');
const { answerQuestion } = require('../services/ai/analystService');
const { generateDashboardInsights } = require('../services/ai/insightService');
const { aiQuestionSchema } = require('../validators/dataValidators');

/** POST /api/ai/chat — ask a natural-language question about your data. */
const chat = asyncHandler(async (req, res) => {
  const parsed = aiQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid question', parsed.error.flatten().fieldErrors);
  }
  const { question, conversationId } = parsed.data;

  const result = await answerQuestion({
    userId: req.user._id,
    question,
    conversationId,
    currencyCode: req.user.currency,
  });

  res.json({ success: true, ...result });
});

/** POST /api/ai/analyze — alias for chat, kept for API-shape parity with the spec. */
const analyze = chat;

/** POST /api/ai/insights — regenerate the dashboard's automatic insights on demand. */
const insights = asyncHandler(async (req, res) => {
  const result = await generateDashboardInsights(req.user._id, req.user.currency);
  res.json({ success: true, insights: result });
});

/** GET /api/ai/conversations */
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ userId: req.user._id })
    .select('title createdAt updatedAt')
    .sort({ updatedAt: -1 });
  res.json({ success: true, conversations });
});

/** GET /api/ai/conversations/:id */
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
  if (!conversation) throw ApiError.notFound('Conversation not found');
  res.json({ success: true, conversation });
});

/** PATCH /api/ai/conversations/:id — rename */
const renameConversation = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) throw ApiError.badRequest('Title is required');
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { title: title.trim().slice(0, 120) },
    { new: true }
  );
  if (!conversation) throw ApiError.notFound('Conversation not found');
  res.json({ success: true, conversation });
});

/** DELETE /api/ai/conversations/:id */
const deleteConversation = asyncHandler(async (req, res) => {
  const result = await Conversation.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (!result.deletedCount) throw ApiError.notFound('Conversation not found');
  res.json({ success: true, message: 'Conversation deleted' });
});

module.exports = { chat, analyze, insights, listConversations, getConversation, renameConversation, deleteConversation };
