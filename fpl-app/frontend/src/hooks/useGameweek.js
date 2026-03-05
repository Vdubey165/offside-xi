/**
 * useGameweek — fetches the real current GW from the FPL API via our backend.
 * Returns { gw, loading, deadlineTime, gwFinished }
 */
import { useState, useEffect } from "react";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

let _cache = null; // module-level cache so we only fetch once per session

export function useGameweek() {
  const [gw,           setGw]           = useState(_cache?.gw           || null);
  const [loading,      setLoading]      = useState(!_cache);
  const [deadlineTime, setDeadlineTime] = useState(_cache?.deadlineTime  || null); // ISO string
  const [gwFinished,   setGwFinished]   = useState(_cache?.gwFinished    || false);

  useEffect(() => {
    if (_cache) {
      setGw(_cache.gw);
      setDeadlineTime(_cache.deadlineTime);
      setGwFinished(_cache.gwFinished);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchGW() {
      try {
        const res  = await fetch(`${BASE}/current-gw`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (!cancelled && data.gameweek) {
          _cache = {
            gw:           data.gameweek,
            deadlineTime: data.deadline_time || null,
            gwFinished:   data.gw_finished   || false,
          };
          setGw(_cache.gw);
          setDeadlineTime(_cache.deadlineTime);
          setGwFinished(_cache.gwFinished);
        }
      } catch (_) {
        // Backend unreachable — leave null
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGW();
    return () => { cancelled = true; };
  }, []);

  return { gw, loading, deadlineTime, gwFinished };
}