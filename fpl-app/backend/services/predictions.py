"""
Prediction service — model loading, in-memory cache, and all data-fetch logic.
No FastAPI imports here; this is pure business logic.
"""
import logging
import os
import time as _time
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from config import MODEL_PATH, PREDS_PATH, FEATURES

logger = logging.getLogger(__name__)

# ── Optional heavy imports ─────────────────────────────────────────────────────
try:
    import joblib
    JOBLIB_OK = True
except ImportError:
    JOBLIB_OK = False

# ── In-memory caches ───────────────────────────────────────────────────────────
_model       = None
_predictions = None


# ── Season-staleness helpers ─────────────────────────────────────────────────
# Cached predictions (Mongo doc or CSV) written before this season's GW1
# deadline belong to a previous season and must never be served as-is —
# player IDs, team IDs, and rosters can all change between seasons.

def _parse_iso_naive_utc(s: str | None):
    """Parse an ISO timestamp (with or without trailing 'Z') into a naive UTC
    datetime so it can be compared against datetime.utcnow()-style values."""
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", ""))
    except Exception:
        return None


def _season_gw1_deadline(events: list) -> "datetime | None":
    """The deadline_time of GW1 for whichever season is currently live."""
    for ev in events or []:
        if ev.get("id") == 1 and ev.get("deadline_time"):
            return _parse_iso_naive_utc(ev["deadline_time"])
    return None


def _is_stale_for_new_season(cached_at, gw1_deadline) -> bool:
    """True only when we can positively confirm the cache predates this
    season's GW1. If either timestamp is missing, fail open (don't block
    serving data just because we couldn't determine freshness)."""
    if cached_at is None or gw1_deadline is None:
        return False
    return cached_at < gw1_deadline


# ── Model ─────────────────────────────────────────────────────────────────────

def get_model():
    global _model
    if _model is not None:
        return _model
    if not JOBLIB_OK:
        raise RuntimeError("joblib not installed. Run: pip install joblib")
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found at '{MODEL_PATH}'. "
            "Run FPL_Pipeline_Fixed.ipynb first to generate fpl_model.pkl."
        )
    _model = joblib.load(MODEL_PATH)
    logger.info("Model loaded from %s", MODEL_PATH)
    return _model


# ── Predictions ───────────────────────────────────────────────────────────────

def _load_predictions_from_mongo() -> pd.DataFrame | None:
    try:
        from pymongo import MongoClient
        from config import MONGO_URI
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            tls=True,
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True,
        )
        db  = client["offside_xi"]
        doc = db.predictions_cache.find_one({"_id": "latest"})
        if not doc or "players" not in doc:
            return None

        # Fetch bootstrap-static once — used both for the staleness check
        # and (below) for the live team/status/price enrichment.
        r = None
        try:
            r = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=8).json()
        except Exception:
            pass

        gw1_deadline = _season_gw1_deadline(r.get("events", [])) if r else None
        cached_at    = _parse_iso_naive_utc(doc.get("updated_at"))

        if _is_stale_for_new_season(cached_at, gw1_deadline):
            logger.warning(
                "predictions_cache is from a previous season (cached_at=%s, "
                "this season's GW1 deadline=%s) — discarding instead of serving stale data.",
                cached_at, gw1_deadline,
            )
            return None

        df = pd.DataFrame(doc["players"])
        try:
            teams      = pd.DataFrame(r["teams"])
            players    = pd.DataFrame(r["elements"])[["id", "status", "now_cost"]]
            team_map   = teams.set_index("id")["name"].to_dict()
            status_map = players.set_index("id")["status"].to_dict()
            price_map  = players.set_index("id")["now_cost"].to_dict()
            df["team_name"] = df["team"].map(team_map)
            df["status"]    = df["player_id"].map(status_map).fillna("a")
            df["now_cost"]  = df["player_id"].map(price_map).fillna(df["now_cost"])
            df["price"]     = df["now_cost"] / 10
        except Exception:
            pass
        pos_map        = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
        df["position"] = df["element_type"].map(pos_map)
        return df
    except Exception:
        return None


def _fetch_live_fpl_data() -> pd.DataFrame:
    r        = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=15).json()
    teams    = pd.DataFrame(r["teams"])
    elements = pd.DataFrame(r["elements"])

    team_map = teams.set_index("id")["name"].to_dict()
    pos_map  = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

    df = elements.copy()
    df["player_id"]     = df["id"]
    df["team_name"]     = df["team"].map(team_map)
    df["position"]      = df["element_type"].map(pos_map)
    df["price"]         = df["now_cost"] / 10
    df["predicted_pts"] = pd.to_numeric(df["points_per_game"], errors="coerce").fillna(0).round(2)

    gp = pd.to_numeric(df.get("minutes", 0), errors="coerce").fillna(0) / 90
    gp = gp.clip(lower=1)
    df["avg_pts_last3"] = df["predicted_pts"]
    df["avg_xgi_last3"] = (
        pd.to_numeric(df.get("expected_goal_involvements", 0), errors="coerce").fillna(0) / gp
    ).round(2)

    return df[[
        "player_id", "web_name", "team_name", "team", "position",
        "price", "now_cost", "predicted_pts", "status",
        "element_type", "avg_pts_last3", "avg_xgi_last3",
    ]]


def get_predictions() -> pd.DataFrame:
    global _predictions
    if _predictions is not None:
        return _predictions

    df = _load_predictions_from_mongo()
    if df is not None:
        _predictions = df
        logger.info("Predictions loaded from MongoDB cache.")
        return _predictions

    csv_is_current = True
    r = None
    if PREDS_PATH.exists():
        try:
            r = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=10).json()
            gw1_deadline = _season_gw1_deadline(r.get("events", []))
            csv_mtime    = datetime.utcfromtimestamp(os.path.getmtime(PREDS_PATH))
            if _is_stale_for_new_season(csv_mtime, gw1_deadline):
                csv_is_current = False
                logger.warning(
                    "player_predictions.csv predates this season's GW1 (mtime=%s, "
                    "GW1 deadline=%s) — skipping it in favor of live FPL data.",
                    csv_mtime, gw1_deadline,
                )
        except Exception:
            pass  # can't determine freshness — fail open, use the CSV

    if PREDS_PATH.exists() and csv_is_current:
        df = pd.read_csv(PREDS_PATH)
        try:
            if r is None:
                r = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=10).json()
            teams      = pd.DataFrame(r["teams"])
            players    = pd.DataFrame(r["elements"])[["id", "status"]]
            team_map   = teams.set_index("id")["name"].to_dict()
            status_map = players.set_index("id")["status"].to_dict()
            df["team_name"] = df["team"].map(team_map)
            df["status"]    = df["player_id"].map(status_map)
        except Exception:
            df["team_name"] = df.get("team_name", df["team"].astype(str))
            df["status"]    = df.get("status", "a")

        pos_map             = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
        df["position"]      = df["element_type"].map(pos_map)
        df["price"]         = df["now_cost"] / 10
        df["predicted_pts"] = df["predicted_pts"].round(2)

        for col in ["avg_pts_last3", "avg_xgi_last3"]:
            if col not in df.columns:
                df[col] = df["predicted_pts"]

        _predictions = df
        logger.info("Predictions loaded from CSV.")
        return _predictions

    logger.warning("No MongoDB cache or CSV found — falling back to live FPL API.")
    df = _fetch_live_fpl_data()
    _predictions = df
    return _predictions


def invalidate_predictions_cache():
    """Call after a retrain to force reload on next request."""
    global _predictions
    _predictions = None
    logger.info("In-memory predictions cache invalidated.")