---
tags: [adr, decisions, architecture]
---

# 07 — Decisions (ADRs)

## ADR-01 — `trust proxy: loopback` not `true`
- **Context:** `server.js:28` `app.set('trust proxy', true)` trusts any `X-Forwarded-For` → attacker `curl -H XFF:127.0.0.1` bypasses `requireAllowedIp` `server.js:58`.
- **Options:** `true` (trust all), `loopback` (only 127.0.0.1), `1` hop, custom function.
- **Decision:** `loopback` + `isLoopbackIp` covering `127.0.0.0/8` + `::1` + `::ffff:`. When `TRUST_PROXY=1` env set, we set `loopback`; else `false`. Verified: `XFF 9.9.9.9 →403`, `127.0.0.1→200`.
- **Consequences:** Behind non-loopback LB (e.g., Cloudflare) need `TRUST_PROXY=1` + `ALLOWED_IPS` CIDR — future: add `TRUST_PROXY="2"` or list.

## ADR-02 — Per-IP `loopback:${ip}` not global `"loopback"`
- **Context:** `server.js:182` `key = ip==="127.0.0.1"?"loopback":ip` shares one bucket for all localhost → one attacker `30 req` blocks all local users; also `ipStrikes` global block.
- **Decision:** `isLoopbackIp(ip) ? `loopback:${ip}` : ip` + `setInterval` prune 60s. Keeps localhost isolation but still groups per exact 127.x, not global.
- **Consequences:** Still per-IP, not per-user. Future: Redis + `X-Forwarded-For` validated.

## ADR-03 — Profanity `Set` dedup + collapsed + wildcard token
- **Context:** `server.js:92` `+= badWords.length` double-counted same word via `raw *` + `normalized` → strike inflation; `f**k` false-positive `fag`; `f u c k` bypass via `[^a-z]→space`.
- **Decision:** `normalizeForProfanity` strips zero-width, collapses `(.)\1{2,}`, `collapsed = norm.replace(/\s+/g,"")` catches `f u c k`; `tokenMatchesWithWildcard` splits raw on `[^a-z*]` and checks length-exact `*` wildcard; `scanAnswersForProfanity` returns `Set` (deduped).
- **Consequences:** `f**k` now correctly `Warning 1` not `fag+fuck` double; `f u c k` now blocked; strike 1 per distinct word per submission.

## ADR-04 — `strikeHint` removed
- **Context:** `server.js:315` `hint = Number(req.body.strikeHint); if(hint>state.strikes) state.strikes=hint` trusts client `localStorage` → attacker `POST {strikeHint:9999}` poisons `loopback` bucket.
- **Decision:** Comment out hint logic, ignore client hint completely. Client `public/app.js:970` now sends `{answers}` only (removed `strikeHint`). Server `readGuard`/`writeGuard` still per-form + `globalStrikeKey` mirror to prevent form-switch bypass, but not trusted.
- **Consequences:** Server restart resets strikes (still in-memory) — future: persist to Supabase `ip_strikes` table.

## ADR-05 — Payload `25kb` + field caps
- **Context:** `server.js:26` `express.json()` no limit → `title 50000` stored, `questions 100` → JSONB bloat, `GET /summary` OOM.
- **Decision:** `express.json({limit:"25kb"})` → `413`, plus `MAX_TITLE 200`, `MAX_DESC 500`, `MAX_LABEL 300`, `MAX_OPTION 100`, `MAX_QUESTIONS 50`, `MAX_OPTIONS 20` + `schema.sql:6` `CHECK` constraints. Chose 25kb ~ `50*100 + 200 + 500` worst-case ~5k + overhead.
- **Consequences:** Legit 50 Qs × 2000-char answers still under 25kb? 50*2000=100k >25k for responses → `POST /responses` with 50 text answers 2000 each would `413` — need `50*2000=100k` > limit, so limit is for form creation, not responses. Responses average 1 text 2000 + 9 radios small → ~3k <25k safe. Future: separate limits.

## ADR-06 — `asyncHandler` + error shape
- **Context:** `server.js:170` `validateFormPayload` threw `TypeError` inside `async` route → unhandled rejection → process crash.
- **Decision:** `asyncHandler(fn)` wrapper + `app.use((err,req,res,next)=>{ if(entity.parse.failed→400, entity.too.large→413) })` `server.js:680`.
- **Consequences:** No new dep `express-async-errors`; all routes wrapped.

## ADR-07 — `XSS` via `q.id` — `esc(q.id)` everywhere
- **Context:** `q.id` is `q${i+1}` server-generated safe, but if DB compromised via direct SQL, `id: 'x" onmouseover` breaks attribute.
- **Decision:** All `public/app.js:563` `name`, `data-*`, `id` interpolations now `esc(q.id)` + `CSS.escape` for counters. Defense in depth even though `esc` only `&<>"'`.
- **Consequences:** Slight overhead, safe for future `q.id` as UUID.

## ADR-08 — Block per-form → global mirror
- **Context:** `public/app.js:820` `strikes_${formId}` allows form-switch bypass.
- **Decision:** `readGuard` merges `perForm` + `globalStrikeKey` `strikes_global`, `writeGuard` mirrors to global, `closeBlockedOverlay` clears both + expired.
- **Consequences:** One form block now blocks all forms on same device — stricter but prevents bypass. Future: server per-IP is source of truth, client just UI.

## ADR-09 — Security headers `CSP` allow `cdn.jsdelivr.net`
- **Context:** `public/index.html:8` pulls Iconoir from CDN without `integrity` + no `CSP` → XSS via CDN compromise.
- **Decision:** `server.js:22` sets `CSP: default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'self'; ... frame-ancestors 'none'` + `X-Frame-Options DENY`.
- **Consequences:** Inline `<style>` in `index.html:9` needs `unsafe-inline` — debt: move to `style.css` to remove.

## ADR-10 — Schema `CHECK` vs app validation
- **Context:** `schema.sql:6` was `TEXT NOT NULL` no limits → direct `psql` insert bypasses app.
- **Decision:** Add `CHECK (char_length(title) 1-200)` etc. + `answers` `octet_length <20k`. Keep RLS `anon` `WITH CHECK(true)` for now but live DB actually blocks anon `401` — divergence documented.
- **Consequences:** Existing data that violates CHECK would block migration — verified 1 form passes.

## Links
- [[04-Bug-Fixes]] — code diffs
- [[03-Stress-Test-Report]] — proofs
- [[08-Roadmap]] — P0 debt still open (DRY BAD_WORDS, health probe, `ws` cleanup)
