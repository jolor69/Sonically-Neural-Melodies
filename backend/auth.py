"""Auth helpers: JWT email/password authentication."""
import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from typing import Optional

JWT_SECRET = os.environ.get("JWT_SECRET", "dev_secret")
JWT_ALG = "HS256"
JWT_TTL_DAYS = 7


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


async def resolve_user(db, authorization: Optional[str]):
    """Resolve user from Authorization: Bearer <jwt>. Returns user dict or raises 401."""
    if authorization and authorization.startswith("Bearer "):
        user_id = decode_jwt(authorization[7:])
        if user_id:
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user:
                return user
    raise HTTPException(status_code=401, detail="Not authenticated")


def new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"
