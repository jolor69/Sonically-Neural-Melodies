# Sonically — Online Audio Mastering Platform

## Original Problem Statement
Build an online audio mastering tool with:
1. Various mastering presets (reference screenshots provided showing Universal, Fire, Clarity, Tape, Natural, Spatial, Cinematic, Punch).
2. Subscription tiers (pricing screenshot in IDR) converted to USD, integrated with Stripe and PayPal.
3. Users upload audio files to be mastered.
4. Landing page launches into sign up / login flow.
5. Sign up with email or Google.

## User Choices Confirmed
- Real backend audio processing (ffmpeg)
- Emergent Google Auth + email/password JWT
- Stripe (PayPal deferred — shown as "Coming Soon")
- USD pricing: Free $0 · Pro $4.99/mo $44.99/yr · Studio $12.99/mo $119.99/yr
- 8 presets with unique icons (user explicitly required icons to differ)

## Architecture
**Backend** (FastAPI + MongoDB + emergentintegrations)
- `/api/auth/*` — email/password JWT + Emergent Google OAuth session exchange
- `/api/tracks/*` — upload, list, get, process, stream (original/mastered), delete
- `/api/presets` — 8 signature presets with ffmpeg filter chains
- `/api/plans` — tier pricing
- `/api/payments/*` — Stripe checkout + polling status + webhook
- Emergent Object Storage for audio files (originals + mastered outputs)
- ffmpeg-based mastering (equalizer, acompressor, loudnorm, extrastereo, aecho)
- Waveform peak extraction for A/B preview

**Frontend** (React + Tailwind + shadcn/ui)
- `/` Landing (hero, workflow, presets grid, engineer testimonials, pricing, CTA)
- `/login` Auth (email+password + Google button)
- `/auth/callback` OAuth session_id handler
- `/dashboard` Upload dropzone + recent tracks
- `/workspace/:trackId` A/B waveform comparison, preset picker, process & download
- `/pricing` Plan cards with Stripe checkout
- `/payment/success` Polling confirmation

**Design**: Dark analog-studio aesthetic (charcoal #0A0A0C base, tape-amber #E28C22 accent, Outfit display + IBM Plex Sans + JetBrains Mono for data). 8 unique Lucide icons per preset, each with its own accent color.

## What's Implemented (2026-02)
- Complete landing page with animated waveform hero, 8 distinct preset cards, engineer testimonials, pricing cards with monthly/yearly toggle
- Email/password signup + login (JWT, bcrypt)
- Emergent Google OAuth with session_token cookie + /api/auth/me
- Audio upload (WAV/MP3/FLAC/M4A, tier-gated size: 50/100/200MB)
- Real ffmpeg mastering (verified: Fire preset raised test tone peak 0.088 → 0.387)
- Waveform peak extraction for A/B visualization
- Per-tier monthly export quotas (5/30/∞)
- Stripe checkout with polling + webhook + idempotent tier upgrade
- Admin dashboard (`/admin`) for discount codes & tier track limits
- CC-BY 4.0 music samples for preset previews; LUFS badges per preset
- Demo user seeded on startup (demo@sonically.io / DemoUser123!)

## Recent fixes (2026-02-18)
- PaymentSuccess.jsx polling: extended MAX_ATTEMPTS to 25 with progressive backoff (~2 min total), so the success UI reliably transitions after Stripe checkout.
- /api/payments/status/{session_id}: tier upgrade is now idempotent and runs in both the Stripe success path AND the "No such checkout.session" fallback path (previously the fallback path returned paid without upgrading). Verified via curl — user flipped free → pro on first poll.

## PayPal Integration (2026-02-18)
- Added PayPal Orders v2 REST integration (sandbox + live credentials in .env, PAYPAL_MODE switches).
- New module: `/app/backend/paypal.py` (httpx-based — token fetch, create_order, capture_order, get_order).
- New endpoints:
  - `GET  /api/payments/paypal/config` (public — returns client_id + mode for JS SDK)
  - `POST /api/payments/paypal/create-order` (auth — creates PayPal order, inserts payment_transactions row with provider='paypal')
  - `POST /api/payments/paypal/capture-order/{order_id}` (auth — captures order, idempotently upgrades user tier; handles "already captured" 422 gracefully; also runs tier upgrade if a prior webhook marked paid without upgrading)
- `/api/payments/status/{session_id}` now branches on `provider` — PayPal txs skip Stripe retrieval and return DB state directly.
- Frontend: added `PayPalCheckoutButton` component and wrapped `/pricing` in a single `PayPalScriptProvider`. Each Pro/Studio card shows PayPal smart buttons under the existing Stripe "Upgrade to …" CTA. Buttons auto-disable when user already owns that tier.
- Tested 23/23 backend + frontend assertions (iteration_2.json). Real PayPal buyer approval can only be verified interactively; all automatable paths pass.

## Iteration 3 — UI polish + Resend receipts + price bump (2026-02-18)
- **Pricing +10%:** Pro monthly $4.99→$5.49, Pro yearly $44.99→$49.49, Studio monthly $12.99→$14.29, Studio yearly $119.99→$131.99. Display derivations ($4.12/mo, $11/mo) reflect per-month cost of yearly plans.
- **Contrast fixes:** "SAVE 25%" on Yearly toggle now dark-on-orange (readable); "POPULAR" badge same treatment.
- **PayPal buttons:** Both cards now use identical vertical gold button (fundingSource='paypal') — eliminated Pay Later split to keep both cards visually identical.
- **Landing hero:** Removed "AI · Analog · Mastered" overline above the main headline.
- **Resend email receipts** (`/app/backend/emails.py`): On successful Stripe or PayPal payment, the tier-upgrade path calls `send_payment_receipt()` exactly once (idempotent via `receipt_sent` flag in `payment_transactions`). HTML + plain-text receipt with plan, amount, provider, txn id, link back to /dashboard. From: `Sonically <onboarding@resend.dev>`, Reply-To: `neural.melodies.notes@gmail.com`.
- Tested 22/22 iteration 3 (iteration_3.json).

## Test Results (iteration 1)
- Backend: **30/30 tests passed**
- Frontend: **All flows verified**

## Prioritized Backlog
### P1
- Download format selection per tier (MP3 320 / FLAC / WAV24 / hi-res 24-96)
- Per-platform LUFS targeting UI (Spotify -14, YouTube -14, Apple -16, Tidal -14)
- Email receipts on successful payment (Resend / SendGrid)

### P2
- Custom user presets (save/load)
- Batch upload / playlist mastering
- Reference track matching (AI-assisted)
- Annotated A/B player with scrubbable waveform
- Subscription self-management (cancel/switch plan)

### P3
- Collaborator sharing (public preview link)
- Sample pack marketplace
- Mobile-optimized recording upload from iOS/Android
