---
tags: [stress-test, audit, proof, critical]
aliases: [Stress Report]
---

# 03 — Stress Test Report

> **Date:** 2026-08-23 | **Agents:** 5 parallel subagents (general, very thorough) | **Live:** 50+ `curl` + Python `requests` against `http://127.0.0.1:3000` + direct Supabase `sb_publishable_W6r_HISyPBu65S5NgeG0Bw_bM2I4wDY` vs `sb_secret_ll_YjhlbAa1qZZgG0q-xgg_1U31ddmh`

## Method
- `default.task` with `subagent_type: general` — prompts:
  - `security` — IP bypass, RLS, Telegram SSRF
  - `validation` — `validateFormPayload`, `normalizeQuestions`, `MAX_TEXT_LENGTH` drift
  - `concurrency` — `Map` restart loss, `loopback` collision, `strikeHint` trust
  - `frontend` — `app.js` draft/theme/progress/XSS
  - `infra` — `express.json` limit, `ws` unused, `.env` leak
- Then live Python: `stress2.py`, `safe_test.py`, `proxy_test.py`, `/tmp/verify_fix.py`

## Findings Summary (deduplicated)
| # | Title | File:Line | Severity | Live Proof |
|---|-------|-----------|----------|------------|
| 1 | IP bypass `X-Forwarded-For: 127.0.0.1` when `TRUST_PROXY=1` | `server.js:28,37-50` | Critical | `curl -H XFF:127.0.0.1 /api/admin/forms →200` (vs `9.9.9.9→403`) |
| 2 | Loopback open when behind nginx | `server.js:45` | Critical | All remote → `127.0.0.1` → `200` |
| 3 | Crash `description={}` | `server.js:256` | Critical | `POST {"description":{}}` → `Empty reply` + `TypeError trim` `server.js:256:49` |
| 4 | Crash `questions:[null]` | `server.js:170` | Critical | `POST [null]` → `TypeError label` `170:18` |
| 5 | Crash `summary` null deref | `server.js:461` | Critical | Unset `SERVICE_ROLE_KEY` → `GET /summary` → `TypeError from` |
| 6 | No `title` length limit | `server.js:163` | High | `POST title 5000→201` (now `400`) |
| 7 | `questions` unbounded | `server.js:165` | High | `POST 100 Qs →201` (now `400`) |
| 8 | Trim dedup mismatch `[" hello","hello"]` | `server.js:177 vs 202` | High | `POST →201` stored `["hello"]` 1-option violates ≥2 |
| 9 | Extra keys `q999` stored | `server.js:214` | High | `POST answers+extra →201` `id=230` |
| 10 | Checkbox dup `["A","A","A"]` vote stuffing | `server.js:233` | Medium | `POST dup →201` `id=231` |
| 11 | Profanity `f u c k` bypass | `server.js:74` | High | `POST "f u c k you" →201` `id=232` |
| 12 | Profanity `f**k` bypass | `server.js:92` | High | `POST "f**k" →201` `id=233` |
| 13 | `Other` 1800 vs 500 | `server.js:208` | Medium | `Other: x*1800 →201` (now `400`) |
| 14 | `strikeHint` poisoning | `server.js:315` | High | `POST strikeHint 9999 →201` set `strikes=9999` |
| 15 | Rate 429 after 30 | `server.js:132` | Medium | Clean burst `30×201 +5×429` (after restart) |
| 16 | Unbounded fetch OOM | `server.js:460,487` | Critical | `GET /summary` loads all `5000` rows |
| 17 | `ws` unused | `server.js:5` | Low | `createClient realtime transport` never `channel` |
| 18 | Direct anon RLS | `schema.sql:39` vs live | Medium | `fetch anon` `POST /rest/v1/form_responses` → `401 42501` (live blocks, schema allows) |

## Live Logs (excerpts)
```
Survey server running at http://localhost:3000
TypeError: (req.body.description || "").trim is not a function  server.js:256:49
TypeError: Cannot read properties of null (reading 'label')  server.js:170:18
TypeError: Cannot read properties of null (reading 'from')  server.js:461:6
Profanity from 127.0.0.1 (+1, total 1): fuck
GET /api/admin/forms XFF 127.0.0.1 →200  XFF 9.9.9.9 →403  (TRUST_PROXY=1)
```

## Frontend Findings (highlights, see [[06-Frontend-Audit]])
- `draftDismissKey is not defined` `app.js:273` Critical
- XSS `q.id` not escaped `app.js:563` Critical
- Block bypass per-form `app.js:820` Critical
- Double-submit `app.js:495,950` High
- Dead `questionGrid` `app.js:518` High
- `requestSubmit` no fallback `app.js:495` High

## Verification After Fixes
- `1 description={} →400` `description must be a string.` ✅
- `2 null q →400` `must be an object.` ✅
- `3 summary without key →503` (was crash) ✅
- `6 huge title 5000 →400` `title must be at most 200` ✅
- `8 dup edge →400` `needs at least 2 unique` ✅
- `9 extra key →400` `Unexpected answer key` ✅
- `10 dup checkbox →400` `Duplicate selections` ✅
- `11 f u c k →400` `Warning 1 of 3` ✅ (was 201)
- `12 f**k →400` (was 201, false `fag` fixed) ✅
- `14 strikeHint 9999 →201` then next `201` (ignored) ✅
- `429` clean burst `30+5` ✅
- Headers `X-Frame-Options DENY` `CSP` present ✅

See [[04-Bug-Fixes]] for one-by-one diffs.
