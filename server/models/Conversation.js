const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    intent: { type: String, default: null },
    evidence: { type: mongoose.Schema.Types.Mixed, default: null },
    confidence: { type: String, enum: ['high', 'moderate', 'low', null], default: null },
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New analysis' },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
