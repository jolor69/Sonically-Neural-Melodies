"""Auth helpers: JWT email/password + Emergent Google OAuth session."""
import os
import uuid
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Header, Cookie
from typing import Optional

JWT_SECRET = os.environ.get("JWT_SECRET", "dev_secret")
JWT_ALG = "HS256"
JWT_TTL_DAYS = 7

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


def fetch_emergent_session(session_id: str) -> dict:
    """Call Emergent auth to exchange session_id for user data + session_token."""
    resp = requests.get(
        EMERGENT_SESSION_URL,
        headers={"X-Session-ID": session_id},
        timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    return resp.json()


async def resolve_user(
    db,
    authorization: Optional[str],
    session_token_cookie: Optional[str],
):
    """Resolve user from either:
    - Authorization: Bearer <jwt>  (email/password login)
    - session_token cookie (Emergent Google OAuth)
    - Authorization: Bearer <session_token> (fallback)
    Returns user dict or raises 401.
    """
    # 1. Try session_token cookie first (Emergent OAuth)
    token = session_token_cookie
    is_session = bool(token)

    # 2. Fall back to Authorization header
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        # Try as JWT first
        user_id = decode_jwt(token)
        if user_id:
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user:
                return user
        # Else treat as session_token
        is_session = True

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if is_session:
        session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session_doc:
            raise HTTPException(status_code=401, detail="Invalid session")
        expires_at = session_doc.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    raise HTTPException(status_code=401, detail="Not authenticated")


def new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"
