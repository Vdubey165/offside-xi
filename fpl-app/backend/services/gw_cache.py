"""
Gameweek cache service — fetches current GW from FPL API with MongoDB TTL cache.
"""
import logging
import time as _time

import pandas as pd
import requests

from config import GW_CACHE_TTL_SECONDS

logger = logging.getLogger(__name__)


def _fetch_gw_from_fpl() -> dict:
    """Raw fetch from FPL API — only called when cache is stale."""
    r      = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=10).json()
    events = pd.DataFrame(r["events"])

    current = events[events["is_current"] == True]
    if len(current):
        row = current.iloc[0]
    else:
        finished = events[events["finished"] == True]
        row = finished.loc[finished["id"].idxmax()] if len(finished) else events.iloc[0]

    return {
        "gameweek":      int(row["id"]),
        "deadline_time": row.get("deadline_time") or None,
        "gw_finished":   bool(row.get("finished", False)),
    }


def get_current_gw_cached(db) -> dict:
    """
    Returns current GW data. Tries MongoDB cache (30-min TTL) first,
    falls back to live FPL API and updates the cache.
    """
    try:
        doc = db.gw_cache.find_one({"_id": "current_gw"})
        if doc:
            age = _time.time() - doc.get("cached_at", 0)
            if age < GW_CACHE_TTL_SECONDS:
                logger.debug("GW served from cache (age: %.0fs)", age)
                return {
                    "gameweek":      doc["gameweek"],
                    "deadline_time": doc.get("deadline_time"),
                    "gw_finished":   doc.get("gw_finished", False),
                }
    except Exception:
        pass  # DB unavailable — fall through to live fetch

    data = _fetch_gw_from_fpl()
    logger.info("GW fetched from FPL API: GW%d", data["gameweek"])

    try:
        db.gw_cache.replace_one(
            {"_id": "current_gw"},
            {"_id": "current_gw", "cached_at": _time.time(), **data},
            upsert=True,
        )
    except Exception:
        pass  # Non-fatal

    return data


def invalidate_gw_cache(db):
    try:
        db.gw_cache.delete_one({"_id": "current_gw"})
        logger.info("GW cache invalidated.")
    except Exception:
        pass
