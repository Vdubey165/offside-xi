"""
ILP optimization service — squad building and transfer optimization.
Pure logic; no FastAPI or HTTP imports.
"""
import logging
import pandas as pd

logger = logging.getLogger(__name__)

try:
    import pulp
    PULP_OK = True
except ImportError:
    PULP_OK = False


def _assert_pulp():
    if not PULP_OK:
        raise RuntimeError("pulp not installed. Run: pip install pulp")


def build_optimal_squad(df: pd.DataFrame, budget_raw: int) -> pd.DataFrame:
    """
    Runs ILP to select the best 15-player squad within budget,
    then selects the optimal starting 11.
    Returns a DataFrame with an `is_starter` boolean column.
    """
    _assert_pulp()
    df = df.reset_index(drop=True)
    n  = len(df)

    prob = pulp.LpProblem("FPL_Squad", pulp.LpMaximize)
    x    = [pulp.LpVariable(f"x{i}", cat="Binary") for i in range(n)]

    prob += pulp.lpSum(df["predicted_pts"][i] * x[i] for i in range(n))
    prob += pulp.lpSum(x) == 15
    prob += pulp.lpSum(df["now_cost"][i] * x[i] for i in range(n)) <= budget_raw

    for pos, mn, mx in [("GK", 2, 2), ("DEF", 5, 5), ("MID", 5, 5), ("FWD", 3, 3)]:
        idx = df[df["position"] == pos].index.tolist()
        prob += pulp.lpSum(x[i] for i in idx) >= mn
        prob += pulp.lpSum(x[i] for i in idx) <= mx

    for club in df["team"].unique():
        idx = df[df["team"] == club].index.tolist()
        prob += pulp.lpSum(x[i] for i in idx) <= 3

    cheap_gk = df[(df["now_cost"] <= 40) & (df["position"] == "GK")].index.tolist()
    if cheap_gk:
        prob += pulp.lpSum(x[i] for i in cheap_gk) >= 1

    prob.solve(pulp.PULP_CBC_CMD(msg=0))

    selected = [x[i].value() == 1 for i in range(n)]
    squad    = df[selected].copy().reset_index(drop=True)

    # Pick best starting 11 from the squad
    m     = len(squad)
    prob2 = pulp.LpProblem("FPL_Starting11", pulp.LpMaximize)
    y     = [pulp.LpVariable(f"y{i}", cat="Binary") for i in range(m)]

    prob2 += pulp.lpSum(squad["predicted_pts"][i] * y[i] for i in range(m))
    prob2 += pulp.lpSum(y) == 11

    for pos, mn, mx in [("GK", 1, 1), ("DEF", 3, 5), ("MID", 3, 5), ("FWD", 1, 3)]:
        idx = squad[squad["position"] == pos].index.tolist()
        prob2 += pulp.lpSum(y[i] for i in idx) >= mn
        prob2 += pulp.lpSum(y[i] for i in idx) <= mx

    prob2.solve(pulp.PULP_CBC_CMD(msg=0))
    squad["is_starter"] = [y[i].value() == 1 for i in range(m)]
    logger.info("ILP squad built. Total predicted pts: %.2f", squad[squad["is_starter"]]["predicted_pts"].sum())
    return squad


def optimize_transfers(
    df: pd.DataFrame,
    squad_ids: list[int],
    total_budget_raw: int,
    free_transfers: int,
    hit_cost: int,
    locked_players: list[str],
) -> dict:
    """
    Runs ILP to find the best set of transfers given the current squad.
    Returns a dict with transfers_in, transfers_out, new_squad, and stats.
    """
    _assert_pulp()

    opt_df               = df[(df["status"] == "a") | (df["player_id"].isin(squad_ids))].copy().reset_index(drop=True)
    opt_df["in_current"] = opt_df["player_id"].isin(squad_ids).astype(int)
    n = len(opt_df)

    prob = pulp.LpProblem("FPL_Transfers", pulp.LpMaximize)
    x    = [pulp.LpVariable(f"x{i}", cat="Binary") for i in range(n)]
    t    = [pulp.LpVariable(f"t{i}", cat="Binary") for i in range(n)]
    s    = [pulp.LpVariable(f"s{i}", cat="Binary") for i in range(n)]
    h    = pulp.LpVariable("hits", lowBound=0, cat="Continuous")

    prob += pulp.lpSum(opt_df["predicted_pts"][i] * x[i] for i in range(n)) - hit_cost * h
    prob += pulp.lpSum(x) == 15
    prob += pulp.lpSum(opt_df["now_cost"][i] * x[i] for i in range(n)) <= total_budget_raw

    for pos, mn, mx in [("GK", 2, 2), ("DEF", 5, 5), ("MID", 5, 5), ("FWD", 3, 3)]:
        idx = opt_df[opt_df["position"] == pos].index.tolist()
        prob += pulp.lpSum(x[i] for i in idx) >= mn
        prob += pulp.lpSum(x[i] for i in idx) <= mx

    for club in opt_df["team"].unique():
        idx = opt_df[opt_df["team"] == club].index.tolist()
        prob += pulp.lpSum(x[i] for i in idx) <= 3

    cheap_gk = opt_df[(opt_df["now_cost"] <= 40) & (opt_df["position"] == "GK")].index.tolist()
    if cheap_gk:
        prob += pulp.lpSum(x[i] for i in cheap_gk) >= 1

    if locked_players:
        locked_idx = opt_df[opt_df["web_name"].isin(locked_players)].index.tolist()
        for i in locked_idx:
            prob += x[i] == 1
            prob += s[i] == 0
            prob += t[i] == 0

    for i in range(n):
        ic = opt_df["in_current"][i]
        prob += t[i] >= x[i] - ic
        prob += t[i] <= x[i]
        prob += t[i] <= 1 - ic
        prob += s[i] >= ic - x[i]
        prob += s[i] <= ic
        prob += s[i] <= 1 - x[i]

    prob += pulp.lpSum(t) == pulp.lpSum(s)
    prob += h >= pulp.lpSum(t) - free_transfers
    prob.solve(pulp.PULP_CBC_CMD(msg=0))

    new_squad     = opt_df[[x[i].value() == 1 for i in range(n)]].copy()
    transfers_in  = new_squad[new_squad["in_current"] == 0]
    out_ids       = [pid for pid in squad_ids if pid not in new_squad["player_id"].values]
    transfers_out = df[df["player_id"].isin(out_ids)]
    n_in          = len(transfers_in)
    hits_taken    = max(0, n_in - free_transfers)
    pts_gain      = float(transfers_in["predicted_pts"].sum() - transfers_out["predicted_pts"].sum())

    logger.info("Transfer ILP complete: %d transfers, %d hits.", n_in, hits_taken)
    return {
        "new_squad":      new_squad,
        "transfers_in":   transfers_in,
        "transfers_out":  transfers_out,
        "n_in":           n_in,
        "hits_taken":     hits_taken,
        "pts_gain":       pts_gain,
    }
