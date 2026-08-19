import api from './api';

export const aiService = {
  chat: (question, conversationId) => api.post('/ai/chat', { question, conversationId }),
  insights: () => api.post('/ai/insights'),
  listConversations: () => api.get('/ai/conversations'),
  getConversation: (id) => api.get(`/ai/conversations/${id}`),
  renameConversation: (id, title) => api.patch(`/ai/conversations/${id}`, { title }),
  deleteConversation: (id) => api.delete(`/ai/conversations/${id}`),
};
