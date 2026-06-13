"""
All Pydantic schemas for request bodies and response models.
Keeping them here means routers never import from each other.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


# ── FPL / Squad ───────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    budget: float = 100.0


class TransferRequest(BaseModel):
    team_id:        int
    free_transfers: int       = 1
    hit_cost:       int       = 4
    locked_players: list[str] = []


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:    str
    password: str
    name:     Optional[str] = None


class LoginRequest(BaseModel):
    email:    str
    password: str


class UserResponse(BaseModel):
    id:          str
    email:       str
    name:        str
    fpl_team_id: Optional[int] = None


class AuthResponse(BaseModel):
    token: str
    user:  UserResponse


# ── User ───────────────────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    fpl_team_id: Optional[int] = None
    name:        Optional[str] = None


class ChallengeResultRequest(BaseModel):
    gw:         int
    model_pts:  float
    user_pts:   float
    user_swaps: Optional[list] = []


# ── Community ─────────────────────────────────────────────────────────────────

class CommunityJoinRequest(BaseModel):
    email: str
    city:  str
    role:  str
