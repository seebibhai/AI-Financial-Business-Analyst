/**
 * Holds a parsed-but-not-yet-committed upload between the initial
 * POST /api/data/upload call and the confirmation step where the user
 * approves (or corrects) the column mapping.
 *
 * This is intentionally a simple in-memory Map for a single-instance
 * deployment. For a multi-instance production deployment, replace this
 * with Redis (or similar) keyed the same way, so any instance can serve
 * the confirm request.
 */

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const store = new Map();

function put(id, data) {
  store.set(id, { ...data, expiresAt: Date.now() + TTL_MS });
}

function get(id) {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(id);
    return null;
  }
  return entry;
}

function remove(id) {
  store.delete(id);
}

// Periodic cleanup so abandoned uploads don't leak memory.
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(id);
  }
}, 5 * 60 * 1000).unref();

module.exports = { put, get, remove };
