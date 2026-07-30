"""
Squad & transfer routes — /api/squad/*, /api/transfers/*
Also contains the retrain endpoint since it rebuilds squad data.
"""
import logging
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
import requests

from fastapi import APIRouter, Depends, HTTPException

from config import FEATURES, MODEL_PATH, PREDS_PATH, RETRAIN_SECRET
from db import get_db
from dependencies import get_current_user
from models.schemas import OptimizeRequest, TransferRequest
from services.ilp import build_optimal_squad, optimize_transfers
from services.predictions import get_predictions, get_model, invalidate_predictions_cache
from services.gw_cache import invalidate_gw_cache

logger = logging.getLogger(__name__)
router = APIRouter()

_SQUAD_COLS = ["player_id", "web_name", "team_name", "position", "price", "predicted_pts", "is_starter"]
_TRANSFER_COLS = ["player_id", "web_name", "team_name", "position", "price", "predicted_pts"]


# ── Internal helper (also called by warmup) ───────────────────────────────────

def _build_snapshot(gw: int, db) -> dict:
    df         = get_predictions().copy()
    df         = df[df["status"] == "a"].reset_index(drop=True)
    budget_raw = int(100 * 10)

    if len(df) < 15:
        raise ValueError("Not enough available players to build a squad.")

    squad    = build_optimal_squad(df, budget_raw)
    starters = squad[squad["is_starter"] == True]
    bench    = squad[squad["is_starter"] == False]

    starters_sorted   = starters.sort_values("predicted_pts", ascending=False)
    captain_name      = starters_sorted.iloc[0]["web_name"]
    vice_captain_name = starters_sorted.iloc[1]["web_name"]

    def _clean(obj):
        if isinstance(obj, list):  return [_clean(i) for i in obj]
        if isinstance(obj, dict):  return {k: _clean(v) for k, v in obj.items()}
        if hasattr(obj, "item"):   return obj.item()
        return obj

    snapshot = _clean({
        "gw":               gw,
        "snapshotted_at":   datetime.utcnow().isoformat(),
        "total_cost":       round(squad["now_cost"].sum() / 10, 1),
        "predicted_points": round(float(starters["predicted_pts"].sum()), 2),
        "captain":          captain_name,
        "vice_captain":     vice_captain_name,
        "starters":         starters[_SQUAD_COLS].fillna(0).to_dict(orient="records"),
        "bench":            bench[_SQUAD_COLS].fillna(0).to_dict(orient="records"),
    })
    db.squad_snapshots.insert_one({"_id": f"gw_{gw}", **snapshot})
    return snapshot


# ── Squad endpoints ───────────────────────────────────────────────────────────

@router.post("/squad/optimize")
def optimize_squad(req: OptimizeRequest):
    df         = get_predictions().copy()
    df         = df[df["status"] == "a"].reset_index(drop=True)
    budget_raw = int(req.budget * 10)

    if len(df) < 15:
        raise HTTPException(status_code=400, detail=f"Not enough available players ({len(df)}) to build a squad.")

    try:
        squad    = build_optimal_squad(df, budget_raw)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    starters = squad[squad["is_starter"] == True]
    bench    = squad[squad["is_starter"] == False]

    starters_sorted   = starters.sort_values("predicted_pts", ascending=False)
    captain_name      = starters_sorted.iloc[0]["web_name"]
    vice_captain_name = starters_sorted.iloc[1]["web_name"]

    return {
        "total_cost":       round(squad["now_cost"].sum() / 10, 1),
        "predicted_points": round(float(starters["predicted_pts"].sum()), 2),
        "budget_remaining": round(req.budget - squad["now_cost"].sum() / 10, 1),
        "captain":          captain_name,
        "vice_captain":     vice_captain_name,
        "starters":         starters[_SQUAD_COLS].to_dict(orient="records"),
        "bench":            bench[_SQUAD_COLS].to_dict(orient="records"),
    }


@router.post("/squad/snapshot/{gw}")
def snapshot_squad(gw: int):
    db = get_db()
    existing = db.squad_snapshots.find_one({"gw": gw})
    if existing:
        existing.pop("_id", None)
        return existing
    try:
        return _build_snapshot(gw, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/squad/snapshot/{gw}")
def get_squad_snapshot(gw: int):
    db  = get_db()
    doc = db.squad_snapshots.find_one({"gw": gw})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No snapshot found for GW{gw}")
    doc.pop("_id", None)
    return doc


# ── Transfer endpoints ────────────────────────────────────────────────────────

@router.get("/transfers/squad/{team_id}")
def fetch_fpl_squad(team_id: int):
    BASE = "https://fantasy.premierleague.com/api"
    try:
        boot      = requests.get(f"{BASE}/bootstrap-static/", timeout=10).json()
        events_df = pd.DataFrame(boot["events"])
        cur_rows  = events_df[events_df["is_current"] == True]
        if len(cur_rows):
            current_gw_val = int(cur_rows["id"].iloc[0])
        else:
            finished       = events_df[events_df["finished"] == True]
            current_gw_val = int(finished["id"].max()) if len(finished) else 1

        entry_r = requests.get(f"{BASE}/entry/{team_id}/", timeout=10).json()
        if "detail" in entry_r:
            raise HTTPException(status_code=404, detail=f"Team ID {team_id} not found.")

        entry_gw = entry_r.get("current_event") or current_gw_val
        picks_gw = min(current_gw_val, entry_gw)
        itb      = (entry_r.get("last_deadline_bank") or 0) / 10
        free_tf  = entry_r.get("last_deadline_free_transfers") or 1

        picks_r = None
        used_gw = picks_gw
        for gw_try in [picks_gw, picks_gw - 1, picks_gw + 1]:
            if gw_try < 1:
                continue
            resp = requests.get(f"{BASE}/entry/{team_id}/event/{gw_try}/picks/", timeout=10).json()
            if "picks" in resp:
                picks_r = resp
                used_gw = gw_try
                break

        if picks_r is None:
            raise HTTPException(status_code=404, detail="Could not retrieve picks. Make sure you have submitted your team.")

        player_ids = [p["element"] for p in picks_r["picks"]]
        df         = get_predictions()
        squad_df   = df[df["player_id"].isin(player_ids)][
            ["player_id", "web_name", "team_name", "position", "price", "predicted_pts", "status"]
        ].copy()
        return {
            "gameweek":       used_gw,
            "itb":            round(float(itb), 1),
            "free_transfers": int(free_tf),
            "players":        squad_df.to_dict(orient="records"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transfers/optimize")
def optimize_transfers_endpoint(req: TransferRequest):
    squad_data = fetch_fpl_squad(req.team_id)
    squad_ids  = [p["player_id"] for p in squad_data["players"]]

    df               = get_predictions().copy()
    current_squad_df = df[df["player_id"].isin(squad_ids)]
    if len(current_squad_df) < 11:
        raise HTTPException(status_code=400, detail=f"Only matched {len(current_squad_df)} players. Regenerate predictions.")

    squad_value      = current_squad_df["now_cost"].sum() / 10
    total_budget_raw = int((squad_value + squad_data["itb"]) * 10)

    try:
        result = optimize_transfers(
            df=df,
            squad_ids=squad_ids,
            total_budget_raw=total_budget_raw,
            free_transfers=req.free_transfers,
            hit_cost=req.hit_cost,
            locked_players=req.locked_players,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    new_squad     = result["new_squad"]
    transfers_in  = result["transfers_in"]
    transfers_out = result["transfers_out"]
    hits_taken    = result["hits_taken"]
    pts_gain      = result["pts_gain"]

    new_sorted        = new_squad.sort_values("predicted_pts", ascending=False)
    captain_name      = new_sorted.iloc[0]["web_name"]
    vice_captain_name = new_sorted.iloc[1]["web_name"]

    return {
        "transfers_made":  result["n_in"],
        "hits_taken":      hits_taken,
        "points_hit":      hits_taken * req.hit_cost,
        "net_pts_gain":    round(pts_gain - hits_taken * req.hit_cost, 2),
        "captain":         captain_name,
        "vice_captain":    vice_captain_name,
        "transfers_in":    transfers_in[_TRANSFER_COLS].to_dict(orient="records"),
        "transfers_out":   transfers_out[_TRANSFER_COLS].to_dict(orient="records"),
        "new_squad":       new_squad[_TRANSFER_COLS + ["in_current"]].to_dict(orient="records"),
        "gameweek":        squad_data["gameweek"],
        "itb":             round(float(squad_data["itb"]), 1),
    }


# ── Retrain ───────────────────────────────────────────────────────────────────

@router.post("/retrain")
def retrain_predictions(secret: str = ""):
    if secret != RETRAIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing secret.")

    if not MODEL_PATH.exists():
        raise HTTPException(status_code=500, detail="fpl_model.pkl not found — run the notebook first.")

    try:
        from config import MONGO_URI
        from pymongo import MongoClient

        model    = get_model()
        FPL_BASE = "https://fantasy.premierleague.com/api"

        boot     = requests.get(f"{FPL_BASE}/bootstrap-static/", timeout=15).json()
        elements = pd.DataFrame(boot["elements"])
        teams    = pd.DataFrame(boot["teams"])
        events   = pd.DataFrame(boot["events"])

        team_map = teams.set_index("id")["name"].to_dict()
        pos_map  = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

        cur_rows = events[events["is_current"] == True]
        if len(cur_rows):
            current_gw_val = int(cur_rows["id"].iloc[0])
        else:
            finished = events[events["finished"] == True]
            if len(finished):
                current_gw_val = int(finished["id"].max())
            elif len(events):
                # Preseason: no GW finished or current yet (e.g. before season kickoff
                # in August). Fall back to GW1 instead of crashing on int(NaN).
                current_gw_val = int(events["id"].min())
            else:
                raise HTTPException(
                    status_code=503,
                    detail="FPL API returned no events — season data not published yet.",
                )

        all_rows = []
        gw_start = max(1, current_gw_val - 4)
        for gw in range(gw_start, current_gw_val + 1):
            try:
                live = requests.get(f"{FPL_BASE}/event/{gw}/live/", timeout=12).json()
                for el in live.get("elements", []):
                    s = el["stats"]
                    all_rows.append({
                        "player_id":                  el["id"],
                        "gw":                         gw,
                        "total_points":               s.get("total_points", 0),
                        "minutes":                    s.get("minutes", 0),
                        "bps":                        s.get("bps", 0),
                        "ict_index":                  float(s.get("ict_index", 0) or 0),
                        "expected_goal_involvements": float(s.get("expected_goal_involvements", 0) or 0),
                    })
            except Exception:
                continue

        if not all_rows:
            raise HTTPException(status_code=500, detail="Could not fetch any GW live data from FPL API.")

        hist = pd.DataFrame(all_rows)
        records = []
        for pid, grp in hist.groupby("player_id"):
            grp  = grp.sort_values("gw")
            pts  = grp["total_points"].values
            mins = grp["minutes"].values
            xgi  = grp["expected_goal_involvements"].values
            ict  = grp["ict_index"].values
            bps  = grp["bps"].values

            avg3  = float(np.mean(pts[-3:])) if len(pts) >= 3 else float(np.mean(pts))
            avg5  = float(np.mean(pts[-5:])) if len(pts) >= 5 else float(np.mean(pts))
            records.append({
                "player_id":         pid,
                "avg_pts_last3":     round(avg3, 4),
                "avg_pts_last5":     round(float(np.mean(pts[-5:])) if len(pts) >= 5 else avg3, 4),
                "form_trend":        round(avg3 - avg5, 4),
                "avg_minutes_last3": round(float(np.mean(mins[-3:])) if len(mins) >= 3 else float(np.mean(mins)), 2),
                "avg_xgi_last3":     round(float(np.mean(xgi[-3:])) if len(xgi) >= 3 else float(np.mean(xgi)), 4),
                "avg_ict_last3":     round(float(np.mean(ict[-3:])) if len(ict) >= 3 else float(np.mean(ict)), 4),
                "avg_bps_last3":     round(float(np.mean(bps[-3:])) if len(bps) >= 3 else float(np.mean(bps)), 2),
            })

        feat_df = pd.DataFrame(records)
        el_df   = elements[["id", "web_name", "element_type", "now_cost", "team", "status"]].copy()
        el_df.rename(columns={"id": "player_id"}, inplace=True)
        el_df["position"] = el_df["element_type"].map(pos_map)
        el_df["team_name"] = el_df["team"].map(team_map)
        el_df["price"]     = el_df["now_cost"] / 10
        el_df["value"]     = el_df["now_cost"]

        df = el_df.merge(feat_df, on="player_id", how="left")

        try:
            next_gw    = current_gw_val + 1
            fx_r       = requests.get(f"{FPL_BASE}/fixtures/?event={next_gw}", timeout=10).json()
            team_diff  = {fx["team_h"]: fx["team_h_difficulty"] for fx in fx_r}
            team_diff.update({fx["team_a"]: fx["team_a_difficulty"] for fx in fx_r})
            team_home  = {fx["team_h"]: 1 for fx in fx_r}
            team_home.update({fx["team_a"]: 0 for fx in fx_r})
            df["avg_fixture_difficulty"] = df["team"].map(team_diff).fillna(3.0)
            df["is_home"]                = df["team"].map(team_home).fillna(0).astype(int)
        except Exception:
            df["avg_fixture_difficulty"] = 3.0
            df["is_home"]                = 0

        for col in FEATURES:
            df[col] = pd.to_numeric(df.get(col, 0), errors="coerce").fillna(0)

        X                   = df[FEATURES].fillna(0)
        df["predicted_pts"] = model.predict(X).round(2)

        mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000,
                            tls=True, tlsAllowInvalidCertificates=True, tlsAllowInvalidHostnames=True)
        mdb   = mongo["offside_xi"]

        save_cols = [
            "player_id", "web_name", "team", "team_name", "element_type",
            "position", "now_cost", "price", "status",
            "predicted_pts", "avg_pts_last3", "avg_pts_last5", "form_trend",
            "avg_minutes_last3", "avg_xgi_last3", "avg_ict_last3", "avg_bps_last3",
            "is_home", "avg_fixture_difficulty", "value",
        ]
        save_cols   = [c for c in save_cols if c in df.columns]
        records_out = df[save_cols].fillna(0).to_dict(orient="records")
        for rec in records_out:
            for k, v in rec.items():
                if hasattr(v, "item"):
                    rec[k] = v.item()

        mdb.predictions_cache.replace_one(
            {"_id": "latest"},
            {
                "_id":           "latest",
                "players":       records_out,
                "gameweek":      current_gw_val,
                "next_gameweek": current_gw_val + 1,
                "updated_at":    datetime.utcnow().isoformat(),
                "player_count":  len(records_out),
            },
            upsert=True,
        )

        try:
            PREDS_PATH.parent.mkdir(parents=True, exist_ok=True)
            df[save_cols].to_csv(PREDS_PATH, index=False)
        except Exception:
            pass

        invalidate_predictions_cache()
        db = get_db()
        invalidate_gw_cache(db)

        logger.info("Retrain complete: %d players updated for GW%d.", len(records_out), current_gw_val)
        return {
            "ok":              True,
            "players_updated": len(records_out),
            "gameweek":        current_gw_val,
            "next_gameweek":   current_gw_val + 1,
            "gw_data_fetched": list(range(gw_start, current_gw_val + 1)),
            "message":         f"Predictions refreshed for GW{current_gw_val + 1} — {len(records_out)} players updated.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Retrain failed")
        raise HTTPException(status_code=500, detail=f"Retrain failed: {e}")