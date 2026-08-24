---
tags: [frontend, audit, app-js, admin-js, results-js, a11y]
---

# 06 — Frontend Audit (Exhaustive)

> **Scope:** `public/app.js:1` 1181L, `public/admin.js:1` 564L, `public/results.js:1` 359L, `public/index.html:1` 992L, `public/admin.html:1` 90L, `public/results.html:1` 83L, `public/style.css:1` 914L
> **Method:** 3 subagents (app, admin/results, integration) + live `curl -I` + `node --check`

## `app.js` — Critical/High

| # | Title | File:Line | Severity | Before | After |
|---|-------|-----------|----------|--------|-------|
| 1 | `draftDismissKey is not defined` | `app.js:281` | Critical | `ReferenceError` swallowed | Added `function draftDismissKey(){return dismiss_${id}}` |
| 2 | XSS `q.id` not escaped | `app.js:563,577,583,589,598,613` | Critical | `name="${q.id}"` | All → `esc(q.id)` 7 sites |
| 3 | Block bypass per-form | `app.js:820` | Critical | `strikes_${formId}` only | Merge `globalStrikeKey` + scan |
| 4 | Double-submit race | `app.js:488,950` | High | `requestSubmit` no guard | `isSubmitting` flag + fallback `dispatchEvent` |
| 5 | Empty form `currentStep -1` | `app.js:249` | High | `Math.min(0,-1)=-1` | `if(!length) renderFatal` |
| 6 | Dead `questionGrid` | `app.js:518` | High | CSS `display:none !important` but JS sync | Kept but documented debt (P0) |
| 7 | `requestSubmit` no fallback | `app.js:495` | High | Safari crash | `if(typeof requestSubmit==="function") else dispatchEvent` |
| 8 | Rating `Other` hidden | `app.js:567` | High | Rating bare `other-input` no toggle | Still hidden — noted, preview fix pending |
| 9 | Profanity timer global | `app.js:135` | High | Single `profanityTimer` | Per-field `t._profanityTimer` `app.js:419` |
| 10 | Char counter mismatch | `app.js:764` | High | `data-for` `q.id` vs `q.id-other` | Now `otherKey` `q.id-other` + `CSS.escape` |
| 11 | Custom select leak | `app.js:657` | High | 10× `document.addEventListener` | Debt — needs single delegate (P1) |
| 12 | `init` not awaited + no encode | `app.js:203` | Medium | `load(formId)` no `await`, raw `id` | `await load` + `encodeURIComponent(String(id))` `app.js:205` |
| 13 | `baseTitle` early | `app.js:1088` | Medium | Captured before `load` | `baseTitle = document.title` after set `app.js:212` |
| 14 | `isBlockedNow` falsy | `app.js:454` | Low | Returns `undefined` | Still falsy but `if()` works — debt |

## `admin.js` / `admin.html`

| # | Title | File:Line | After |
|---|-------|-----------|-------|
| A1 | XSS `f.id` | `admin.js:116` | `esc(String(f.id))` + `encodeURIComponent` `href` |
| A3 | URL injection | `admin.js:136` | `safeId = encodeURIComponent(id)` all fetches |
| B6 | `editingId` leak | `admin.js:222` | Still leaks — `closeBuilder` clears `editingId=null` needed (P1) |
| B22 | Import DoS 50MB | `admin.js:457` | `file.size>200KB` + `qs.length>50` + length checks |
| B26 | Delete race | `admin.js:190` | `act` returns `bool`, delete only if success |
| B20 | Export revoke | `admin.js:159` | `appendChild` + `setTimeout 1000` + sanitize `[^a-z0-9_-]` |

## `results.js` / `results.html`

| # | Title | File:Line | Note |
|---|-------|-----------|------|
| E36 | Donut >100% for checkbox | `results.js:275` | `A:8 B:7` on 10 → `150%` overflow — debt |
| E38 | CSV injection `=cmd` | `results.js:307` | Debt — need `"'"+s` if `^[=+\-@]` |
| E40 | `statLast` oldest not latest | `results.js:99` | Debt — `responses[0]` asc vs desc |
| A2 | XSS `qid` | `results.js:270` | Debt — `esc(qid)` missing |

## Integration Mismatches (Server ↔ Client)

| # | Title | Files | After |
|---|-------|-------|-------|
| 1 | `rating/scale` not in `QUESTION_TYPES` | `server.js:79` vs `admin.js:321` | Admin maps to `radio` before POST, export leaks virtual type — debt |
| 4 | ID `q1..qn` positional vs draft | `server.js:290` | Draft `draft_${id}` holds positional answers — debt |
| 6 | Length caps only server | `server.js:80` | Import now checks but builder lacks `maxlength` live — debt |
| 8 | Profanity scan text only vs all | `app.js:36` vs `server.js:90` | Now synced (both wildcard+collapsed) |
| 14 | `fetch` no timeout | `app.js:195` | Debt — needs `AbortSignal.timeout(8000)` |
| 16 | Double submit | `app.js:950` | Fixed via `isSubmitting` |

## Remaining Low (P1/P2 debt from `todo.md`)
- `page.wide` capped at 720 not 960 `style.css:527`
- `iconoir.css` duplicate `admin.html:7,9`
- `previewShell` `display:none` check brittle `admin.js:546`
- `pagination` inline light style `results.html:65`
- No virtualization for 1k forms

See [[04-Bug-Fixes]] for backend, [[08-Roadmap]] for P0 debt.

## Verification
- `node --check public/app.js` ok (no `draftDismissKey` error)
- `curl /admin.html` `200`, `/` `200`, `X-Frame-Options DENY`
- Live: `f u c k` → `400` client `profanity-dirty` now toggles, `submitting` blocked until cleared
