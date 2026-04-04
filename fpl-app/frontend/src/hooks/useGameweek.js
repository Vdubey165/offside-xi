/**
 * useGameweek — fetches current GW from backend, with localStorage cache (30-min TTL).
 *
 * FIX: On return visits, GW is read from localStorage instantly (0ms) so the
 * entire downstream chain (snapshot fetch, challenge state) starts immediately
 * without waiting for the backend round-trip.
 *
 * Background fetch still runs to verify/refresh the cached value silently.
 */
import { useState, useEffect } from "react";

const BASE        = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";
const LS_KEY      = "offside_gw_cache";
const TTL_MS      = 30 * 60 * 1000; // 30 minutes

// Module-level in-memory cache — dedupes fetches within the same session
let _memCache = null;

function readLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > TTL_MS) return null; // stale
    return parsed;
  } catch (_) {
    return null;
  }
}

function writeLocalStorage(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch (_) {}
}

export function useGameweek() {
  // Seed state immediately from localStorage — no loading flash on return visits
  const initialCache = _memCache || readLocalStorage();

  const [gw,           setGw]           = useState(initialCache?.gw           || null);
  const [loading,      setLoading]      = useState(!initialCache);
  const [deadlineTime, setDeadlineTime] = useState(initialCache?.deadlineTime  || null);
  const [gwFinished,   setGwFinished]   = useState(initialCache?.gwFinished    || false);

  useEffect(() => {
    // If we already have in-memory cache, just sync state and stop
    if (_memCache) {
      setGw(_memCache.gw);
      setDeadlineTime(_memCache.deadlineTime);
      setGwFinished(_memCache.gwFinished);
      setLoading(false);
      return;
    }

    // If localStorage had a valid cache, apply it now (instant) then
    // background-fetch to check if GW changed
    const lsCache = readLocalStorage();
    if (lsCache) {
      _memCache = lsCache;
      setGw(lsCache.gw);
      setDeadlineTime(lsCache.deadlineTime);
      setGwFinished(lsCache.gwFinished);
      setLoading(false);
      // Still fetch in background to refresh — but don't block UI
      fetchAndUpdate(false);
      return;
    }

    // Cold start — no cache at all, show loading and fetch
    fetchAndUpdate(true);
  }, []);

  async function fetchAndUpdate(showLoading) {
    let cancelled = false;
    if (showLoading) setLoading(true);

    try {
      const res  = await fetch(`${BASE}/current-gw`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error("non-ok");
      const data = await res.json();
      if (!cancelled && data.gameweek) {
        const fresh = {
          gw:           data.gameweek,
          deadlineTime: data.deadline_time || null,
          gwFinished:   data.gw_finished   || false,
        };
        _memCache = fresh;
        writeLocalStorage(fresh);
        setGw(fresh.gw);
        setDeadlineTime(fresh.deadlineTime);
        setGwFinished(fresh.gwFinished);
      }
    } catch (_) {
      // Backend unreachable — keep whatever state we already have
    } finally {
      if (!cancelled && showLoading) setLoading(false);
    }

    return () => { cancelled = true; };
  }

  return { gw, loading, deadlineTime, gwFinished };
}