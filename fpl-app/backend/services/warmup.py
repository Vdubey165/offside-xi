"""
Background warmup service — pre-loads predictions and builds ILP snapshot
on Render startup so the first real user never waits.
"""
import logging
import threading

logger = logging.getLogger(__name__)

warmup_done = False


def run_background_warmup():
    """
    Spawns a daemon thread that:
    1. Pre-loads predictions into memory
    2. Caches current GW
    3. Builds/verifies the ILP squad snapshot for this GW
    """
    t = threading.Thread(target=_warmup_task, daemon=True)
    t.start()
    logger.info("Background warmup thread launched.")


def _warmup_task():
    global warmup_done
    try:
        logger.info("[WARMUP] Starting...")

        from services.predictions import get_predictions
        from services.gw_cache import get_current_gw_cached
        from db import get_db

        get_predictions()
        logger.info("[WARMUP] Predictions loaded.")

        db      = get_db()
        gw_data = get_current_gw_cached(db)
        gw      = gw_data["gameweek"]
        logger.info("[WARMUP] Current GW: %d", gw)

        existing = db.squad_snapshots.find_one({"gw": gw})
        if existing:
            logger.info("[WARMUP] Snapshot for GW%d already exists — skipping ILP.", gw)
        else:
            logger.info("[WARMUP] Running ILP for GW%d...", gw)
            from routers.squad import _build_snapshot
            _build_snapshot(gw, db)
            logger.info("[WARMUP] Snapshot for GW%d saved.", gw)

        warmup_done = True
        logger.info("[WARMUP] Complete.")

    except Exception as e:
        warmup_done = True
        logger.warning("[WARMUP] Failed (non-fatal): %s", e)
