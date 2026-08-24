---
tags: [bugfix, fix, verified, file-line]
aliases: [Fixes]
---

# 04 — Bug Fixes (One-by-One)

> Each bug: `file:line` before → fix diff → verification. Order = fix sequence 2026-08-23.

## Batch 1 — Crash DoS `server.js:26,169,256,461`
**Fix:** `asyncHandler` `server.js:27` + `express.json limit 25kb` `server.js:31` + `isLoopbackIp` + `getDescription()` + `validateFormPayload` null guard.
```js
// before
app.use(express.json());
app.post("/api/forms", requireAllowedIp, async (req,res)=>{ description: (req.body.description||"").trim() })
body.questions.forEach((q,i)=>{ if(typeof q.label!=="string") })

// after
function asyncHandler(fn){ return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next); }
app.use(express.json({limit:"25kb"}));
function getDescription(body){ if(body.description===undefined) return ""; if(typeof body.description!=="string") return null; return body.description.trim(); }
body.questions.forEach((q,i)=>{ if(!q||typeof q!=="object") errors.push(`questions[${i}] must be an object.`) })
app.post("/api/forms", requireAllowedIp, asyncHandler(async (req,res)=>{...}))
app.get("/api/forms/:id/summary", asyncHandler(async (req,res)=>{ const client=supabaseAdmin||supabase; if(!client) return 503; }))

app.use((err,req,res,next)=>{ if(err.type==="entity.parse.failed") return 400 Invalid JSON; if(err.type==="entity.too.large") return 413; })
```
**Verify:** `curl POST {"description":{}} →400` (was `Empty reply`), `POST [null] →400` (was crash), `GET /summary` without key → `503` (was `TypeError`).

## Batch 2 — Limits `server.js:69-75`
```js
const MAX_TITLE_LENGTH=200, MAX_DESCRIPTION_LENGTH=500, MAX_LABEL_LENGTH=300, MAX_OPTION_LENGTH=100, MAX_QUESTIONS=50, MAX_OPTIONS_PER_QUESTION=20;
if(body.title.trim().length>200) errors...
if(desc.length>500) ...
if(body.questions.length>50) ...
if(trimmedOpts.length>20) ...
if(o.length>100) ...
```
`schema.sql:6` added `CHECK (char_length(title) 1-200)` etc. `413` for `POST` huge `50*300+100*100` → `Payload too large`.

## Batch 3 — Validation `server.js:177,202,214`
- Dedup: validate on `trimmedOpts` unique `Set`, error `needs at least 2 unique`
- Extra keys: `allowedIds = Set(questions.map(q=>q.id)); for(k in answers) if(!allowedIds.has(k)) errors.push("Unexpected")`
- Checkbox dup: `if(new Set(val).size!==val.length) errors.push("Duplicate")`
- Other: `isOtherValue` `server.js:304` now `inner.length>500 false` + `val.length>2000 false`, `buildSummary:590` strict `hasOwn` + `isOtherValue`
**Verify:** `POST [" hello","hello"] →400`, `POST extra q999 →400`, `POST ["A","A"] →400`, `Other: x*600 →400`.

## Batch 4 — Profanity `server.js:90-171`
```js
BAD_WORD_PATTERNS = BAD_WORDS.map(w=>({regex:new RegExp(`\\b${w}\\w{0,5}\\b`,"i")}))
normalizeForProfanity: +zero-width strip + (.)\1{2,} collapse + trim
tokenMatchesWithWildcard(token,word){ if(len!==len) false; if(!* ) false; for i if(token[i]!=="*"&&token[i]!==word[i]) false; return true; }
scanAnswersForProfanity: normalized+collapsed test + tokens split /[^a-z*]+/ + Set deduped
```
**Verify:** `f u c k` collapsed `fuck` → `400` (was 201), `f**k` token `f**k` length4 matches `fuck` → `400` (was 201, previous false `fag` fixed), zero-width `f\u200Buck` → `400`.

## Batch 5 — IP/Rate `server.js:31,181,320`
```js
if(TRUST_PROXY==="1") app.set("trust proxy","loopback"); else false;
function isLoopbackIp(ip){ if(ip==="::1"||"127.0.0.1"||ip.startsWith("127.")) true }
checkRateLimit: key = isLoopbackIp(ip)?`loopback:${ip}`:ip;
getIpState same; setInterval prune 60s;
POST /responses: checkRateLimit BEFORE validateAnswers; removed strikeHint trust (commented `// hint = Number(...)`)
```
**Verify:** `TRUST_PROXY=1` `XFF 127.0.0.1→200` `9.9.9.9→403` correct, clean burst `30×201+5×429`, `strikeHint 9999` ignored → next `201`.

## Batch 6 — Frontend `public/app.js:1` `public/admin.js:1`
- `app.js:105` `normalizeClient` zero-width+collapse, `tokenMatchesWithWildcard`, `clientHasBadWord` norm+collapsed+wildcard, `countClientProfanity:153` `Set`
- `app.js:181` `isSubmitting` + `advanceOrSubmit` guard + `requestSubmit` fallback
- `app.js:273` `draftDismissKey()` defined, `app.js:563` all `q.id` → `esc(q.id)`, `data-rating-for`, `data-scale-for`, `data-custom-for`, `data-other-for`, `id="sec-"`, `name=`
- `app.js:820` `strikeKey` → `globalStrikeKey` merge, `closeBlockedOverlay` clears both + expired
- `app.js:135` per-field `_profanityTimer`, `app.js:249` `enterSurvey` `if(!length) renderFatal`, `app.js:203` `await load` + `encodeURIComponent`, `app.js:212` `baseTitle=...`
- `app.js:436` `backBtn` `showStep`, `app.js:764` `updateCharCounter` `otherKey` fallback
- `admin.js:116` `esc(String(f.id))` + `encodeURIComponent`, `admin.js:136` `safeId`, export `appendChild` + `setTimeout revoke` + sanitize, `act` returns `bool`, delete only if success, import `file.size>200KB` + length checks

## Batch 7 — Security `server.js:33` `schema.sql:6`
```js
app.use((req,res,next)=>{ res.setHeader("X-Content-Type-Options","nosniff"); X-Frame-Options DENY; CSP default-src 'self' ...; next(); })
schema.sql: CHECK char_length + jsonb_array_length + octet_length
```
**Verify:** `curl -I` shows `X-Frame-Options: DENY` `CSP default-src 'self'...` (`/tmp/final_check.log`).

## Tests Run
- `/tmp/verify_fix.py` 19 checks `PASS`
- `/tmp/final_suite2.py` 12/12 `PASS` + headers
- `node --check server.js` ok + `curl -I` + live profanity isolated 3×`400` then `201` clean.

## Links
- [[03-Stress-Test-Report]] — before
- [[Bugs]] — remaining Low bugs
- [[07-Decisions]] — why `loopback` not `true`, why dedup `Set`
