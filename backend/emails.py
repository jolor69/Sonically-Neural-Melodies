"""Resend email delivery for Sonically — transactional receipt emails."""
import os
import asyncio
import logging
from typing import Optional
import resend

logger = logging.getLogger("sonically.emails")

_configured = False


def _ensure_configured():
    global _configured
    if not _configured:
        key = os.environ.get("RESEND_API_KEY")
        if not key:
            raise RuntimeError("RESEND_API_KEY not set")
        resend.api_key = key
        _configured = True


def _from_header() -> str:
    name = os.environ.get("RESEND_FROM_NAME", "Sonically")
    email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    return f"{name} <{email}>"


async def _send(to: str, subject: str, html: str, text: Optional[str] = None, raise_on_error: bool = False) -> Optional[str]:
    _ensure_configured()
    params = {
        "from": _from_header(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    reply_to = os.environ.get("RESEND_REPLY_TO")
    if reply_to:
        params["reply_to"] = reply_to
    if text:
        params["text"] = text
    try:
        resp = await asyncio.to_thread(resend.Emails.send, params)
        email_id = resp.get("id") if isinstance(resp, dict) else None
        logger.info(f"Email sent to {to} — id={email_id}")
        return email_id
    except Exception as e:
        logger.error(f"Email send failed to {to}: {e}")
        if raise_on_error:
            raise
        return None


async def send_test_email(to_email: str) -> Optional[str]:
    """Sends a minimal test email, raising on failure so callers (e.g. an admin
    diagnostics route) can surface the real Resend error instead of a silent no-op."""
    return await _send(
        to_email,
        "Sonically — test email",
        "<p>This is a test email confirming Resend delivery is configured correctly for Sonically.</p>",
        raise_on_error=True,
    )


def _receipt_html(*, name: str, plan: str, billing: str, amount: float, currency: str, provider: str, txn_id: str, app_url: str) -> str:
    plan_label = plan.capitalize()
    billing_label = "yearly" if billing == "yearly" else "monthly"
    amt = f"{currency.upper()} {amount:.2f}"
    provider_label = "Stripe" if provider == "stripe" else "PayPal"
    return f"""
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0A0A0C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#E5E7EB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0C;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121216;border:1px solid #2A2A35;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 16px;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#E28C22;font-weight:700;">Sonically · Neural Melodies</div>
              <h1 style="margin:12px 0 4px;font-size:30px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">You're a {plan_label} now.</h1>
              <p style="margin:0;color:#9CA3AF;font-size:15px;">Thanks, {name or 'producer'}. Your {billing_label} plan is active.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2A2A35;border-bottom:1px solid #2A2A35;margin:24px 0;">
                <tr>
                  <td style="padding:16px 0;font-size:13px;color:#9CA3AF;">Plan</td>
                  <td align="right" style="padding:16px 0;font-size:14px;color:#ffffff;font-weight:600;">{plan_label} · {billing_label}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 16px;font-size:13px;color:#9CA3AF;border-top:1px dashed #2A2A35;">Amount</td>
                  <td align="right" style="padding:4px 0 16px;font-size:14px;color:#ffffff;font-weight:600;border-top:1px dashed #2A2A35;">{amt}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 16px;font-size:13px;color:#9CA3AF;border-top:1px dashed #2A2A35;">Paid via</td>
                  <td align="right" style="padding:4px 0 16px;font-size:14px;color:#ffffff;font-weight:600;border-top:1px dashed #2A2A35;">{provider_label}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 16px;font-size:13px;color:#9CA3AF;border-top:1px dashed #2A2A35;">Transaction</td>
                  <td align="right" style="padding:4px 0 16px;font-size:12px;color:#9CA3AF;font-family:'JetBrains Mono',monospace;border-top:1px dashed #2A2A35;">{txn_id}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 32px;">
              <a href="{app_url}/dashboard" style="display:inline-block;background:#E28C22;color:#0A0A0C;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;">Back to studio →</a>
              <p style="margin:24px 0 0;font-size:12px;color:#6B7280;line-height:1.6;">
                Questions? Reply to this email or write to <a href="mailto:neural.melodies.notes@gmail.com" style="color:#E28C22;text-decoration:none;">neural.melodies.notes@gmail.com</a>.
                <br/>See our <a href="{app_url}/terms" style="color:#E28C22;text-decoration:none;">Terms &amp; Refund Policy</a>. Keep this receipt for your records.
              </p>
            </td>
          </tr>
        </table>
        <div style="margin-top:16px;font-size:11px;color:#6B7280;">Sonically by Neural Melodies</div>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()


def _receipt_text(*, name: str, plan: str, billing: str, amount: float, currency: str, provider: str, txn_id: str, app_url: str) -> str:
    return (
        f"Hi {name or 'there'},\n\n"
        f"You're a {plan.capitalize()} now. Thanks for subscribing to Sonically.\n\n"
        f"Plan: {plan.capitalize()} · {billing}\n"
        f"Amount: {currency.upper()} {amount:.2f}\n"
        f"Paid via: {'Stripe' if provider == 'stripe' else 'PayPal'}\n"
        f"Transaction: {txn_id}\n\n"
        f"Back to studio: {app_url}/dashboard\n\n"
        f"Questions? Reply to this email or write to neural.melodies.notes@gmail.com.\n\n"
        f"— Sonically by Neural Melodies"
    )


def _reset_html(*, name: str, reset_url: str) -> str:
    return f"""
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0A0A0C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#E5E7EB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0C;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121216;border:1px solid #2A2A35;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 16px;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#E28C22;font-weight:700;">Sonically · Neural Melodies</div>
              <h1 style="margin:12px 0 4px;font-size:30px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">Reset your password.</h1>
              <p style="margin:0;color:#9CA3AF;font-size:15px;">Hi {name or 'there'}, we got a request to reset your Sonically password.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              <a href="{reset_url}" style="display:inline-block;background:#E28C22;color:#0A0A0C;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;">Reset password →</a>
              <p style="margin:24px 0 0;font-size:12px;color:#6B7280;line-height:1.6;">
                This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.
                <br/>Questions? Reply to this email or write to <a href="mailto:neural.melodies.notes@gmail.com" style="color:#E28C22;text-decoration:none;">neural.melodies.notes@gmail.com</a>.
              </p>
            </td>
          </tr>
        </table>
        <div style="margin-top:16px;font-size:11px;color:#6B7280;">Sonically by Neural Melodies</div>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()


def _reset_text(*, name: str, reset_url: str) -> str:
    return (
        f"Hi {name or 'there'},\n\n"
        f"We got a request to reset your Sonically password. Reset it here:\n"
        f"{reset_url}\n\n"
        f"This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.\n\n"
        f"— Sonically by Neural Melodies"
    )


async def send_password_reset_email(*, to_email: str, name: str, reset_url: str) -> Optional[str]:
    """Send a password reset link. No-ops (logs a warning) if RESEND_API_KEY unset."""
    if not os.environ.get("RESEND_API_KEY"):
        logger.warning("RESEND_API_KEY not set — skipping password reset email")
        return None
    subject = "Reset your Sonically password"
    html = _reset_html(name=name, reset_url=reset_url)
    text = _reset_text(name=name, reset_url=reset_url)
    return await _send(to_email, subject, html, text)


async def send_payment_receipt(
    *,
    to_email: str,
    name: str,
    plan: str,
    billing: str,
    amount: float,
    currency: str,
    provider: str,
    txn_id: str,
    app_url: str,
) -> Optional[str]:
    """Send a receipt email after successful Stripe/PayPal payment."""
    if not os.environ.get("RESEND_API_KEY"):
        logger.warning("RESEND_API_KEY not set — skipping receipt email")
        return None
    subject = f"Receipt · Sonically {plan.capitalize()} ({billing})"
    html = _receipt_html(
        name=name, plan=plan, billing=billing, amount=amount, currency=currency,
        provider=provider, txn_id=txn_id, app_url=app_url,
    )
    text = _receipt_text(
        name=name, plan=plan, billing=billing, amount=amount, currency=currency,
        provider=provider, txn_id=txn_id, app_url=app_url,
    )
    return await _send(to_email, subject, html, text)
