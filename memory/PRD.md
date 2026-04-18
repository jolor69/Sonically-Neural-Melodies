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

## Iteration 10 — Deployment fixes (2026-02-18)
- **CRITICAL BLOCKER fixed**: `.gitignore` had 4 duplicated blocks of `.env` / `.env.*` / `*.env` patterns that prevented Emergent's deploy pipeline from finding/updating env files for the production container. Cleaned up to a single, commented section that explicitly notes .env files are committed (secrets stay in deployment env vars, not the repo).
- **MongoDB Atlas resilience**: motor `AsyncIOMotorClient` now uses `serverSelectionTimeoutMS=10_000`, `connectTimeoutMS=10_000`, `socketTimeoutMS=30_000`, `retryWrites=True`, `retryReads=True` — fixes raw `NetworkTimeout` traces on Atlas cold-start / SRV-DNS slowness.
- **Global exception handlers**: `NetworkTimeout` / `ServerSelectionTimeoutError` / generic `PyMongoError` now return a clean `503 {"detail": "Database temporarily unreachable. Please retry in a moment."}` instead of leaking a raw pymongo stacktrace back to the user.
- **Health endpoint**: `/api/health` returns `{status: ok, db: up}` — usable as a readiness probe.
- **User action**: Redeploy required. If the NetworkTimeout recurs post-redeploy, verify the Atlas cluster's **Network Access** list includes `0.0.0.0/0` (or your deployment's egress CIDR) — Atlas IP whitelist is the only remaining non-code variable.

## Iteration 9 — httpOnly cookie migration + Donasi link (2026-02-18)
- **httpOnly auth cookie**:
  - Added lightweight middleware in `server.py` that translates the `auth_token` httpOnly cookie into an Authorization Bearer header if the request doesn't already have one. Zero changes to the ~40 protected endpoints.
  - `/auth/login` and `/auth/signup` now set the `auth_token` cookie (`HttpOnly; Secure; SameSite=none; Max-Age=7d`) in addition to returning the JWT in the JSON body.
  - `/auth/logout` clears both `auth_token` and `session_token` cookies.
  - Frontend `AuthContext`: still stores the JWT in localStorage as a fallback (for same-origin dev + browsers that block 3rd-party cookies). The primary auth vector on the deployed cross-origin site is now the httpOnly cookie, which JS cannot read → XSS-safe.
  - Verified via curl: login + cookie-only `/auth/me` works, logout clears it, invalidated with 401 after.
- **Navbar DONASI link**: New gradient-styled link placed right after ENGINEERS on landing and after Pricing on app variants. Points to `https://saweria.co/sonically` (new tab, `rel="noopener noreferrer"`, testid `nav-donasi`).
- **User action**: Redeploy required for both fixes to reach sonically.pro.

## Iteration 8 — Login bounce-back on deployed site (2026-02-18)
- **Bug**: Users logging into sonically.pro successfully got redirected back to /login immediately. Happened for both admin and non-admin users.
- **Root cause**: `auth.resolve_user()` checked for the `session_token` cookie BEFORE the Authorization Bearer JWT. Once a user had ever done Google OAuth (even in a previous session), their browser held a stale `session_token` cookie for the API domain. With axios `withCredentials: true`, that stale cookie was sent on every request. `resolve_user` saw cookie first → treated request as session auth → `user_sessions` lookup failed → 401 → AuthContext set user=null → ProtectedRoute bounced to /login.
- **Fix**: Reordered `resolve_user` to try the Authorization Bearer JWT FIRST. If valid, the user is returned immediately. Only if the Bearer is absent / not a JWT does it fall back to the session_token cookie. Verified via curl all 5 auth paths: JWT alone, JWT+stale cookie, valid session cookie, session token as Bearer, no auth.
- **User action**: **Redeploy required** — the fix is in `/app/backend/auth.py`; running container on sonically.pro still has old code.

## Iteration 7 — Preset resilience on deployed app (2026-02-18)
- **Root cause**: `Landing.jsx` + `Workspace.jsx` initialized `presets` state as `[]` and relied entirely on `/api/presets` succeeding. Any network hiccup / CORS mismatch / cold-start 502 on the deployed app resulted in `presets=[]` → the "Signature presets" section rendered 0 cards.
- **Fix**: Created `/app/frontend/src/lib/presetsFallback.js` with full display metadata for all 8 presets (universal, fire, clarity, tape, natural, spatial, cinematic, punch) mirroring `/app/backend/presets.py`. Both Landing and Workspace now initialize state to `FALLBACK_PRESETS`. The API call is still made; if it succeeds with a non-empty array, it overrides the fallback. Failures are logged to console.
- **Verified** by intercepting `/api/presets` with Playwright and confirming all 8 preset cards render with correct colors, icons, LUFS badges, and sample mini-players.

## Iteration 6 — Code review fixes (2026-02-18)
- **Backend critical fix**: `download_track()` initialized `out_bytes = b""` before the try/finally to eliminate the "possibly undefined" code path.
- **Test credentials**: all hardcoded values in `/app/backend/tests/*.py` moved behind `os.environ.get(...)` with the prior values as fallbacks (TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_DEMO_EMAIL, TEST_DEMO_PASSWORD, TEST_PAYPAL_EMAIL/PASSWORD). Added `/app/backend/tests/conftest.py` that loads .env + re-exports the constants.
- **Hook dep + empty catch cleanup** in `AuthContext.jsx` (non-401 errors logged), `AuthCallback.jsx` (OAuth failure logs), so silent failures now appear in console for debugging.
- **Array-index keys** replaced with stable content keys (`s.title`, `e.name`) for the Landing `steps` and `engineers` maps. Decorative bar arrays (static length, no reorder) keep index keys — correct for those.
- Workspace/PresetCard audio try/catch are intentional (harmless playback state resets); left silent per audio-element best practice.
- Insecure token storage (localStorage) acknowledged; migrating to httpOnly cookies is a larger architecture change — deferred. React's default JSX escaping + CSP is our current XSS defense.
- Large-component refactor suggestions (Admin / Dashboard / Landing split into sub-components, receipt dataclass, useAudioPlayer hook) deferred as low-value-at-this-stage cosmetic cleanup that risks regressing stable UI.

## Iteration 5 — P2 batch: test receipt + batch upload + purple rebrand (2026-02-18)
- **Admin "Email me a test receipt" button** — new endpoint `POST /api/admin/test-receipt` + button in /admin. Sends a sample receipt to the admin's email so they can QA the template without a real transaction. Verified via Resend (email IDs returned).
- **Batch upload** (Pro/Studio only): Dashboard file picker sets `multiple` when user tier is pro/studio/admin. Free users get a purple hint to upgrade. Upload queue (`upload-queue` testid) shows per-item status (queued/uploading/done/failed) with an "Open →" link when done. Backend unchanged — frontend queues sequential POSTs.
- **Pro tier 30 → 20 exports/month** (TIER_LIMITS.pro.max_tracks_per_month).
- **Pricing bullets updated** on both /pricing and Landing: Pro = `20 exports / month`, `WAV 16/24-bit · MP3 320k · FLAC`, `All 8 presets + Intensity & EQ`, `Batch upload (queue multiple tracks)`. Studio = `Batch upload + priority processing`. LUFS bullet removed.
- **Intensity + EQ kept as-is** (user choice b).
- **Color scheme refresh**: Neural Melodies purple `#A855F7` is now the PRIMARY brand color; orange `#E28C22` is SECONDARY. New CSS utilities in index.css: `.btn-gradient`, `.text-brand-gradient`, `.border-brand-gradient` (all purple→orange 135° linear-gradient). Applied to: Navbar logo tile + "Launch App" CTA, Landing hero headline accent + CTAs, all primary buttons across Auth / Dashboard / Admin / Pricing / Workspace / PaymentSuccess. Dashboard dropzone + track-row hover borders switched to purple. Waveform bars now use purple→orange gradient.
- Tested 11/11 backend + all frontend (iteration_5.json).

## Iteration 4 — Stripe removal + Admin pricing + Terms (2026-02-18)
- **Stripe removed entirely**: removed `/api/payments/checkout`, `/api/webhook/stripe`, all emergentintegrations Stripe imports from hot paths. `/api/payments/status/{session_id}` kept (used by PaymentSuccess polling for PayPal orders).
- **Admin pricing**: new `get_effective_pricing()` / `get_effective_plans()` helpers. Admin settings model now accepts `pro_monthly_price`, `studio_monthly_price`, `yearly_discount_percent`. `/api/admin/apply` now MERGES draft into applied (duration keys survive a pricing-only update).
- Admin UI (`/admin`) adds a **Pricing** section: monthly-price inputs for Pro/Studio and a yearly-discount slider (0–50%). Yearly price auto-calculated in live preview.
- **Pricing page refactor**: `/pricing` now pulls live prices from `/api/plans`, no more hardcoded values. Stripe "Upgrade to …" CTA removed — PayPal button is the sole checkout. "Current plan" label shown for the user's existing tier.
- **Terms & Refund Policy page** at `/terms` (3 sections: Terms of Service, Refund Policy, Privacy Snapshot, contact block). Linked from: landing footer, pricing footer text, receipt email footer.
- Receipt email now includes a link to `/terms`.
- Tested 12/12 backend + all frontend (iteration_4.json).

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
