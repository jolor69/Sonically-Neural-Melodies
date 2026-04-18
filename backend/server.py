"""Sonically — Audio Mastering Backend"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Request, Response, Cookie, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Local imports
from presets import PRESETS, PRESET_MAP, get_preset_public
from storage import init_storage, put_object, get_object, build_path, APP_NAME
from audio_engine import apply_preset, probe_duration, waveform_peaks
from auth import (
    hash_password, verify_password, create_jwt, decode_jwt,
    fetch_emergent_session, resolve_user, new_user_id,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("sonically")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Sonically API")
api = APIRouter(prefix="/api")

# ---------------- MODELS ----------------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str
    subscription_tier: str
    subscription_status: Optional[str] = "none"


class CheckoutRequest(BaseModel):
    plan: str  # pro | studio
    billing: str  # monthly | yearly
    origin_url: str


class ProcessRequest(BaseModel):
    track_id: str
    preset_id: str


# ---------------- PRICING ----------------
PLANS = {
    "pro": {
        "monthly": {"amount": 4.99, "label": "Pro Monthly"},
        "yearly": {"amount": 44.99, "label": "Pro Yearly"},
    },
    "studio": {
        "monthly": {"amount": 12.99, "label": "Studio Monthly"},
        "yearly": {"amount": 119.99, "label": "Studio Yearly"},
    },
}

TIER_LIMITS = {
    "free": {"max_tracks_per_month": 5, "max_file_mb": 50},
    "pro": {"max_tracks_per_month": 30, "max_file_mb": 100},
    "studio": {"max_tracks_per_month": 10000, "max_file_mb": 200},
}

ALLOWED_EXT = {"wav", "mp3", "flac", "m4a", "aac", "ogg"}


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------------- ROUTES: HEALTH ----------------
@api.get("/")
async def root():
    return {"app": "Sonically", "status": "ok"}


@api.get("/presets")
async def list_presets():
    return {"presets": get_preset_public()}


@api.get("/plans")
async def list_plans():
    return {"plans": PLANS, "tier_limits": TIER_LIMITS}


# ---------------- AUTH ----------------
@api.post("/auth/signup")
async def signup(body: SignupRequest, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_user_id()
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": body.name,
        "picture": None,
        "password_hash": hash_password(body.password),
        "auth_provider": "email",
        "subscription_tier": "free",
        "subscription_status": "none",
        "created_at": iso(utcnow()),
    }
    await db.users.insert_one(user_doc)
    token = create_jwt(user_id)
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": body.name,
            "picture": None,
            "auth_provider": "email",
            "subscription_tier": "free",
            "subscription_status": "none",
        },
    }


@api.post("/auth/login")
async def login(body: LoginRequest):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt(user["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "auth_provider": user.get("auth_provider", "email"),
            "subscription_tier": user.get("subscription_tier", "free"),
            "subscription_status": user.get("subscription_status", "none"),
        },
    }


@api.post("/auth/oauth/session")
async def oauth_session_exchange(request: Request, response: Response):
    """Exchange Emergent session_id for our session cookie."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    data = fetch_emergent_session(session_id)
    email = data["email"].lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data.get("name") or existing.get("name"),
                "picture": data.get("picture"),
                "auth_provider": existing.get("auth_provider", "google"),
            }},
        )
    else:
        user_id = new_user_id()
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email.split("@")[0]),
            "picture": data.get("picture"),
            "password_hash": None,
            "auth_provider": "google",
            "subscription_tier": "free",
            "subscription_status": "none",
            "created_at": iso(utcnow()),
        })

    session_token = data["session_token"]
    expires_at = utcnow() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": utcnow(),
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "auth_provider": user.get("auth_provider"),
            "subscription_tier": user.get("subscription_tier", "free"),
            "subscription_status": user.get("subscription_status", "none"),
        }
    }


@api.get("/auth/me")
async def auth_me(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "auth_provider": user.get("auth_provider", "email"),
        "subscription_tier": user.get("subscription_tier", "free"),
        "subscription_status": user.get("subscription_status", "none"),
    }


@api.post("/auth/logout")
async def logout(
    response: Response,
    session_token: Optional[str] = Cookie(None),
):
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------------- TRACKS ----------------
@api.post("/tracks/upload")
async def upload_track(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    filename = file.filename or "upload"
    ext = filename.split(".")[-1].lower() if "." in filename else "wav"
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type .{ext}")
    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    tier = user.get("subscription_tier", "free")
    limit_mb = TIER_LIMITS[tier]["max_file_mb"]
    if size_mb > limit_mb:
        raise HTTPException(status_code=400, detail=f"File exceeds {limit_mb}MB for {tier} tier")

    track_id = f"trk_{uuid.uuid4().hex[:12]}"
    storage_filename = f"{track_id}.{ext}"
    storage_path = build_path("originals", user["user_id"], storage_filename)
    put_object(storage_path, data, file.content_type or "audio/wav")
    duration = probe_duration(data, ext)
    peaks = waveform_peaks(data, ext)

    doc = {
        "track_id": track_id,
        "user_id": user["user_id"],
        "original_filename": filename,
        "storage_path_original": storage_path,
        "storage_path_mastered": None,
        "preset_id": None,
        "ext": ext,
        "size_bytes": len(data),
        "duration_sec": duration,
        "peaks_original": peaks,
        "peaks_mastered": None,
        "status": "uploaded",
        "is_deleted": False,
        "created_at": iso(utcnow()),
        "mastered_at": None,
    }
    await db.tracks.insert_one(doc)
    return _public_track(doc)


@api.get("/tracks")
async def list_tracks(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    cursor = db.tracks.find(
        {"user_id": user["user_id"], "is_deleted": False},
        {"_id": 0},
    ).sort("created_at", -1).limit(100)
    tracks = await cursor.to_list(100)
    return {"tracks": [_public_track(t) for t in tracks]}


@api.get("/tracks/{track_id}")
async def get_track(
    track_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    track = await db.tracks.find_one(
        {"track_id": track_id, "user_id": user["user_id"], "is_deleted": False},
        {"_id": 0},
    )
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return _public_track(track)


@api.post("/tracks/process")
async def process_track(
    body: ProcessRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    # Monthly quota check
    tier = user.get("subscription_tier", "free")
    quota = TIER_LIMITS[tier]["max_tracks_per_month"]
    month_start = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count = await db.tracks.count_documents({
        "user_id": user["user_id"],
        "status": "mastered",
        "mastered_at": {"$gte": iso(month_start)},
    })
    if count >= quota:
        raise HTTPException(status_code=402, detail=f"Monthly export quota reached for {tier} tier. Upgrade to continue.")

    track = await db.tracks.find_one(
        {"track_id": body.track_id, "user_id": user["user_id"], "is_deleted": False},
        {"_id": 0},
    )
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    preset = PRESET_MAP.get(body.preset_id)
    if not preset:
        raise HTTPException(status_code=400, detail="Unknown preset")

    original_bytes, _ = get_object(track["storage_path_original"])
    mastered_bytes = apply_preset(original_bytes, track["ext"], preset["filter"], "wav")
    peaks_mastered = waveform_peaks(mastered_bytes, "wav")

    mastered_filename = f"{track['track_id']}_{preset['id']}.wav"
    mastered_path = build_path("mastered", user["user_id"], mastered_filename)
    put_object(mastered_path, mastered_bytes, "audio/wav")

    await db.tracks.update_one(
        {"track_id": body.track_id},
        {"$set": {
            "storage_path_mastered": mastered_path,
            "preset_id": preset["id"],
            "peaks_mastered": peaks_mastered,
            "status": "mastered",
            "mastered_at": iso(utcnow()),
        }},
    )
    updated = await db.tracks.find_one({"track_id": body.track_id}, {"_id": 0})
    return _public_track(updated)


@api.get("/tracks/{track_id}/stream/{which}")
async def stream_track(
    track_id: str,
    which: str,
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    # Support token via query param for <audio src> tags (can't send headers)
    auth = authorization or (f"Bearer {token}" if token else None)
    user = await resolve_user(db, auth, session_token)
    track = await db.tracks.find_one(
        {"track_id": track_id, "user_id": user["user_id"], "is_deleted": False},
        {"_id": 0},
    )
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if which == "original":
        path = track["storage_path_original"]
    elif which == "mastered":
        path = track.get("storage_path_mastered")
        if not path:
            raise HTTPException(status_code=404, detail="Not mastered yet")
    else:
        raise HTTPException(status_code=400, detail="Invalid which")
    data, content_type = get_object(path)
    return StreamingResponse(BytesIO(data), media_type=content_type or "audio/wav")


@api.delete("/tracks/{track_id}")
async def delete_track(
    track_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    result = await db.tracks.update_one(
        {"track_id": track_id, "user_id": user["user_id"]},
        {"$set": {"is_deleted": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Track not found")
    return {"ok": True}


def _public_track(t: dict) -> dict:
    return {
        "track_id": t["track_id"],
        "original_filename": t["original_filename"],
        "preset_id": t.get("preset_id"),
        "duration_sec": t.get("duration_sec", 0),
        "peaks_original": t.get("peaks_original") or [],
        "peaks_mastered": t.get("peaks_mastered") or [],
        "status": t.get("status", "uploaded"),
        "created_at": t.get("created_at"),
        "mastered_at": t.get("mastered_at"),
    }


# ---------------- STRIPE ----------------
@api.post("/payments/checkout")
async def create_checkout(
    body: CheckoutRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    plan = PLANS.get(body.plan)
    if not plan or body.billing not in plan:
        raise HTTPException(status_code=400, detail="Invalid plan or billing")
    amount = float(plan[body.billing]["amount"])

    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest,
    )
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    sc = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"

    ckreq = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "plan": body.plan,
            "billing": body.billing,
        },
    )
    session = await sc.create_checkout_session(ckreq)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "email": user["email"],
        "amount": amount,
        "currency": "usd",
        "plan": body.plan,
        "billing": body.billing,
        "payment_status": "pending",
        "status": "open",
        "created_at": iso(utcnow()),
    })
    return {"url": session.url, "session_id": session.session_id}


@api.get("/payments/status/{session_id}")
async def payments_status(
    session_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    user = await resolve_user(db, authorization, session_token)
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")
    status = await sc.get_checkout_status(session_id)

    updates = {
        "status": status.status,
        "payment_status": status.payment_status,
        "updated_at": iso(utcnow()),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": updates})

    # Idempotent tier upgrade
    if status.payment_status == "paid" and tx.get("payment_status") != "paid":
        plan = tx.get("plan")
        if plan in ("pro", "studio"):
            await db.users.update_one(
                {"user_id": tx["user_id"]},
                {"$set": {
                    "subscription_tier": plan,
                    "subscription_status": "active",
                    "subscription_billing": tx.get("billing"),
                    "subscription_activated_at": iso(utcnow()),
                }},
            )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "plan": tx.get("plan"),
        "billing": tx.get("billing"),
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        evt = await sc.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail="bad signature")

    if evt.payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": evt.session_id},
                {"$set": {"payment_status": "paid", "status": "complete"}},
            )
            plan = tx.get("plan")
            if plan in ("pro", "studio"):
                await db.users.update_one(
                    {"user_id": tx["user_id"]},
                    {"$set": {
                        "subscription_tier": plan,
                        "subscription_status": "active",
                        "subscription_billing": tx.get("billing"),
                        "subscription_activated_at": iso(utcnow()),
                    }},
                )
    return {"received": True}


# ---------------- STARTUP ----------------
@app.on_event("startup")
async def on_startup():
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    # Seed demo user (idempotent)
    demo_email = "demo@sonically.io"
    existing = await db.users.find_one({"email": demo_email}, {"_id": 0})
    if not existing:
        await db.users.insert_one({
            "user_id": new_user_id(),
            "email": demo_email,
            "name": "Demo User",
            "picture": None,
            "password_hash": hash_password("DemoUser123!"),
            "auth_provider": "email",
            "subscription_tier": "free",
            "subscription_status": "none",
            "created_at": iso(utcnow()),
        })
        logger.info("Seeded demo user")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
