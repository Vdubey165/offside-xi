"""
FastAPI dependency functions — used with Depends() in route parameters.
Centralising them here means they're easy to test and swap.
"""
import logging
from fastapi import Header, HTTPException
from jose import jwt, JWTError

from config import JWT_SECRET, JWT_ALG

logger = logging.getLogger(__name__)


def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Validates the Bearer token from the Authorization header.
    Raises 401 if missing or invalid.
    Usage in routes: current_user: dict = Depends(get_current_user)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
