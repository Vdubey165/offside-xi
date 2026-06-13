"""
Auth & user routes — /api/auth/* and /api/user/*
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext
from pymongo.errors import DuplicateKeyError

from config import JWT_SECRET, JWT_ALG, JWT_EXPIRE
from db import get_db
from dependencies import get_current_user
from models.schemas import (
    RegisterRequest, LoginRequest, AuthResponse, UserResponse,
    ProfileUpdateRequest, ChallengeResultRequest, CommunityJoinRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw[:72])

def verify_password(pw: str, hashed: str) -> bool:
    return pwd_ctx.verify(pw, hashed)

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub":   user_id,
        "email": email,
        "exp":   datetime.utcnow() + timedelta(days=JWT_EXPIRE),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    db = get_db()
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    try:
        result = db.users.insert_one({
            "email":       req.email.lower().strip(),
            "password":    hash_password(req.password),
            "name":        req.name or req.email.split("@")[0],
            "fpl_team_id": None,
            "created_at":  datetime.utcnow(),
        })
        user_id = str(result.inserted_id)
        token   = create_token(user_id, req.email)
        logger.info("New user registered: %s", req.email)
        return AuthResponse(
            token=token,
            user=UserResponse(id=user_id, email=req.email, name=req.name or req.email.split("@")[0]),
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered")


@router.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    db   = get_db()
    user = db.users.find_one({"email": req.email.lower().strip()})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    token   = create_token(user_id, user["email"])
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            name=user.get("name", ""),
            fpl_team_id=user.get("fpl_team_id"),
        ),
    )


# ── User profile ──────────────────────────────────────────────────────────────

@router.get("/user/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    db   = get_db()
    user = db.users.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    history = list(
        db.challenge_history.find({"user_id": current_user["sub"]}, {"_id": 0}).sort("gw", 1)
    )
    return {
        "id":          current_user["sub"],
        "email":       user["email"],
        "name":        user.get("name", ""),
        "fpl_team_id": user.get("fpl_team_id"),
        "history":     history,
    }


@router.put("/user/profile")
def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    db      = get_db()
    updates = {}
    if req.fpl_team_id is not None:
        updates["fpl_team_id"] = req.fpl_team_id
    if req.name is not None:
        updates["name"] = req.name
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    db.users.update_one({"_id": ObjectId(current_user["sub"])}, {"$set": updates})
    return {"ok": True}


# ── Challenge history ─────────────────────────────────────────────────────────

@router.post("/user/challenge")
def save_challenge_result(req: ChallengeResultRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    db.challenge_history.update_one(
        {"user_id": current_user["sub"], "gw": req.gw},
        {"$set": {
            "user_id":    current_user["sub"],
            "gw":         req.gw,
            "model_pts":  req.model_pts,
            "user_pts":   req.user_pts,
            "user_swaps": req.user_swaps,
            "saved_at":   datetime.utcnow(),
        }},
        upsert=True,
    )
    return {"ok": True}


@router.post("/user/challenge-state")
def save_challenge_state(req: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    db.challenge_state.update_one(
        {"user_id": current_user["sub"]},
        {"$set": {
            "user_id":   current_user["sub"],
            "gw":        req.get("gw"),
            "team":      req.get("team"),
            "remaining": req.get("remaining"),
            "saved_at":  datetime.utcnow(),
        }},
        upsert=True,
    )
    return {"ok": True}


@router.get("/user/challenge-state")
def load_challenge_state(current_user: dict = Depends(get_current_user)):
    db  = get_db()
    doc = db.challenge_state.find_one({"user_id": current_user["sub"]})
    if not doc:
        return {"found": False}
    return {
        "found":     True,
        "gw":        doc.get("gw"),
        "team":      doc.get("team"),
        "remaining": doc.get("remaining"),
    }


# ── Community ─────────────────────────────────────────────────────────────────

@router.post("/community/join")
def community_join(req: CommunityJoinRequest):
    db       = get_db()
    existing = db.community.find_one({"email": req.email.lower().strip()})
    if existing:
        return {"ok": True, "message": "Already registered"}
    db.community.insert_one({
        "email":     req.email.lower().strip(),
        "city":      req.city,
        "role":      req.role,
        "joined_at": datetime.utcnow(),
    })
    return {"ok": True, "message": "Welcome to the community!"}


@router.get("/community/count")
def community_count():
    db = get_db()
    return {"count": db.community.count_documents({})}
