const { z } = require('zod');

const columnMappingSchema = z.object({
  dataSourceId: z.string().min(1),
  mapping: z.record(z.string(), z.string().nullable()),
  // raw rows the client previewed/edited before confirming (already parsed client-side preview)
  confirm: z.boolean().default(true),
});

const aiQuestionSchema = z.object({
  question: z.string().trim().min(3, 'Ask a more specific question').max(500),
  conversationId: z.string().optional().nullable(),
});

const forecastRequestSchema = z.object({
  metric: z.enum(['revenue', 'expenses', 'profit']),
  horizon: z.coerce.number().int().min(1).max(12).default(1),
  method: z.enum(['weighted_moving_average', 'linear_regression']).default('weighted_moving_average'),
});

module.exports = { columnMappingSchema, aiQuestionSchema, forecastRequestSchema };
