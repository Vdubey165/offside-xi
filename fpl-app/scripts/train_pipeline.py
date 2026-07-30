
"""
Headless version of FPL_Pipeline_Fixed.ipynb — meant to be run from CI (GitHub
Actions), not by hand. Pulls fresh data straight from the live FPL API, so it
naturally follows whatever season is currently live; no season string to update.

Multi-season accumulation: each run archives its feature-engineered training
rows as data-dir/training_rows_<season>.csv (e.g. training_rows_2025-26.csv).
On every run, ALL archived seasons are pooled together for training — so the
model doesn't reset to zero at the start of a new season, it builds on top of
every season this pipeline has ever run in. Older seasons are down-weighted
(see SEASON_RECENCY_WEIGHT_DECAY) so a new season's meta still dominates.

Usage:
    python train_pipeline.py --data-dir ../Data/data --models-dir ../Data/models

Exit codes:
    0  = trained and saved a new model
    0  = skipped (not enough data yet) — this is NOT a failure, it's expected
         behaviour in the first few GWs of a new season or in preseason
    1  = a real error (API unreachable, etc.)
"""
import argparse
import glob
import sys
import time
from datetime import datetime
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import optuna
import pandas as pd
import requests
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

FPL_BASE = "https://fantasy.premierleague.com/api"

FEATURES = [
    "avg_pts_last3", "avg_pts_last5", "form_trend",
    "avg_minutes_last3", "avg_xgi_last3", "avg_ict_last3",
    "avg_bps_last3", "is_home", "value", "avg_fixture_difficulty",
]

# Below this many *pooled* usable training rows (this season + all archived
# past seasons), skip retraining — the model would be fit on noise. With
# archived seasons in play this basically only fires the very first time the
# pipeline is ever run, before any archive exists.
MIN_TRAINING_ROWS = 2000

# Each season further back than the current one gets multiplied by this factor
# when training (recency weighting) — last season matters, five seasons ago
# barely does, since squads/tactics/promoted-relegated teams all shift.
SEASON_RECENCY_WEIGHT_DECAY = 0.75
MIN_SEASON_WEIGHT = 0.15


def season_label_from_events(events: list) -> str:
    """e.g. '2026-27' — derived from GW1's deadline_time, so no manual updates."""
    gw1 = next((e for e in events if e.get("id") == 1 and e.get("deadline_time")), None)
    if not gw1:
        return f"unknown-{datetime.utcnow().year}"
    year = int(gw1["deadline_time"][:4])
    return f"{year}-{str(year + 1)[-2:]}"


def fetch_players_and_teams():
    r = requests.get(f"{FPL_BASE}/bootstrap-static/", timeout=15).json()
    return pd.DataFrame(r["elements"]), pd.DataFrame(r["teams"]), r["events"]


def fetch_full_history(players: pd.DataFrame) -> pd.DataFrame:
    """Per-player GW-by-GW history for the whole (current) season so far."""
    all_history, failed = [], []
    for i, pid in enumerate(players["id"].tolist()):
        try:
            r = requests.get(f"{FPL_BASE}/element-summary/{pid}/", timeout=10).json()
            hist = pd.DataFrame(r.get("history", []))
            if len(hist) > 0:
                hist["player_id"] = pid
                all_history.append(hist)
        except Exception:
            failed.append(pid)
        time.sleep(0.15)
        if i % 100 == 0:
            print(f"  {i}/{len(players)} players | collected {len(all_history)} | failed {len(failed)}", flush=True)

    if not all_history:
        return pd.DataFrame()
    return pd.concat(all_history, ignore_index=True)


def build_features(df: pd.DataFrame, players: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["player_id", "round"]).reset_index(drop=True)

    for col, new_col, w in [
        ("total_points", "avg_pts_last3", 3),
        ("total_points", "avg_pts_last5", 5),
        ("minutes", "avg_minutes_last3", 3),
        ("expected_goal_involvements", "avg_xgi_last3", 3),
        ("ict_index", "avg_ict_last3", 3),
        ("bps", "avg_bps_last3", 3),
    ]:
        df[new_col] = df.groupby("player_id")[col].transform(
            lambda x, w=w: x.shift(1).rolling(w, min_periods=1).mean()
        )

    df["is_home"] = df["was_home"].astype(int)
    df["form_trend"] = df["avg_pts_last3"] - df["avg_pts_last5"]

    fixtures = pd.DataFrame(requests.get(f"{FPL_BASE}/fixtures/", timeout=15).json())
    finished_events = fixtures[fixtures["finished"] == True]["event"]
    current_gw = int(finished_events.max()) if len(finished_events) else 0

    upcoming = fixtures[(fixtures["finished"] == False) & (fixtures["event"] <= current_gw + 3)].copy()
    team_difficulty = []
    for _, row in upcoming.iterrows():
        team_difficulty.append({"team": row["team_h"], "difficulty": row["team_h_difficulty"]})
        team_difficulty.append({"team": row["team_a"], "difficulty": row["team_a_difficulty"]})

    if team_difficulty:
        diff_df = pd.DataFrame(team_difficulty)
        avg_difficulty = diff_df.groupby("team")["difficulty"].mean().reset_index()
        avg_difficulty.columns = ["team", "avg_fixture_difficulty"]
    else:
        avg_difficulty = pd.DataFrame(columns=["team", "avg_fixture_difficulty"])

    player_team_map = players.set_index("id")["team"].to_dict()
    df["team"] = df["player_id"].map(player_team_map)
    df_model = df.merge(avg_difficulty, on="team", how="left")
    df_model["avg_fixture_difficulty"] = df_model["avg_fixture_difficulty"].fillna(3.0)

    player_value_map = players.set_index("id")["now_cost"].to_dict()
    if "value" not in df_model.columns:
        df_model["value"] = df_model["player_id"].map(player_value_map)

    return df_model


def load_pooled_training_data(data_dir: Path, current_season: str, current_df_model: pd.DataFrame):
    """
    Combine this season's freshly-built rows with every archived past season
    (training_rows_<season>.csv in data_dir). Returns (X, y, sample_weight),
    where sample_weight down-weights older seasons via SEASON_RECENCY_WEIGHT_DECAY.
    """
    seasons: dict[str, pd.DataFrame] = {
        current_season: current_df_model[FEATURES + ["total_points"]].dropna()
    }

    for path in sorted(glob.glob(str(data_dir / "training_rows_*.csv"))):
        label = Path(path).stem.replace("training_rows_", "")
        if label == current_season:
            continue  # this run's own data — already have it fresh above
        try:
            seasons[label] = pd.read_csv(path)[FEATURES + ["total_points"]].dropna()
        except Exception as e:
            print(f"  Skipping unreadable archive {path}: {e}", flush=True)

    # Sort seasons newest -> oldest by label (works for 'YYYY-YY' strings)
    ordered = sorted(seasons.items(), key=lambda kv: kv[0], reverse=True)

    frames, weights = [], []
    for i, (label, sdf) in enumerate(ordered):
        if sdf.empty:
            continue
        w = max(MIN_SEASON_WEIGHT, SEASON_RECENCY_WEIGHT_DECAY ** i)
        frames.append(sdf)
        weights.append(np.full(len(sdf), w))
        print(f"  Season {label}: {len(sdf)} rows, weight={w:.2f}", flush=True)

    pooled = pd.concat(frames, ignore_index=True)
    sample_weight = np.concatenate(weights)
    return pooled[FEATURES], pooled["total_points"], sample_weight


def train_model(X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray, n_trials: int):
    (X_train, X_test, y_train, y_test,
     w_train, w_test) = train_test_split(X, y, sample_weight, test_size=0.2, random_state=42)

    optuna.logging.set_verbosity(optuna.logging.WARNING)

    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 300, 1000),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.1),
            "num_leaves": trial.suggest_int("num_leaves", 31, 150),
            "min_child_samples": trial.suggest_int("min_child_samples", 10, 50),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "random_state": 42,
            "verbose": -1,
        }
        m = lgb.LGBMRegressor(**params)
        m.fit(X_train, y_train, sample_weight=w_train)
        return mean_absolute_error(y_test, m.predict(X_test))

    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=n_trials)

    baseline_mae = mean_absolute_error(y_test, [y_train.mean()] * len(y_test))
    lr_mae = mean_absolute_error(y_test, LinearRegression().fit(X_train, y_train).predict(X_test))
    rf = RandomForestRegressor(n_estimators=100, random_state=42).fit(X_train, y_train)
    rf_mae = mean_absolute_error(y_test, rf.predict(X_test))

    best_params = {**study.best_params, "random_state": 42, "verbose": -1}
    lgbm = lgb.LGBMRegressor(**best_params)
    lgbm.fit(X_train, y_train, sample_weight=w_train)
    lgbm_mae = mean_absolute_error(y_test, lgbm.predict(X_test))

    print("Model comparison (on pooled multi-season data):", flush=True)
    print(f"  baseline={baseline_mae:.3f}  linreg={lr_mae:.3f}  rf={rf_mae:.3f}  lgbm(tuned)={lgbm_mae:.3f}", flush=True)

    return lgbm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", type=Path, required=True)
    ap.add_argument("--models-dir", type=Path, required=True)
    ap.add_argument("--trials", type=int, default=50, help="Optuna trials (fewer = faster CI runs)")
    ap.add_argument("--min-rows", type=int, default=MIN_TRAINING_ROWS)
    ap.add_argument("--force", action="store_true", help="Skip the min-rows guard")
    args = ap.parse_args()

    args.data_dir.mkdir(parents=True, exist_ok=True)
    args.models_dir.mkdir(parents=True, exist_ok=True)

    print("Fetching players/teams/events...", flush=True)
    players, teams, events = fetch_players_and_teams()
    season = season_label_from_events(events)
    print(f"Detected season: {season}", flush=True)

    print(f"Fetching full GW history for {len(players)} players (this takes a few minutes)...", flush=True)
    history = fetch_full_history(players)

    if history.empty:
        print("No history rows returned — season hasn't started yet. Skipping retrain.", flush=True)
        sys.exit(0)

    # Save this season's raw history (overwritten each run — GW-by-GW rows
    # accumulate as the season progresses, this is not the multi-season archive).
    history.to_csv(args.data_dir / "fpl_gameweek_history.csv", index=False)

    df_model = build_features(history, players)

    # Archive this season's feature-engineered rows — this file, and this file
    # alone, is what makes seasons pool across years. It's what's referenced
    # by name (e.g. training_rows_2026-27.csv) in load_pooled_training_data().
    archive_path = args.data_dir / f"training_rows_{season}.csv"
    df_model[FEATURES + ["total_points", "player_id", "round"]].to_csv(archive_path, index=False)
    print(f"Archived {season} training rows to {archive_path}", flush=True)

    print("Pooling with archived past seasons...", flush=True)
    X, y, sample_weight = load_pooled_training_data(args.data_dir, season, df_model)
    print(f"Pooled training rows: {len(X)} (across all seasons)", flush=True)

    if len(X) < args.min_rows and not args.force:
        print(
            f"Only {len(X)} pooled rows (< {args.min_rows}) — not enough data yet "
            f"even with archives. Skipping. Use --force to override.",
            flush=True,
        )
        sys.exit(0)

    model = train_model(X, y, sample_weight, n_trials=args.trials)
    joblib.dump(model, args.models_dir / "fpl_model.pkl")
    print(f"Saved model to {args.models_dir / 'fpl_model.pkl'}", flush=True)

    latest_gw = df_model.groupby("player_id").last().reset_index()
    latest_gw = latest_gw[FEATURES + ["player_id"]].dropna()
    latest_gw["predicted_pts"] = model.predict(latest_gw[FEATURES]).round(2)

    players_info = players[["id", "web_name", "element_type", "now_cost", "team", "status"]].copy()
    latest_gw = latest_gw.merge(players_info, left_on="player_id", right_on="id")
    latest_gw.to_csv(args.data_dir / "player_predictions.csv", index=False)
    print(f"Saved predictions to {args.data_dir / 'player_predictions.csv'}", flush=True)


if __name__ == "__main__":
    main()