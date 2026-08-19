/**
 * Single choke point for every outbound call to a third-party AI API.
 * The rest of the app only calls `generateExplanation(systemPrompt, userPrompt)`
 * and never knows or cares whether that's Gemini, Anthropic, or nothing.
 *
 * Design notes:
 * - Only the minimal structured evidence needed to answer a question is
 *   ever sent (see promptService) — not raw transaction dumps, not other
 *   users' data, not credentials.
 * - If AI_PROVIDER=none or no key is configured, callers get a clear
 *   `unavailable` signal so they can fall back to a deterministic,
 *   template-based explanation instead of failing the request.
 * - Timeouts and JSON parsing are handled once, here, instead of being
 *   duplicated across services/ai/*.
 */

const TIMEOUT_MS = 20000;

async function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await withTimeout(
    (signal) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      }),
    TIMEOUT_MS
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error('Gemini returned an empty response');
  return text.trim();
}

async function callAnthropic(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const res = await withTimeout(
    (signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal,
        body: JSON.stringify({
          model,
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      }),
    TIMEOUT_MS
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') || '';
  if (!text) throw new Error('Anthropic returned an empty response');
  return text.trim();
}

function isConfigured() {
  const provider = (process.env.AI_PROVIDER || 'none').toLowerCase();
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  return false;
}

/**
 * Returns { text, aiGenerated: true } on success, or
 * { text: null, aiGenerated: false, reason } if no provider is
 * configured or the call failed — callers must handle the fallback.
 */
async function generateExplanation(systemPrompt, userPrompt) {
  const provider = (process.env.AI_PROVIDER || 'none').toLowerCase();

  if (!isConfigured()) {
    return { text: null, aiGenerated: false, reason: 'no_provider_configured' };
  }

  try {
    const text = provider === 'anthropic' ? await callAnthropic(systemPrompt, userPrompt) : await callGemini(systemPrompt, userPrompt);
    return { text, aiGenerated: true, reason: null };
  } catch (err) {
    console.error('[aiProvider] AI call failed, falling back to deterministic explanation:', err.message);
    return { text: null, aiGenerated: false, reason: 'provider_error' };
  }
}

module.exports = { generateExplanation, isConfigured };
