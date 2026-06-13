"""
Central config — all env vars, paths, and constants in one place.
Import from here everywhere; never call os.environ directly in routers.
"""
import os
from pathlib import Path


# ── Path resolution ────────────────────────────────────────────────────────────
def _find_root() -> Path:
    env_root = os.environ.get("FPL_ROOT")
    if env_root:
        return Path(env_root)
    return Path(__file__).resolve().parent.parent.parent


ROOT_DIR   = _find_root()
DATA_DIR   = Path(os.environ.get("FPL_DATA_DIR",   str(ROOT_DIR / "Data" / "data")))
MODELS_DIR = Path(os.environ.get("FPL_MODELS_DIR", str(ROOT_DIR / "Data" / "models")))

MODEL_PATH = MODELS_DIR / "fpl_model.pkl"
PREDS_PATH = DATA_DIR   / "player_predictions.csv"

# ── Database ───────────────────────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")

# ── Auth ───────────────────────────────────────────────────────────────────────
# IMPORTANT: These MUST be set as environment variables in production.
# The app will raise at startup if they are missing (no insecure fallbacks).
def _require_env(key: str, dev_default: str | None = None) -> str:
    val = os.environ.get(key, dev_default)
    if not val:
        raise RuntimeError(
            f"Required environment variable '{key}' is not set. "
            "Set it in your deployment environment or .env file."
        )
    return val


JWT_SECRET     = _require_env("JWT_SECRET",     "dev_jwt_secret_change_in_prod")
JWT_ALG        = "HS256"
JWT_EXPIRE     = 30  # days
RETRAIN_SECRET = _require_env("RETRAIN_SECRET", "dev_retrain_secret_change_in_prod")

# ── ML features ───────────────────────────────────────────────────────────────
FEATURES = [
    "avg_pts_last3", "avg_pts_last5", "form_trend",
    "avg_minutes_last3", "avg_xgi_last3", "avg_ict_last3",
    "avg_bps_last3", "is_home", "value", "avg_fixture_difficulty",
]

# ── Caching ───────────────────────────────────────────────────────────────────
GW_CACHE_TTL_SECONDS = 1800   # 30 minutes
ISL_CACHE_TTL        = 3600   # 1 hour
ISL_LEAGUE_ID        = 323
ISL_SEASON           = 2024

# ── CORS origins ──────────────────────────────────────────────────────────────
# Remove "*" — it conflicts with allow_credentials=True.
# Add your production frontend URL here.
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://offside-xi.vercel.app",
    "https://offside-xi-git-main-vaibhavs-projects.vercel.app",
]
