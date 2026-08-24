# Formly — Gap to Success (todo.md)

> Generated 2026-08-23. Single source: `server.js:1`, `public/app.js:1`, `public/index.html:1`, `schema.sql:1`. Competitors: Typeform, Tally, Fillout, SurveyMonkey, Slido, Mentimeter, CryptPad, LimeSurvey, FormFather/EasyPost/Telegram bots.

## Why they win and you don’t

- **Distribution:** Tally/Youform/Typeform live on `Powered by` virality + 3k-10k SEO templates. You have 0 templates and no badge.
- **Trust:** Typeform SOC 2/HIPAA/EU residency, SurveyMonkey DPA. You have one Supabase project `fcoupvxoniboruuqyksl` + `ALLOWED_IPS` at `server.js:43` — not enterprise.
- **Ecosystem:** They have 120+ natives (Airtable/Notion/Sheets/Stripe/Slack). You have only `notifyTelegram()` at `server.js:343` to one `TELEGRAM_CHAT_ID`.
- **Creation speed:** They generate 10 Qs from a prompt in 8s. You hand-code `normalizeQuestions()` at `server.js:155` via `public/admin.html`.
- **Analytics:** They show drop-off + AI insights. You have `buildSummary()` counts at `server.js:450` + bars at `public/results.js:1`.

---

## P0 — Ship or stay invisible (next 2 weeks)

- [ ] **Webhook + Zapier app** — `POST /api/webhooks` (create/list/delete) + trigger `form.response.created` with `response.answers`. Unblocks 6k apps. File: `server.js:343` after `notifyTelegram`.
- [ ] **Workspaces + Auth** — Supabase Auth → `workspaces(id, owner_id, plan, created_at)` + `members(workspace_id, user_id, role)` + `forms.workspace_id` FK. RLS per-tenant. Gate `POST /api/forms` at `server.js:308` and `GET /api/admin/forms` at `server.js:500` by `auth.user.id`. Branch `TRUST_PROXY` handling at `server.js:43`.
- [ ] **Free virality badge** — Add `Powered by Formly — free anonymous forms` link in `public/index.html:791` footer when `workspace.plan === 'free'`, hide when `pro`. Stripe toggle.
- [ ] **12 SEO templates** — Seed in `schema.sql` (education pulse, homework stress, HR anonymous, product discovery). Each with `questions[]` ready for `normalizeQuestions()`.

## P1 — Monetize (weeks 3-6)

- [ ] **Billing (Stripe)** — `POST /api/billing/checkout` + webhook `POST /api/billing/webhook` → `subscriptions(workspace_id, stripe_customer_id, plan, status)`. Middleware `requirePlan('pro')` to lift `RATE_LIMIT_MAX` at `server.js:132` (30→300) and allow custom `public/logo.png` per workspace.
- [ ] **Metering** — Monthly `SELECT count(*) FROM form_responses WHERE workspace_id = X` (via `form_responses.form_id → forms.workspace_id`). Block at quota at `server.js:450` summary, show upgrade at `public/index.html:791` success screen.
- [ ] **White-label** — Per-workspace `settings.logo_url`, `settings.primary_color` → inject at `public/index.html:9` `:root { --primary }` and `public/style.css:9`.
- [ ] **CSV export** — `GET /api/forms/:id/export?format=csv` from `GET /api/forms/:id/responses` at `server.js:450`.
- [ ] **Custom domain** — `forms.domain` → CNAME + `public/index.html` canonical, gated at `pro`.

## P1 — Trust (needed for Teams $99)

- [ ] **Privacy/DPA pages** — `/privacy`, `/dpa`, `/security` stating no IP/user-agent stored, 13-mo retention vs SurveyMonkey, EU hosting (set Supabase region to `eu-central-1`).
- [ ] **RLS audit** — anon can only `SELECT forms` + `INSERT form_responses`; service role for `DELETE` at `server.js:520`. Add tests.
- [ ] **Status page** — UptimeRobot on `http://localhost:3000` → `status.formly.so`.

## P2 — Creation (AI)

- [ ] **AI generate** — `POST /api/ai/generate { prompt: "homework stress survey" }` via `GROQ_API_KEY` (already in `global-env.env`) → returns `questions[]` for `validateFormPayload()` at `server.js:155`. Button in `public/admin.html:1`.
- [ ] **AI insights** — `POST /api/forms/:id/insights` summarises `buildSummary()` text answers.

## P2 — Analytics

- [ ] **Drop-off funnel** — Add `form_responses.answered_steps integer[]` or `events` table, update `updateProgress()` at `public/app.js:178` to POST step, render funnel in `public/results.js:1` next to `stat-tiles`.

## P2 — Collaboration

- [ ] **Seats & roles** — `members` roles `owner/admin/member`, invite via email, `requireMember` replaces `requireAllowedIp` at `server.js:43`.

## P3 — Polish (keep monochrome `public/index.html:9` + Iconoir, no emojis)

- [ ] **Accessibility** — `aria-label` on `grid-btn` at `public/app.js:169`, focus trap in `blockedOverlay` at `public/index.html:807`.
- [ ] **Mobile** — Verify `form-top-nav` at `public/index.html:615` and `question-grid` at `public/app.js:169` on 320px.
- [ ] **Performance** — `public/app.js` already `app.js?v=15`; add `Cache-Control` on `express.static` at `server.js:27`.

---

## Done (do not regress)

- [x] `*` wildcard profanity (`server.js:87` + `public/app.js:36`), per-word `+= badWords.length` (`server.js:331`), `>= STRIKE_LIMIT` (`server.js:292`), `loopback` key (`server.js:150`)
- [x] `*` rate limit `30/60s` (`server.js:132`)
- [x] No draft autosave — `public/app.js:452` now `Strike guard`, only `localStorage` for `strikes_`
- [x] Fullscreen block video `https://cdn.vlipsy.com/clips/hElgqOJl/360p-watermark.mp4` + `skipVideo:true` on reload (`public/app.js:207`) + no X + `beforeunload` trap
- [x] Top nav `Back/Next` + `question-grid` (`public/app.js:169`) + header only on step 0 (`public/app.js:136`)

## How to use this file

- Check a box only after `node --check` + `curl` test (see stress tests at `/tmp/survey.log`) + hard-refresh `Cmd+Shift+R` to `app.js?v=15`.
- Keep `todo.md` in git; update `STRIKE_LIMIT` at `server.js:130` and `public/app.js:118` together.

## P0 — Tech Debt (added by agent)

- [ ] **Security headers + CORS hardening** — `server.js:32` uses `express.static` and `express.json` with no `helmet`, no `cors` allowlist, no `X-Content-Type-Options`/`CSP`. Add `helmet({contentSecurityPolicy: {...}})` before static, limit `cors({origin: [...]})`, and set `app.disable('x-powered-by')`. Verify with `curl -I http://localhost:3000`.
- [ ] **DRY BAD_WORDS source** — List duplicated verbatim at `server.js:87` and `public/app.js:36` (plus `BAD_WORD_PATTERNS` vs `BAD_WORD_RE`) — drift risk when updating profanity. Extract to `public/badwords.json` (or `shared/badwords.js` via ESM) and import in both; add `node --check` + grep CI guard that no inline list remains.
- [ ] **Dedupe :root / inline CSS** — `public/index.html:12` defines entire `:root { --bg --primary ... }` + 800 lines inline, shadowing `public/style.css:1` and `public/style.css:8` dark vars (`--primary: #f0f1f3`). Move all inline `<style>` to `public/style.css`, keep single `:root`, delete duplication, and keep monochrome contract.
- [ ] **Health + readiness probe** — No `GET /health` / `/ready` before `app.listen` at `server.js:740` (uptime todo at `P1` pings `/` which hits DB). Add `GET /health` (no DB) and `GET /ready` (light `SELECT 1` on Supabase) for UptimeRobot/`status.formly.so`, and log `supabaseAdmin` presence at startup (`server.js:19` silently falls back to anon).
- [ ] **DB guardrails in schema.sql** — `schema.sql:1`/`schema.sql:14` has single index `idx_form_responses_form(form_id)` but no `submitted_at`/`created_at` index, no `CHECK (jsonb_typeof(questions)='array')`, no `CHECK (char_length(title) <= 200)` mirroring `server.js:155` `validateFormPayload`, and no retention (13-mo delete). Add constraints + `idx_form_responses_submitted_at` + `pg_cron` or documented `DELETE` job.
- [ ] **Graceful shutdown + WS cleanup** — `server.js:6` imports `ws` for Supabase realtime but never closes clients; `server.js:740` `app.listen` has no `SIGTERM`/`SIGINT` handler, no `server.close()` + `clearInterval` for `rateLimitMap`/`ipStrikes` at `server.js:209`. Add shutdown hook with 10s drain and `process.on('unhandledRejection')` log to avoid zombie deploys on Netlify/Docker.
- [ ] **Cache-bust drift** — `public/index.html:983` loads `app.js?v=18` and `style.css?v=9` at `public/index.html:9`, but `todo.md` and `server.js:32` still reference `v=15` and have no `Cache-Control`/`etag`/`maxAge: '1y', immutable` on `express.static`. Consolidate to content-hash or single `APP_VERSION` and set `express.static(..., {maxAge:'1y', etag:true, setHeaders})` + `no-cache` for HTML.
- [ ] **CDN SRI + CSP for Iconoir** — `public/index.html:8` pulls `https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css` with no `integrity`/`crossorigin`, no `preconnect`, no `Content-Security-Policy`. Pin to version tag, add `SRI` + `preconnect` to `cdn.jsdelivr.net`, and add CSP `style-src` allowlist; fallback to local copy if CDN fails.

## P2 — Design/UX (added by agent)

- [ ] **Wizard a11y + focus management** — `public/index.html:892` header vs `public/app.js:492` wizard hides questions with `display:none` + `aria-hidden` but no `aria-live`/`role=status` on step change; custom select at `public/app.js:609` lacks arrow/Home/End + `aria-activedescendant`, rating/scale at `public/app.js:554`/`566` needs roving tabIndex. Add `<fieldset>/<legend>` per step, announce `Question 3 of 8` in live region, and trap focus in `blockedOverlay` at `public/index.html:961` + `confirmModal` at `public/index.html:973`. Test with VoiceOver + keyboard only.
- [ ] **Validation affordance + inline errors** — `public/app.js:545` adds `(optional)` but required has no `*`/`aria-required`; `public/index.html:540`/`938` `formError` not linked via `aria-describedby` to current `textarea`/`other-input`; shake at `public/app.js:846` ignores `prefers-reduced-motion`. Add `required` asterisk in `questionHead()`, set `aria-invalid`/`aria-describedby="formError profanityWarn"` on dirty fields at `public/app.js:123`, and gate animations with `@media (prefers-reduced-motion)` already only at `public/style.css:953`.
- [ ] **Loading / empty / error states + noscript** — `public/index.html:892` shows `Loading…` with no skeleton (`public/results.html:61` and `public/admin.html:74` have skeletons), no `aria-busy`, no `noscript` fallback, and `renderFatal()` at `public/app.js:1109` just swaps title. Add skeleton card to `formHeader`/`#surveyForm`, `aria-busy="true"` until `load()` at `public/app.js:199`, empty illustration when `GET /api/forms` returns `[]`, and `<noscript>` banner; mirror in `public/results.html:60`/`public/admin.html:73` with `role=status` on pagination at `public/results.html:65`.
- [ ] **Results toolbar + chart a11y** — `public/results.html:40` `resultsToolbar` has search without clear button/debounce live count, `sortSelect`/`filterQuestion` at `public/results.html:43` lack persistent `localStorage`, `chart-toggle` at `public/results.html:51` has no `aria-pressed`, donut at `public/style.css:919` has no table fallback for color-blind/contrast, pagination `Prev/Next` at `public/results.html:66` never disables + missing `aria-current`. Add clear `×`, `aria-live` count, table alt, `palette` with 4.5:1, disabled pagination, and toast on `exportCsvBtn`/`copyLinkBtn` at `public/results.html:55`.
- [ ] **Admin builder polish** — `public/admin.html:8-9` loads Iconoir twice (remove dup), `public/admin.html:43-44` `bTitle`/`bDesc` lack `maxlength`/`char-counter` + `aria-required` mirroring `server.js:155` `validateFormPayload` 200/500 caps, `template-chip` at `public/admin.html:47` needs `aria-pressed` + selected style, drag handle at `public/style.css:855` is mouse-only (add keyboard reorder + `aria-grabbed`), and `admin-import` at `public/admin.html:61` swallows JSON parse errors (surface via `toast` at `public/admin.js:1`). Also guard unsaved builder `beforeunload` like `public/app.js:171`.
- [ ] **Mobile, touch + theme consistency** — `public/index.html:880` theme toggle uses emoji `🌙/☀` via `public/app.js:33` while `public/results.html:20`/`public/admin.html:21` use `iconoir-half-moon` — unify to Iconoir + `aria-label`; `public/index.html:43` `sticky-progress` `z-index:99` sits under `topnav:100` but overlaps content on 320px at `public/index.html:730`; `nav-btn`/`grid-btn` at `public/index.html:443`/`505` are 34px (<44px WCAG); `kbd-hint` at `public/index.html:777` hidden on mobile with no alternative. Fix 44px targets, sticky offset `top:56px→52px` on mobile, and ensure all `hover` lifts at `public/style.css:464` have `focus-visible` equivalents.
- [ ] **Share/print hygiene** — `public/index.html:6`/`public/results.html:4` have no `og:title`/`description`/`canonical` (bad SEO template todo at `todo.md:20`), `public/index.html:8` Iconoir CDN lacks `preconnect` (already T-debt but UX: FOIT flash), and no `@media print` hides `topnav`/`videoOverlay`/`blockedOverlay`. Add meta OG block, `preconnect` to `cdn.jsdelivr.net`, and `print.css` hiding nav + expanding all `.question` (`public/app.js:182` `active` gate) for printable `results.html`.

## P1 — Business/Growth (added by agent)

- [ ] **Public pricing & packaging page (Free/Pro/Teams)** — No pricing page or plan comparison; `README.md:1` and `public/index.html:872` nav have no monetization path vs Tally ($29 Pro) / Typeform ($25+). Create `public/pricing.html` (reuse `public/style.css:11` tokens + `public/index.html:872` topnav) with 3 tiers: Free (100 resp/mo, Formly badge at `public/index.html:791` required) / Pro ($19, white-label `public/logo.png`, 10k resp, CSV `server.js:450`, custom domain) / Teams ($99, SSO/seats at `server.js:43`). Wire `POST /api/billing/checkout` + `POST /api/billing/webhook` mapping `priceId→plan` at `server.js:343` near `notifyTelegram()`. Add `GET /api/public/stats` cached 60s for social-proof counts on pricing. Update `README.md:47` API list + `.env.example:8` with `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`.
- [ ] **Programmatic SEO: template gallery + per-template landings + sitemap** — Competitors drive 60-80% signups via `/templates/*` (Tally 3k, Typeform 10k); you ship 0 templates and no indexable pages despite `schema.sql:14` seed todo. Add `public/templates.html` gallery + dynamic `GET /templates/:slug` (or SSR at `server.js:32` `express.static` before fallback) rendering title/description/`questions[]` from seeded `forms.is_template=true` with `<title>`, `meta description`, `og:image`, JSON-LD `FAQPage`/`SoftwareApplication`. Generate `GET /sitemap.xml` at `server.js:32` from `forms` (templates + public forms), set `Cache-Control: public, max-age=3600`, add `/robots.txt`. Pin canonical at `public/index.html:7`. Seed 12 templates in `schema.sql` as planned, expose via `GET /api/templates`.
- [ ] **Embed & share virality (iframe + OG + UTM)** — No embed or social preview vs Tally `embed` + Typeform `share`. Add `?embed=1` chrome-less mode in `public/index.html:872` (hide `topnav`, `formHeader` at `public/index.html:892`, postMessage resize), plus `GET /api/forms/:id/embed.js` snippet serving iframe code at `server.js:404` next to `GET /api/forms/:id`. Generate dynamic OG at `server.js:404`: `og:title` from `forms.title`, `og:description` from `forms.description`, `og:image` (canvas or static `public/logo.png` with title overlay), cache. Add share row on `public/index.html:939` success (Copy link with `?ref=` UTM, X/LinkedIn, QR) and `public/results.html`. Track `?utm_source` → `form_responses.answers['_meta']` or `events` table.
- [ ] **Referral / credit loop (?ref= → free responses)** — Badge alone (`public/index.html:791` todo) is passive; Tally/Fillout grow via referral credits but you have no loop and `package.json:10` has no referral infra. Add `referrals(id, referrer_workspace_id, referred_email, status, credit, created_at)` in `schema.sql:14` + capture `?ref=` in `public/app.js:182` (`URLSearchParams` → `localStorage refCode`) and send `X-Referral` header on `POST /api/forms/:id/responses` at `public/app.js:923`. On first paid conversion (`server.js:343` billing webhook) credit 200 responses to referrer and referred. Surface `Invite & earn` card at `public/admin.html:32` header-split and `/api/referrals/me` at `server.js:667`. Update `.env.example:8` docs.
- [ ] **Product analytics + business metrics (Plausible/PostHog + admin MRR dashboard)** — You only fire `notifyTelegram()` at `server.js:514`; no funnel, no MRR, no drop-off vs competitors' analytics. Add Plausible (or PostHog) `<script>` at `public/index.html:8` (after Iconoir) with events at `public/app.js:440` `rateLimit`/`public/app.js:178` `updateProgress()` → `form_viewed`, `step_completed`, `response_submitted`, `blocked`. Add owner-only `GET /api/admin/metrics` at `server.js:667` (next to `GET /api/admin/forms`) aggregating `forms`/`form_responses` by day, conversion % (`summary` at `server.js:566` `buildSummary`), MRR from `subscriptions` table. Render `stat-tiles` at `public/admin.html:73` `#listArea`. Gate with `requireAllowedIp` until workspaces Auth lands.
- [ ] **Lead capture + email nurture on success (highest-intent moment)** — `public/index.html:939` success just says "Submit another response"; no email capture vs SurveyMonkey/Typeform nurture. Add optional email checkbox + `leads(email, source_form_id, consent, created_at)` table in `schema.sql:14` + `POST /api/leads` (validate email, anon INSERT, rate-limited at `server.js:182` `checkRateLimit`). Hook Brevo/Mailchimp at `server.js:514` alongside `notifyTelegram` (fire-and-forget, concurrency guard `TELEGRAM_MAX_CONCURRENCY`). Show soft CTA: "Get results + form tips" with double-opt-in copy. Update `.env.example:8` with `BREVO_API_KEY`, add privacy note linking `/privacy`. Track `lead → paid` conversion in metrics dashboard.
- [ ] **Social proof & live trust bar (public stats + logo wall)** — No public proof vs Typeform/SurveyMonkey "Trusted by 10k+ teams"; `GET /api/forms` at `server.js:392` returns only list, not aggregated stats, and `public/index.html:888` `#progressMeta` shows only per-form progress. Add `GET /api/public/stats` at `server.js:392` (cached 60s, `SELECT count(*) FROM forms`, `form_responses`, active this week) and render ticker above `public/index.html:892` `formHeader`: "1.2k responses · 48 forms · 100% anonymous". Add logo/testimonial wall on new `public/pricing.html` + footer `public/index.html:791` ("Powered by Formly" for free tier reinforces virality). Source logos/testimonials from `README.md:1` live repo contributors; add `package.json:5` `description` → SEO meta sync.

---

## More Problems — Security (found 2026-08-23)

- [ ] **Verbose error leakage** — `server.js:388,399,408,423,491,615,627,656,673,696,727,743` leaks `error.message` (Postgres/RLS/PostgREST internals) to unauthenticated callers. Log server-side, return generic `Internal error` + code map.
- [ ] **Static admin/results exposed** — `server.js:43` `express.static` serves `public/admin.html:1`/`public/results.html:1`/`public/admin.js:1` unauthenticated; only API uses `requireAllowedIp` at `server.js:73,636,666,686,703`. Add `express.static(...,{dotfiles:'deny',index:false})` + gate `admin.html`/`results.html`.
- [ ] **Rate-limit coverage + in-memory bypass** — `server.js:178-188` only on `POST /api/forms/:id/responses` at `server.js:436`; not on `POST /api/forms` at `server.js:373`, `GET /api/forms/:id/summary` at `server.js:605`, `DELETE` at `server.js:686`. Maps are process-local, cleared on restart, `TRUST_PROXY=0` at `server.js:45` allows `X-Forwarded-For` rotation. Add global middleware + Redis/sliding window, cap `summary` limit.
- [ ] **CSP breaks inline scripts** — `server.js:40` `script-src 'self'` blocks inline theme `<script>` at `public/index.html:10`/`admin.html:11`/`results.html:10`; `style-src 'unsafe-inline'` negates benefit; missing `object-src 'none'`, `base-uri 'self'`, `media-src https://cdn.vlipsy.com https://cdn.backgroundremove.io` for videos at `public/index.html:968,974`. Add nonce/hash + `object-src 'none'; base-uri 'self'; media-src ...`.
- [ ] **Missing HSTS + X-Powered-By** — `server.js:33-42` sets `X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy` but not `app.disable('x-powered-by')` nor `Strict-Transport-Security`. Add both.
- [ ] **Persistent localStorage draft XSS** — `public/app.js:283,289,299,310,976` `saveDraft()` never expires, holds full `answers` (2000 chars at `server.js:80`), any XSS exfiltrates via `localStorage.getItem('draft_${id}')`. Use `sessionStorage` or 24h TTL + clear on `beforeunload`.
- [ ] **Unbounded JSON import + prototype pollution** — `public/admin.js:452-468` `file.text()`→`JSON.parse` no size/MIME/schema cap (bypass `express.json({limit:"25kb"})` at `server.js:31`), `validateAnswers` at `server.js:319` shallow check, `scanAnswersForProfanity` at `server.js:139` walks `Object.values` recursively, `JSON.parse(JSON.stringify(answers))` at `server.js:483` preserves `__proto__`. Add `file.size<25kb`, `questions.length<=50`, deep `isPlainObject` + deny `__proto__`.

## More Problems — Performance (found 2026-08-23)

- [ ] **Blocking deep-clone** — `server.js:472` `JSON.parse(JSON.stringify(answers))` double-serializes every `POST /responses` (25kb ×30 req/s = 750kb/s GC). Use `structuredClone()`.
- [ ] **O(Q×R) buildSummary over-fetch** — `server.js:554`/`569` nested loops + `server.js:611` `limit(5000)` / `server.js:640` `limit(1000)` fetch full `answers:jsonb` (50Q×5000 =250k iters, ~10MB). Add pagination/cache/ETag.
- [ ] **No compression** — `server.js:31-32` no `compression` middleware (`package.json:9-14` only `express,ws,supabase,dotenv`), no `etag/maxAge`. `public/app.js:1` 47k (gz 11k), `public/style.css:1` 27k (gz 5k) → ~75% waste.
- [ ] **Eager video preload** — `public/index.html:968` `completionVideo` + `974` `blockedVideo` both `preload="auto"` (<5% viewed). Use `preload="none"` + lazy `load()` in `playCelebrationVideo:971`/`showBlockedOverlay:988`.
- [ ] **Input thrashing** — `public/app.js:778` `collectAnswers()` `querySelectorAll` per Q (50) called via `public/app.js:841` `updateProgress()` + `542` `syncGridDone()` on `input`/`change`/`showStep` without debounce (only `profanityTimer:421` 200ms). Causes jank on mobile.
- [ ] **Duplicate CSS + unpinned CDN** — `public/index.html:8` `iconoir@main` (no preconnect/preload, unpinned) + `public/index.html:11-883` inline 871 lines duplicating `public/style.css:1` (55k CSS). Move inline to `style.css`, pin version, add preconnect.
- [ ] **Monolithic bundle + leaks** — `public/index.html:995` `app.js?v=19` no `defer` (actually v15), `public/app.js:1` 47k monolith, leaks: `public/app.js:663` `click` per `.custom-select` never removed on `renderForm:386` rebuild, `public/app.js:1068` `setInterval(titleFlasher)` not cleared, `server.js:194` `setInterval` O(n) on DDoS, `server.js:5` `ws` unused.

## More Problems — UX / A11y (found 2026-08-23)

- [ ] **Wizard clips on mobile** — `public/index.html:71-88` `.form-shell { max-height: calc(100vh -88px); overflow:hidden }` + `#surveyForm { overflow:hidden }` cuts off tall `checkbox` (8 opts + Other) / `textarea` on 320px/iOS keyboard. Needs `overflow:auto` on `.question`/`form`.
- [ ] **Progress not announced** — `public/index.html:897-898` `.sticky-progress` + `public/index.html:910` `#progressMeta` have no `role="progressbar" aria-valuemin/max/now` + `aria-live`. Duplicate `progress-bar` class risks JS target.
- [ ] **Placeholder-only fields** — `public/app.js:582` `textarea` + `566`/`607` `other-input` use `placeholder` without `<label for>` (`aria-labelledby` points to `<h2>` not label). Fails WCAG 3.3.2. Add `label`, `autocomplete="off"`.
- [ ] **Draft banner overlap** — `public/index.html:793-811` `.draftBanner { position:fixed; top:70px; z-index:90 }` overlaps `public/style.css:559` `topnav` ~88px on mobile at `public/index.html:910`. Needs `env(safe-area-inset-top)`.
- [ ] **Dialog focus trap broken** — `public/index.html:985-994` `confirmModal` missing `aria-describedby`, `public/app.js:57-86` no Tab cycle + no return focus; `public/index.html:973-982` `blockedOverlay` no `role=dialog`/`aria-modal`; `public/app.js:1041-1043` swallows `Escape` with no exit (WCAG 2.1.2).
- [ ] **Empty/filtered no CTA** — `public/app.js:1115-1118` `renderFatal()` no retry, `public/results.js:109` `total===0` no link with `?form=`, `public/results.js:204` no Clear filter, `public/results.js:349`/`public/admin.js:108` no retry. Add retry/CTA.
- [ ] **Admin builder a11y** — `public/admin.js:326` `qb-label`/`327` `qb-options` placeholder-only without `<label>`/`aria-label`; `public/admin.js:315-316` drag handle `<span>` not `<button>`, no keyboard reorder/`aria-grabbed`.
- [ ] **Topnav landmark** — `public/index.html:886`/`public/results.html:13`/`public/admin.html:14` `<nav>` without `aria-label="Primary"` and no `aria-current="page"` (only `.on`).

