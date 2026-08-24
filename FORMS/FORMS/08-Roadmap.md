---
tags: [roadmap, todo, p0, p1]
---

# 08 — Roadmap (from `todo.md:1`)

> Single source: `todo.md:1` generated 2026-08-23. See `server.js:1`, `public/app.js:1`, `schema.sql:1` line refs.

## P0 — Ship or stay invisible (next 2 weeks)
- [ ] **Webhook + Zapier app** — `POST /api/webhooks` + trigger `form.response.created` with `answers` at `server.js:343` after `notifyTelegram`.
- [x] **Security headers + CORS hardening** — DONE `server.js:22` `helmet`-like headers, `loopback` trust proxy.
- [x] **DRY BAD_WORDS source** — partially: still duplicated `server.js:77` vs `public/app.js:90` but now synced logic (wildcard, zero-width). Extract to `shared/badwords.json` still open.
- [ ] **Dedupe :root / inline CSS** — `public/index.html:9` 800 lines inline shadows `style.css:1` (open).
- [ ] **Health + readiness probe** — Add `GET /health` (no DB) + `GET /ready` (`SELECT 1`) before `app.listen:680`.
- [x] **DB guardrails in schema.sql** — DONE `schema.sql:6` `CHECK` + `idx_form_responses_form` but needs `submitted_at` index + retention `pg_cron`.
- [ ] **Graceful shutdown + WS cleanup** — `server.js:5` `ws` still imported, no `SIGTERM` handler (open).
- [ ] **Cache-bust drift** — `public/index.html:983` `app.js?v=18` vs `todo.md` `v=15` drift — consolidate to `APP_VERSION`.
- [ ] **CDN SRI + CSP for Iconoir** — `public/index.html:8` no `integrity` — `CSP` added but `SRI` still open.

## P1 — Monetize (weeks 3-6)
- [ ] Billing (Stripe) `POST /api/billing/checkout` + webhook → `subscriptions` at `server.js:343`
- [ ] Metering `SELECT count(*) FROM form_responses WHERE form_id → workspace_id`
- [ ] White-label `settings.logo_url` → `public/index.html:9` `:root {--primary}`
- [ ] CSV export `GET /api/forms/:id/export?format=csv` from `GET /api/forms/:id/responses:474`
- [ ] Custom domain `forms.domain` CNAME

## P1 — Trust
- [ ] Privacy/DPA pages `/privacy` `/dpa` `/security` — state no IP stored, 13-mo retention
- [x] RLS audit — anon `SELECT forms` + `INSERT responses` verified live `401` vs schema `WITH CHECK(true)` divergence noted
- [ ] Status page `status.formly.so` via UptimeRobot on `/health`

## P2 — Creation (AI)
- [ ] AI generate `POST /api/ai/generate {prompt}` via `GROQ_API_KEY` (in `global-env.env`) → `questions[]` for `validateFormPayload:159`
- [ ] AI insights `POST /api/forms/:id/insights` summarises `buildSummary` text answers

## P2 — Analytics
- [ ] Drop-off funnel `form_responses.answered_steps` + `updateProgress:836` POST step + `public/results.js:1` funnel

## P2 — Collaboration
- [ ] Seats & roles `members(owner/admin/member)` replaces `requireAllowedIp:58`

## P3 — Polish
- [ ] A11y `aria-label` `grid-btn` `public/app.js:169` + focus trap `blockedOverlay:1017`
- [ ] Mobile `form-top-nav` `public/index.html:615` 320px
- [ ] Performance `Cache-Control` on `express.static:27`

## Done (do not regress)
- [x] `*` wildcard profanity `server.js:77` + `public/app.js:90` Per-word `+= badWords.length` `server.js:331` `loopback:${ip}`
- [x] Rate `30/60s` `server.js:178`
- [x] Profanity bypass `f u c k` `f**k` fixed
- [x] `strikeHint` removed `server.js:320`
- [x] `draftDismissKey` `app.js:273`
- [x] `q.id` XSS `app.js:563`
- [x] Block per-form → global `app.js:820`
- [x] Double-submit `isSubmitting` `app.js:488`
- [x] `X-Frame-Options DENY` `CSP`

## How to use
- Check only after `node --check` + `curl -I` + `python3 /tmp/final_suite2.py` PASS
- Keep `todo.md` in git; update `STRIKE_LIMIT` at `server.js:174` and `public/app.js:177` together
- See [[09-Changelog]] for git diffs
