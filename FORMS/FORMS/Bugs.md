---
tags: [bug, tracker, live]
aliases: [Bugs Tracker]
---

# Bugs — Live Tracker

> Mirrors `server.js:1` + `public/app.js:1` + `public/admin.js:1` + `public/results.js:1`. Source: subagent audits + live `curl`. Fixed → move to [[04-Bug-Fixes]] and check here.

## 🔴 Critical — Fix now
- [x] `description={}` crash `server.js:256` `TypeError trim` → `400` — fixed `getDescription()` 2026-08-23
- [x] `questions:[null]` crash `server.js:170` → `400` must be object
- [x] `summary` null deref `server.js:461` → `503` fallback
- [x] `draftDismissKey is not defined` `app.js:273` → defined `dismiss_${id}`
- [x] XSS `q.id` `app.js:563` → `esc(q.id)` 7 sites
- [x] Block bypass per-form `app.js:820` → `globalStrikeKey` mirror

## 🟠 High — Next
- [x] `title 5000` → `400` cap 200 `server.js:163`
- [x] `questions 100` → `400` cap 50
- [x] Trim dedup `[" hello","hello"]` → `400` `needs at least 2 unique`
- [x] Extra keys `q999` → `400` `Unexpected answer key`
- [x] Dup checkbox `["A","A"]` → `400` `Duplicate selections`
- [x] `f u c k` bypass → `400` collapsed
- [x] `f**k` bypass → `400` wildcard token
- [x] `Other` 1800 vs 500 → `400`
- [x] `strikeHint` poisoning `server.js:315` → ignored
- [x] Dead `questionGrid` CSS `display:none !important` `index.html:745` — debt, not fixed (hidden intentionally)
- [x] `requestSubmit` no fallback → `dispatchEvent` polyfill `app.js:496`
- [ ] `empty form` `currentStep -1` → `renderFatal` added but `showStep(-1)` still debt
- [ ] `custom select leak` 10× `document` listeners `app.js:657` — debt P1

## 🟡 Medium — P1
- [x] Rate 429 after 30 `server.js:178` verified clean burst `30+5`
- [x] `X-Frame-Options DENY` `CSP` `server.js:22`
- [x] `ws` unused `server.js:5` — still imported (debt)
- [ ] `page.wide` capped at 720 not 960 `style.css:527` — `width:min(720px)` vs `max-width:960px`
- [ ] `iconoir.css` duplicate `admin.html:7,9`
- [ ] `previewShell` `display==="none"` brittle `admin.js:393`
- [ ] Donut >100% for checkbox `results.js:275`
- [ ] CSV injection `=cmd` `results.js:307`
- [ ] `statLast` oldest not latest `results.js:99`
- [ ] Import DoS `admin.js:457` fixed `file.size>200KB` but `export` filename `[^a-z0-9_-]` sanitize still partial

## 🟢 Low — P2
- [ ] `isBlockedNow` returns `undefined` not bool `app.js:454`
- [ ] `titleFlasher` interval leak `app.js:1082`
- [ ] `beforeunload` deprecated `e.returnValue` `app.js:179`
- [ ] `restartForm` clears `char-counter` `app.js:478` `data-for!=="ta"` logic odd

## How to use
- Check `[x]` only after `node --check` + `curl` `400` + `app.js?v=??` hard refresh
- Dataview: 
```dataview
TABLE WITHOUT ID file, severity, status
FROM #bug
WHERE !completed
SORT severity DESC
```

See [[04-Bug-Fixes]] for diffs, [[03-Stress-Test-Report]] for proofs, [[08-Roadmap]] for P0 debt.

*Vault: `FORMS/FORMS/.obsidian/workspace.json` — Graph shows `Bugs.md ↔ Index.md ↔ 04-Bug-Fixes.md`.*
