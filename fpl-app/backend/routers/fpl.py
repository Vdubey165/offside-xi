"""
FPL data routes — /api/players, /api/fpl/*, /api/pl/*, /api/current-gw,
                  /api/health, /api/warmup, /api/debug
"""
import logging
from datetime import datetime as dt
from typing import Optional

import pandas as pd
import requests

from fastapi import APIRouter, HTTPException

from config import MODEL_PATH, PREDS_PATH, ROOT_DIR, DATA_DIR, MODELS_DIR, FEATURES
from db import get_db
from services.predictions import get_predictions, get_model
from services.gw_cache import get_current_gw_cached
import services.warmup as _warmup_svc

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Health & debug ────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {
        "status":      "ok",
        "model_found": MODEL_PATH.exists(),
        "preds_found": PREDS_PATH.exists(),
        "root_dir":    str(ROOT_DIR),
        "data_dir":    str(DATA_DIR),
        "models_dir":  str(MODELS_DIR),
    }


@router.get("/debug")
def debug():
    return {
        "root_dir":          str(ROOT_DIR),
        "data_dir":          str(DATA_DIR),
        "models_dir":        str(MODELS_DIR),
        "model_path":        str(MODEL_PATH),
        "preds_path":        str(PREDS_PATH),
        "model_exists":      MODEL_PATH.exists(),
        "preds_exists":      PREDS_PATH.exists(),
        "data_dir_exists":   DATA_DIR.exists(),
        "models_dir_exists": MODELS_DIR.exists(),
        "data_dir_files":    [p.name for p in DATA_DIR.iterdir()] if DATA_DIR.exists() else [],
        "models_dir_files":  [p.name for p in MODELS_DIR.iterdir()] if MODELS_DIR.exists() else [],
        "mode":              "notebook_predictions" if PREDS_PATH.exists() else "live_fpl_api_fallback",
    }


@router.get("/warmup")
def warmup():
    status = {
        "predictions_loaded": False,
        "gw":              None,
        "snapshot_exists": False,
        "warmup_done":     _warmup_svc.warmup_done,
    }
    try:
        preds = get_predictions()
        status["predictions_loaded"] = len(preds) > 0
    except Exception as e:
        status["predictions_error"] = str(e)

    try:
        db           = get_db()
        gw_data      = get_current_gw_cached(db)
        status["gw"] = gw_data["gameweek"]
    except Exception as e:
        status["gw_error"] = str(e)

    if status["gw"]:
        try:
            db       = get_db()
            existing = db.squad_snapshots.find_one({"gw": status["gw"]})
            if existing:
                status["snapshot_exists"] = True
            else:
                from routers.squad import _build_snapshot
                _build_snapshot(status["gw"], db)
                status["snapshot_exists"]    = True
                status["snapshot_built_now"] = True
        except Exception as e:
            status["snapshot_error"] = str(e)

    status["ok"] = status["predictions_loaded"] and status["gw"] is not None
    return status


# ── Gameweek ──────────────────────────────────────────────────────────────────

@router.get("/current-gw")
def current_gw():
    try:
        db = get_db()
        return get_current_gw_cached(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch current gameweek: {e}")


@router.get("/gw-points/{gw}")
def get_gw_points(gw: int, player_ids: str = ""):
    if not player_ids:
        return {}
    try:
        ids     = [int(x) for x in player_ids.split(",") if x.strip()]
        live    = requests.get(f"https://fantasy.premierleague.com/api/event/{gw}/live/", timeout=10).json()
        live_df = pd.DataFrame([
            {"id": e["id"], "points": e["stats"]["total_points"]}
            for e in live.get("elements", [])
        ])
        result = {}
        for pid in ids:
            row = live_df[live_df["id"] == pid]
            result[str(pid)] = int(row.iloc[0]["points"]) if not row.empty else 0
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch GW points: {e}")


# ── Players ───────────────────────────────────────────────────────────────────

@router.get("/players")
def get_players(
    position:       Optional[str] = None,
    max_price:      float         = 15.0,
    only_available: bool          = True,
    limit:          int           = 50,
):
    df = get_predictions().copy()
    if position:
        df = df[df["position"] == position.upper()]
    df = df[df["price"] <= max_price]
    if only_available:
        df = df[df["status"] == "a"]
    df = df.sort_values("predicted_pts", ascending=False).head(limit)

    cols = ["player_id", "web_name", "team_name", "position",
            "price", "predicted_pts", "status", "avg_pts_last3", "avg_xgi_last3"]
    cols = [c for c in cols if c in df.columns]
    return df[cols].fillna(0).to_dict(orient="records")


@router.get("/players/{player_id}")
def get_player_detail(player_id: int):
    BASE_URL = "https://fantasy.premierleague.com/api"
    try:
        boot = requests.get(f"{BASE_URL}/bootstrap-static/", timeout=10).json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch FPL data: {e}")

    elements  = pd.DataFrame(boot["elements"])
    teams     = pd.DataFrame(boot["teams"])
    team_map  = teams.set_index("id")["name"].to_dict()
    short_map = teams.set_index("id")["short_name"].to_dict()

    row = elements[elements["id"] == player_id]
    if row.empty:
        preds    = get_predictions()
        pred_row = preds[preds["player_id"] == player_id]
        if not pred_row.empty:
            web_name = pred_row.iloc[0]["web_name"]
            row      = elements[elements["web_name"] == web_name]

    if row.empty:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found")

    p      = row.iloc[0]
    fpl_id = int(p["id"])
    try:
        summary  = requests.get(f"{BASE_URL}/element-summary/{fpl_id}/", timeout=10).json()
        history  = summary.get("history", [])
        fixtures = summary.get("fixtures", [])
    except Exception:
        history  = []
        fixtures = []

    gw_history = [
        {
            "round":        h["round"],
            "total_points": h["total_points"],
            "minutes":      h["minutes"],
            "goals_scored": h["goals_scored"],
            "assists":      h["assists"],
            "clean_sheets": h["clean_sheets"],
            "bonus":        h["bonus"],
        }
        for h in history[-5:]
    ]

    next_fixtures = []
    for fx in fixtures[:5]:
        opp_id   = fx.get("team_a") if fx.get("is_home") else fx.get("team_h")
        opp_name = team_map.get(opp_id, short_map.get(opp_id, "?"))
        next_fixtures.append({
            "event":      fx.get("event"),
            "opponent":   opp_name,
            "is_home":    fx.get("is_home"),
            "difficulty": fx.get("difficulty"),
        })

    pos_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
    return {
        "player_id":       int(p["id"]),
        "web_name":        p["web_name"],
        "full_name":       f"{p['first_name']} {p['second_name']}",
        "team_name":       team_map.get(int(p["team"]), ""),
        "position":        pos_map.get(int(p["element_type"]), ""),
        "price":           round(float(p["now_cost"]) / 10, 1),
        "status":          p["status"],
        "news":            p["news"] if p.get("news") else None,
        "total_points":    int(p["total_points"]),
        "goals_scored":    int(p["goals_scored"]),
        "assists":         int(p["assists"]),
        "clean_sheets":    int(p["clean_sheets"]),
        "bonus":           int(p["bonus"]),
        "minutes":         int(p["minutes"]),
        "selected_by_pct": p.get("selected_by_percent") or p.get("selected_by_pct"),
        "form":            p.get("form"),
        "points_per_game": p.get("points_per_game"),
        "history":         gw_history,
        "fixtures":        next_fixtures,
    }


@router.get("/debug/player-match/{player_id}")
def debug_player_match(player_id: int):
    preds    = get_predictions()
    pred_row = preds[preds["player_id"] == player_id]
    boot     = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=10).json()
    elements = pd.DataFrame(boot["elements"])
    web_name = pred_row.iloc[0]["web_name"] if not pred_row.empty else None
    fpl_row  = elements[elements["web_name"] == web_name] if web_name else pd.DataFrame()
    return {
        "player_id_searched": player_id,
        "found_in_csv":       not pred_row.empty,
        "web_name_in_csv":    web_name,
        "found_in_fpl_api":   not fpl_row.empty,
        "fpl_id":             int(fpl_row.iloc[0]["id"]) if not fpl_row.empty else None,
        "sample_csv_ids":     preds["player_id"].head(5).tolist(),
        "sample_fpl_ids":     elements["id"].head(5).tolist(),
    }


# ── FPL entry ─────────────────────────────────────────────────────────────────

@router.get("/fpl/entry/{team_id}")
def fpl_entry(team_id: int):
    try:
        r = requests.get(f"https://fantasy.premierleague.com/api/entry/{team_id}/", timeout=10).json()
        if "detail" in r:
            raise HTTPException(status_code=404, detail=f"Team ID {team_id} not found.")
        return {
            "overall_rank":       r.get("summary_overall_rank"),
            "last_deadline_bank": r.get("last_deadline_bank"),
            "team_name":          r.get("name"),
            "player_name":        f"{r.get('player_first_name', '')} {r.get('player_last_name', '')}".strip(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── News & fixtures ───────────────────────────────────────────────────────────

@router.get("/fpl/news")
def fpl_news(limit: int = 10):
    try:
        r        = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=10).json()
        elements = pd.DataFrame(r["elements"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch FPL news: {e}")

    news_df = elements.loc[
        elements["news"].fillna("").str.len() > 0,
        ["id", "web_name", "news", "news_added", "status"]
    ].copy()
    if news_df.empty:
        return []

    if "news_added" in news_df.columns:
        news_df["news_added"] = pd.to_datetime(news_df["news_added"], errors="coerce")
        news_df = news_df.sort_values("news_added", ascending=False)

    def _cat(row):
        txt = str(row.get("news", "")).lower()
        return "INJURY" if any(k in txt for k in ["injury", "injured", "doubt", "doubtful", "knock"]) else "FPL"

    out = []
    for _, row in news_df.head(limit).iterrows():
        cat      = _cat(row)
        added    = row.get("news_added")
        time_lbl = str(added)[:16] if pd.notna(added) else "recent"
        out.append({
            "id":       int(row["id"]),
            "cat":      cat,
            "hot":      cat == "INJURY",
            "icon":     "🩹" if cat == "INJURY" else "📊",
            "headline": f"{row['web_name']}: {row['news']}",
            "time":     time_lbl,
        })
    return out


@router.get("/fpl/fixtures")
def fpl_fixtures(event: Optional[int] = None):
    BASE_URL = "https://fantasy.premierleague.com/api"
    try:
        boot  = requests.get(f"{BASE_URL}/bootstrap-static/", timeout=10).json()
        teams = pd.DataFrame(boot["teams"])
        evts  = pd.DataFrame(boot["events"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch bootstrap data: {e}")

    gw = event
    if gw is None:
        cur = evts[evts["is_current"] == True]
        gw  = int(cur["id"].iloc[0]) if len(cur) else int(evts[evts["finished"] == True]["id"].max())

    try:
        fixtures = requests.get(f"{BASE_URL}/fixtures/?event={gw}", timeout=10).json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch fixtures: {e}")

    name_map  = teams.set_index("id")["name"].to_dict()
    short_map = teams.set_index("id")["short_name"].to_dict()
    COLOR_MAP = {
        "ARS": "#EF0107", "AVL": "#670E36", "BOU": "#DA291C", "BRE": "#E30613",
        "BHA": "#0057B8", "CHE": "#034694", "CRY": "#1B458F", "EVE": "#003399",
        "FUL": "#000000", "LIV": "#C8102E", "MCI": "#6CABDD", "MUN": "#DA291C",
        "NEW": "#241F20", "NFO": "#DD0000", "SOU": "#D71920", "TOT": "#132257",
        "WHU": "#7A263A", "WOL": "#FDB913",
    }

    items = []
    for fx in fixtures:
        hid  = fx["team_h"]
        aid  = fx["team_a"]
        hs   = short_map.get(hid, "")[:3].upper()
        as_  = short_map.get(aid, "")[:3].upper()
        started  = bool(fx.get("started"))
        finished = bool(fx.get("finished"))
        live     = started and not finished
        upcoming = not started
        min_lbl  = "FT" if finished else ""
        if upcoming and fx.get("kickoff_time"):
            try:
                min_lbl = pd.to_datetime(fx["kickoff_time"]).strftime("%H:%M")
            except Exception:
                min_lbl = ""
        items.append({
            "id": fx["id"], "h": name_map.get(hid, hs), "hs": hs,
            "hc": COLOR_MAP.get(hs, "#111827"), "hg": fx.get("team_h_score"),
            "a":  name_map.get(aid, as_),       "as_": as_,
            "ac": COLOR_MAP.get(as_, "#111827"), "ag": fx.get("team_a_score"),
            "min": min_lbl, "live": live, "upcoming": upcoming,
        })
    return items


@router.get("/pl/table")
def pl_table():
    BASE_URL = "https://fantasy.premierleague.com/api"
    try:
        boot     = requests.get(f"{BASE_URL}/bootstrap-static/", timeout=10).json()
        fixtures = requests.get(f"{BASE_URL}/fixtures/",         timeout=10).json()
        teams_df = pd.DataFrame(boot["teams"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch FPL data: {e}")

    id_to_name = {int(row["id"]): str(row["name"]) for _, row in teams_df.iterrows()}

    table = {
        tid: {"name": id_to_name[tid], "played": 0, "win": 0, "draw": 0, "loss": 0,
              "gf": 0, "ga": 0, "gd": 0, "points": 0}
        for tid in id_to_name
    }

    for fx in fixtures:
        if not fx.get("finished"):
            continue
        h_id = fx.get("team_h")
        a_id = fx.get("team_a")
        hg   = fx.get("team_h_score")
        ag   = fx.get("team_a_score")
        if h_id not in table or a_id not in table or hg is None or ag is None:
            continue
        hg, ag = int(hg), int(ag)
        for tid, gf, ga in [(h_id, hg, ag), (a_id, ag, hg)]:
            t = table[tid]
            t["played"] += 1
            t["gf"]     += gf
            t["ga"]     += ga
            t["gd"]     += gf - ga
            if gf > ga:
                t["win"]    += 1; t["points"] += 3
            elif gf == ga:
                t["draw"]   += 1; t["points"] += 1
            else:
                t["loss"]   += 1

    ranked = sorted(table.values(), key=lambda x: (-x["points"], -x["gd"], -x["gf"]))
    for i, row in enumerate(ranked):
        row["position"] = i + 1
    return ranked


# ── Model insights ────────────────────────────────────────────────────────────

@router.get("/model/insights")
def get_model_insights():
    MODEL_COMPARISON = [
        {"model": "Baseline (mean)",               "mae": 1.563, "improvement": "—"},
        {"model": "Linear Regression",             "mae": 1.053, "improvement": "32.6%"},
        {"model": "Random Forest",                 "mae": 1.052, "improvement": "32.7%"},
        {"model": "LightGBM",                      "mae": 1.040, "improvement": "33.5%"},
        {"model": "LightGBM + Fixture Difficulty", "mae": 1.040, "improvement": "33.5%"},
        {"model": "LightGBM Tuned (Optuna)",       "mae": 1.021, "improvement": "34.7%"},
    ]
    base = {
        "model": "LightGBM (Optuna-tuned)", "mae": 1.021,
        "baseline_mae": 1.563, "improvement_pct": 34.7,
        "training_rows": 19069, "model_comparison": MODEL_COMPARISON,
    }
    if not MODEL_PATH.exists():
        placeholder = {f: max(4000 - i * 300, 200) for i, f in enumerate(FEATURES)}
        return {**base, "feature_importances": placeholder, "_note": "Model file not found — showing placeholder values."}
    model      = get_model()
    importances = dict(sorted(
        zip(FEATURES, [int(v) for v in model.feature_importances_]),
        key=lambda x: x[1], reverse=True
    ))
    return {**base, "feature_importances": importances}


# ── Predictions status ────────────────────────────────────────────────────────

@router.get("/predictions/status")
def predictions_status():
    from services.predictions import _predictions as _preds_cache
    status = {
        "source": None, "updated_at": None, "gameweek": None,
        "next_gameweek": None, "player_count": None,
        "model_file": MODEL_PATH.exists(), "csv_file": PREDS_PATH.exists(),
        "mongo_cache": False, "in_memory_cache_loaded": _preds_cache is not None,
    }
    try:
        from config import MONGO_URI
        from pymongo import MongoClient
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000,
                             tls=True, tlsAllowInvalidCertificates=True, tlsAllowInvalidHostnames=True)
        doc = client["offside_xi"].predictions_cache.find_one({"_id": "latest"})
        if doc and "players" in doc:
            status.update({
                "mongo_cache":   True,
                "updated_at":    doc.get("updated_at"),
                "gameweek":      doc.get("gameweek"),
                "next_gameweek": doc.get("next_gameweek"),
                "player_count":  doc.get("player_count", len(doc["players"])),
            })
    except Exception:
        pass

    status["source"] = (
        "mongodb"             if status["mongo_cache"] else
        "csv_on_disk"         if status["csv_file"]   else
        "live_fpl_api_fallback"
    )
    return status
