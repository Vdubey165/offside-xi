/**
 * squadPrefetch.js  —  drop in src/utils/
 *
 * Call prefetchSnapshot(gw) as early as possible (in AppLayout, the moment gw
 * is known). Then in MainPitch, call getSnapshot(gw) which resolves instantly
 * because the Promise is already in-flight or complete.
 *
 * Key properties:
 *  - Deduped: multiple callers share one in-flight request per GW
 *  - Zero retries on failure (MainPitch falls back to api.optimizeSquad)
 *  - Module-level: survives tab navigation within the same session
 */

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

// { [gw]: Promise<snapshot | null> }
const _cache = {};

/**
 * Fire the snapshot POST immediately and cache the Promise.
 * Safe to call multiple times — subsequent calls return the same Promise.
 */
export function prefetchSnapshot(gw) {
  if (!gw) return;
  if (_cache[gw]) return; // already in-flight or resolved

  _cache[gw] = fetch(`${BASE}/squad/snapshot/${gw}`, { method: "POST" })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
}

/**
 * Await the prefetched snapshot. Returns the snapshot object, or null if the
 * prefetch hasn't been called yet or the request failed.
 *
 * If somehow called before prefetchSnapshot (shouldn't happen), fires the
 * request now so it's never completely wasted.
 */
export function getSnapshot(gw) {
  if (!gw) return Promise.resolve(null);
  if (!_cache[gw]) prefetchSnapshot(gw); // safety net
  return _cache[gw];
}

/**
 * Clear the cache for a specific GW (call after retrain so the new snapshot
 * is fetched fresh on next load).
 */
export function invalidateSnapshot(gw) {
  if (gw) delete _cache[gw];
}