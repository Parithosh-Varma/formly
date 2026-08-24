---
tags: [roadmap, todo, p0, p1]
---

# 08 — Roadmap (from `todo.md:1`)

> Single source: `todo.md:1` generated 2026-08-23, rewritten with comprehensive gap analysis. See `server.js:1`, `public/app.js:1`, `schema.sql:1` line refs.

## Why they win and you don't (from `todo.md`)
- **Distribution:** Tally/Typeform virality via `Powered by` badge + 3k-10k SEO templates. Formly has 0 templates and no badge.
- **Trust:** Typeform SOC 2/HIPAA/EU residency. Formly has one Supabase project + `ALLOWED_IPS`.
- **Ecosystem:** 120+ integrations (Airtable/Notion/Sheets/Stripe/Slack). Formly has only `notifyTelegram()`.
- **Creation speed:** AI generates 10 Qs from a prompt in 8s. Formly hand-codes via `normalizeQuestions()`.
- **Analytics:** Drop-off + AI insights. Formly has `buildSummary()` counts + bars.

## P0 — Ship or stay invisible (next 2 weeks)
- [ ] **Webhook + Zapier app** — `POST /api/webhooks` + trigger `form.response.created` with `answers` at `server.js:343` after `notifyTelegram`.
- [ ] **Workspaces + Auth** — Supabase Auth → `workspaces(id, owner_id, plan, created_at)` + `members(workspace_id, user_id, role)` + `forms.workspace_id` FK. RLS per-tenant.
- [ ] **Free virality badge** — `Powered by Formly` link in `public/index.html:791` footer when `workspace.plan === 'free'`.
- [ ] **12 SEO templates** — Seed in `schema.sql` (education pulse, homework stress, HR anonymous, product discovery).
- [x] **Security headers + CORS hardening** — DONE `server.js:33` `helmet`-like headers, `loopback` trust proxy.
- [ ] **DRY BAD_WORDS source** — still duplicated `server.js:90` vs `public/app.js:36` but synced logic. Extract to `shared/badwords.json`.
- [ ] **Dedupe :root / inline CSS** — `public/index.html:9` ~880 lines inline shadows `style.css:1`.
- [ ] **Health + readiness probe** — Add `GET /health` (no DB) + `GET /ready` (`SELECT 1`) before `app.listen:746`.
- [x] **DB guardrails** — `schema.sql` defines structure; app-level enforcement in `validateFormPayload:223`. Needs `submitted_at` index + retention.
- [ ] **Graceful shutdown + WS cleanup** — `server.js:5` `ws` still imported, no `SIGTERM` handler.
- [ ] **Cache-bust drift** — `public/index.html` `app.js?v=18` vs `todo.md` `v=15` drift — consolidate to `APP_VERSION`.
- [ ] **CDN SRI + CSP for Iconoir** — `public/index.html:8` no `integrity` — `CSP` added but `SRI` still open.

## P1 — Monetize (weeks 3-6)
- [ ] **Billing (Stripe)** — `POST /api/billing/checkout` + webhook → `subscriptions` at `server.js:343`
- [ ] **Metering** — Monthly `SELECT count(*) FROM form_responses WHERE form_id → workspace_id`
- [ ] **White-label** — `settings.logo_url` → `public/index.html:9` `:root {--primary}`
- [ ] **CSV export** — `GET /api/forms/:id/export?format=csv` from `GET /api/forms/:id/responses`
- [ ] **Custom domain** — `forms.domain` CNAME

## P1 — Trust (needed for Teams $99)
- [ ] **Privacy/DPA pages** `/privacy` `/dpa` `/security` — state no IP stored, 13-mo retention
- [ ] **RLS audit** — anon `SELECT forms` + `INSERT responses` verified
- [ ] **Status page** `status.formly.so` via UptimeRobot on `/health`

## P2 — Creation (AI)
- [ ] **AI generate** `POST /api/ai/generate {prompt}` via `GROQ_API_KEY` (in `global-env.env`)
- [ ] **AI insights** `POST /api/forms/:id/insights` summarises `buildSummary` text answers

## P2 — Analytics
- [ ] **Drop-off funnel** — `form_responses.answered_steps` + `updateProgress:865` + `results.js`

## P2 — Collaboration
- [ ] **Seats & roles** — `members(owner/admin/member)` replaces `requireAllowedIp:69`

## P3 — Polish
- [ ] **A11y** `aria-label` `grid-btn` `public/app.js:169` + focus trap `blockedOverlay`
- [ ] **Mobile** `form-top-nav` `public/index.html:615` 320px
- [ ] **Performance** `Cache-Control` on `express.static:43`

## P0 — Tech Debt (from `todo.md`)
- [ ] Security headers + CORS hardening (partially done)
- [ ] DRY BAD_WORDS source (`server.js:90` vs `app.js:36`)
- [ ] Dedupe :root / inline CSS (`index.html:9` shadows `style.css:1`)
- [ ] Health + readiness probe (`GET /health` + `GET /ready`)
- [ ] DB guardrails (`submitted_at` index + retention)
- [ ] Graceful shutdown + WS cleanup (`server.js:5`)
- [ ] Cache-bust drift (`app.js?v=18` vs `v=15`)
- [ ] CDN SRI + CSP for Iconoir

## P2 — Design/UX (from `todo.md`)
- Wizard a11y + focus management
- Validation affordance + inline errors
- Loading / empty / error states + noscript
- Results toolbar + chart a11y
- Admin builder polish
- Mobile, touch + theme consistency
- Share/print hygiene

## P1 — Business/Growth (from `todo.md`)
- Public pricing & packaging page (Free/Pro/Teams)
- Programmatic SEO: template gallery + per-template landings + sitemap
- Embed & share virality (iframe + OG + UTM)
- Referral / credit loop (?ref= → free responses)
- Product analytics + business metrics (Plausible/PostHog)
- Lead capture + email nurture on success
- Social proof & live trust bar (public stats + logo wall)

## More Problems — Security (from `todo.md`)
- Verbose error leakage (Postgres/RLS internals)
- Static admin/results exposed unauthenticated
- Rate-limit coverage + in-memory bypass
- CSP breaks inline scripts
- Missing HSTS + X-Powered-By
- Persistent localStorage draft XSS
- Unbounded JSON import + prototype pollution

## More Problems — Performance (from `todo.md`)
- Blocking deep-clone `JSON.parse(JSON.stringify)`
- O(Q×R) buildSummary over-fetch
- No compression (no `compression` middleware)
- Eager video preload (`preload="auto"`)
- Input thrashing (no debounce on `collectAnswers`)
- Duplicate CSS + unpinned CDN
- Monolithic bundle + leaks

## More Problems — UX / A11y (from `todo.md`)
- Wizard clips on mobile (overflow:hidden)
- Progress not announced (no `role="progressbar"`)
- Placeholder-only fields (no `<label for>`)
- Draft banner overlap
- Dialog focus trap broken
- Empty/filtered no CTA
- Admin builder a11y
- Topnav landmark

## Done (do not regress)
- [x] `*` wildcard profanity `server.js:90` + `public/app.js:36` Per-word `+= badWords.length`
- [x] Rate `30/60s` `server.js:179`
- [x] Profanity bypass `f u c k` `f**k` fixed
- [x] `strikeHint` removed `server.js:444`
- [x] `draftDismissKey` `app.js:281`
- [x] `q.id` XSS `app.js:563`
- [x] Block per-form → global `app.js:820`
- [x] Double-submit `isSubmitting` `app.js:488`
- [x] `X-Frame-Options DENY` `CSP`

## How to use
- Check only after `node --check` + `curl -I` + `python3 /tmp/final_suite2.py` PASS
- Keep `todo.md` in git; update `STRIKE_LIMIT` at `server.js:175` and `public/app.js` together
- See [[09-Changelog]] for git diffs

## Links
- [[04-Bug-Fixes]] — code diffs
- [[03-Stress-Test-Report]] — proofs
- [[01-Context]] — stack overview
