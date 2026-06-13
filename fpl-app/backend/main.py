"""
FPL AI Decision Engine — FastAPI entry point.
This file only wires things together. Business logic lives in services/ and routers/.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from services.warmup import run_background_warmup
from routers import auth, squad, fpl, isl

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan (replaces deprecated @app.on_event) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("App starting up...")
    run_background_warmup()
    yield
    logger.info("App shutting down.")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FPL AI Decision Engine",
    version="1.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,     # explicit list — no wildcard + credentials clash
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,  prefix="/api")
app.include_router(squad.router, prefix="/api")
app.include_router(fpl.router,   prefix="/api")
app.include_router(isl.router,   prefix="/api")
