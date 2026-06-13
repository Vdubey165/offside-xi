"""
MongoDB connection — one client, one db instance shared across the app.
Call get_db() anywhere; it lazily connects on first use.
"""
import ssl
import logging
from pymongo import MongoClient
from pymongo.database import Database

from config import MONGO_URI

logger = logging.getLogger(__name__)

_mongo_client: MongoClient | None = None
_db: Database | None = None


def get_db() -> Database:
    global _mongo_client, _db
    if _db is None:
        logger.info("Connecting to MongoDB...")
        _mongo_client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=10000,
            tls=True,
            # TODO: replace with a proper CA cert bundle for production.
            # tlsCAFile="/path/to/ca.pem"
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True,
        )
        _db = _mongo_client["offside_xi"]
        _db.users.create_index("email", unique=True)
        _db.challenge_history.create_index([("user_id", 1), ("gw", 1)])
        logger.info("MongoDB connected.")
    return _db
