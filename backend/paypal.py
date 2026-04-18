"""PayPal REST API client (Orders v2)

Uses direct REST calls via httpx for reliability (avoids deprecated SDK).
Supports sandbox/live environments via PAYPAL_MODE env var.
"""
import os
import base64
import logging
from typing import Optional
import httpx

logger = logging.getLogger("sonically.paypal")

SANDBOX_BASE = "https://api-m.sandbox.paypal.com"
LIVE_BASE = "https://api-m.paypal.com"


def _mode() -> str:
    return (os.environ.get("PAYPAL_MODE") or "sandbox").lower()


def _base_url() -> str:
    return LIVE_BASE if _mode() == "live" else SANDBOX_BASE


def _credentials() -> tuple[str, str]:
    if _mode() == "live":
        cid = os.environ["PAYPAL_LIVE_CLIENT_ID"]
        sec = os.environ["PAYPAL_LIVE_CLIENT_SECRET"]
    else:
        cid = os.environ["PAYPAL_SANDBOX_CLIENT_ID"]
        sec = os.environ["PAYPAL_SANDBOX_CLIENT_SECRET"]
    return cid, sec


def public_client_id() -> str:
    """Returns the client_id for the current mode (safe to expose to frontend)."""
    return _credentials()[0]


async def _get_access_token() -> str:
    cid, sec = _credentials()
    auth = base64.b64encode(f"{cid}:{sec}".encode()).decode()
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{_base_url()}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
        )
        r.raise_for_status()
        return r.json()["access_token"]


async def create_order(
    amount: float,
    currency: str,
    reference_id: str,
    description: str,
    custom_id: Optional[str] = None,
) -> dict:
    token = await _get_access_token()
    body = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": reference_id,
            "description": description[:127],
            "amount": {
                "currency_code": currency.upper(),
                "value": f"{amount:.2f}",
            },
            **({"custom_id": custom_id[:127]} if custom_id else {}),
        }],
        "application_context": {
            "shipping_preference": "NO_SHIPPING",
            "user_action": "PAY_NOW",
            "brand_name": "Sonically by Neural Melodies",
        },
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{_base_url()}/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        if r.status_code >= 400:
            logger.error(f"PayPal create_order failed: {r.status_code} {r.text}")
            r.raise_for_status()
        return r.json()


async def capture_order(order_id: str) -> dict:
    token = await _get_access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{_base_url()}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        if r.status_code >= 400:
            logger.error(f"PayPal capture_order failed: {r.status_code} {r.text}")
            r.raise_for_status()
        return r.json()


async def get_order(order_id: str) -> dict:
    token = await _get_access_token()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{_base_url()}/v2/checkout/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
        return r.json()
