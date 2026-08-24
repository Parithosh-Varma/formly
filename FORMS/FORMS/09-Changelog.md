---
tags: [changelog, git, diff]
---

# 09 — Changelog

## 2026-08-23 — Stress test + harden (Muse Spark)

### `server.js:1` — 577→749 lines
- `14` `asyncHandler` + `22` `express.json({limit:"25kb"})` + `22` security headers + `30` `trust proxy loopback`
- `77` `BAD_WORDS` `i` flag + `95` `normalizeForProfanity` zero-width + `tokenMatchesWithWildcard` + `Scan` `Set` dedup
- `174` `ipStrikes` `178` `rateLimitMap` `loopback:${ip}` + `setInterval` prune
- `230` `validateFormPayload` 200/500/300/100/50/20 caps + null guard + `__proto__` block
- `304` `isOtherValue` inner 500 + total 2000
- `318` `validateAnswers` extra keys + dup + `hasOwn` + `__proto__`
- `680` `entity.parse.failed 400` `entity.too.large 413`
- `530` `notifyTelegram` concurrency 5 + `AbortSignal` fallback
- `570` `buildSummary` `hasOwn` + `isOtherValue` strict + `limit 5000/1000`
- Removed `strikeHint` trust `320`

### `public/app.js:1` — 789→1180 lines
- `10` `initTheme` already, `90` `BAD_WORDS` + `normalizeClient` zero-width + `tokenMatchesWithWildcard` + `countClientProfanity` `Set`
- `273` `draftDismissKey()` defined, `820` `globalStrikeKey` merge, `1078` `closeBlockedOverlay` clears both
- `181` `isSubmitting` + `488` `advanceOrSubmit` guard + `requestSubmit` fallback, `950` `handleSubmit` `isSubmitting` guard
- `135` per-field `_profanityTimer`, `249` `enterSurvey` empty check, `203` `await load` + `encodeURIComponent`, `212` `baseTitle` after set, `436` `backBtn showStep`, `764` `updateCharCounter` `otherKey`

### `public/admin.js:1` — 559 lines
- `116` `esc(String(f.id))` + `encodeURIComponent` href `123`, `136` `safeId` for all fetches, `159` export `appendChild` + `sanitize` + `act` returns `bool` `190` delete only if success, `457` import `file.size>200KB` + length caps

### `schema.sql:1` — 45→60 lines
- `6` `CHECK char_length` 1-200, 500, `jsonb_array_length 1-50`, `10` `octet_length <20k`

### `public/index.html` / `style.css` — no change except CSP via `server.js:22`

### Git
```bash
git diff --stat
#  server.js          | 180 +++-
#  public/app.js      | 390 +++-
#  public/admin.js    |  45 +-
#  schema.sql         |  15 +-
#  FORMS/FORMS/*      | 9 new vault files
```

### Verification
- `/tmp/verify_fix.py` 19 checks `PASS`
- `/tmp/final_suite2.py` 12/12 `PASS` + headers `DENY` `nosniff` `CSP`
- `curl -I` `X-Frame-Options: DENY` `Content-Security-Policy: default-src 'self'...` `200`
- `node --check server.js` ok + live profanity isolated 3×`400` then `201` clean, 3 strikes → `403`

See `server.js.bak` for pre-fix snapshot.

## 2026-08-23 — Initial `todo.md:1` Gap to Success generated
- Why they win (Distribution/Trust/Ecosystem), P0/P1/P2 roadmap, Tech Debt 8 items, Design/UX 6, Business 6 — see [[08-Roadmap]]

## Links
- [[04-Bug-Fixes]] — diff details
- [[03-Stress-Test-Report]] — proofs
- Git: `git log --oneline -10` + `git show HEAD --stat`
