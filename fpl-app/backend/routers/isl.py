"""
ISL (Indian Super League) routes — /api/isl/*
Data via API-Football with in-memory TTL cache.
"""
import logging
import time as _time
from typing import Optional

import requests

from fastapi import APIRouter, HTTPException

from config import ISL_CACHE_TTL, ISL_LEAGUE_ID, ISL_SEASON
import os

logger = logging.getLogger(__name__)
router = APIRouter()

_isl_cache: dict = {}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _api_football(endpoint: str, params: dict) -> dict:
    api_key = os.environ.get("API_FOOTBALL_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="API_FOOTBALL_KEY not set on server. ISL live data unavailable.",
        )
    url = f"https://v3.football.api-sports.io/{endpoint}"
    headers = {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key":  api_key,
    }
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=12)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"API-Football request failed: {e}")


def _cached(key: str, fetch_fn):
    now   = _time.time()
    entry = _isl_cache.get(key)
    if entry and (now - entry["ts"]) < ISL_CACHE_TTL:
        return entry["data"]
    data = fetch_fn()
    _isl_cache[key] = {"data": data, "ts": now}
    return data


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/isl/standings")
def isl_standings():
    def fetch():
        raw = _api_football("standings", {"league": ISL_LEAGUE_ID, "season": ISL_SEASON})
        try:
            rows   = raw["response"][0]["league"]["standings"][0]
            result = []
            for r in rows:
                team_info = r.get("team", {})
                all_stats = r.get("all", {})
                goals     = all_stats.get("goals", {})
                result.append({
                    "pos":    r.get("rank"),
                    "team":   team_info.get("name", ""),
                    "logo":   team_info.get("logo", ""),
                    "played": all_stats.get("played", 0),
                    "win":    all_stats.get("win", 0),
                    "draw":   all_stats.get("draw", 0),
                    "loss":   all_stats.get("lose", 0),
                    "gf":     goals.get("for", 0),
                    "ga":     goals.get("against", 0),
                    "gd":     r.get("goalsDiff", 0),
                    "points": r.get("points", 0),
                    "form":   r.get("form", ""),
                })
            return result
        except (KeyError, IndexError, TypeError) as e:
            raise HTTPException(status_code=502, detail=f"Unexpected API-Football response shape: {e}")

    return _cached("isl_standings", fetch)


@router.get("/isl/top-scorers")
def isl_top_scorers():
    def fetch():
        raw = _api_football("players/topscorers", {"league": ISL_LEAGUE_ID, "season": ISL_SEASON})
        try:
            result = []
            for i, entry in enumerate(raw.get("response", [])[:10]):
                p          = entry.get("player", {})
                stats      = entry.get("statistics", [{}])[0]
                team       = stats.get("team", {})
                goals_info = stats.get("goals", {})
                result.append({
                    "rank":        i + 1,
                    "player":      p.get("name", ""),
                    "photo":       p.get("photo", ""),
                    "nationality": p.get("nationality", ""),
                    "team":        team.get("name", ""),
                    "logo":        team.get("logo", ""),
                    "goals":       goals_info.get("total") or 0,
                    "assists":     goals_info.get("assists") or 0,
                })
            return result
        except (KeyError, IndexError, TypeError) as e:
            raise HTTPException(status_code=502, detail=f"Unexpected API-Football response shape: {e}")

    return _cached("isl_top_scorers", fetch)


@router.get("/isl/fixtures")
def isl_fixtures(next: int = 5):
    def fetch():
        raw = _api_football("fixtures", {"league": ISL_LEAGUE_ID, "season": ISL_SEASON, "next": next})
        try:
            result = []
            for fx in raw.get("response", []):
                fixture_info = fx.get("fixture", {})
                teams        = fx.get("teams", {})
                goals        = fx.get("goals", {})
                venue        = fixture_info.get("venue", {})
                status       = fixture_info.get("status", {})
                result.append({
                    "id":          fixture_info.get("id"),
                    "date":        fixture_info.get("date", ""),
                    "home":        teams.get("home", {}).get("name", ""),
                    "home_logo":   teams.get("home", {}).get("logo", ""),
                    "away":        teams.get("away", {}).get("name", ""),
                    "away_logo":   teams.get("away", {}).get("logo", ""),
                    "home_score":  goals.get("home"),
                    "away_score":  goals.get("away"),
                    "status":      status.get("short", "NS"),
                    "status_long": status.get("long", "Not Started"),
                    "venue":       venue.get("name", ""),
                    "city":        venue.get("city", ""),
                })
            return result
        except (KeyError, IndexError, TypeError) as e:
            raise HTTPException(status_code=502, detail=f"Unexpected API-Football response shape: {e}")

    return _cached(f"isl_fixtures_{next}", fetch)
