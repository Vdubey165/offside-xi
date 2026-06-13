"""
Prediction service — model loading, in-memory cache, and all data-fetch logic.
No FastAPI imports here; this is pure business logic.
"""
import logging
import os
import time as _time

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
        df = pd.DataFrame(doc["players"])
        try:
            r          = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=8).json()
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

    if PREDS_PATH.exists():
        df = pd.read_csv(PREDS_PATH)
        try:
            r          = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=10).json()
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
