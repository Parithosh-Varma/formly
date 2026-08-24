---
tags: [context, overview, formly]
aliases: [Context]
---

# 01 — Context

## What is Formly
- **Name:** Formly (monochrome survey app) — `README.md:1`
- **Purpose:** Dynamic form builder + anonymous response collection + visual results. One-question-at-a-time (Typeform-style), monochrome Formly design, Iconoir icons — no emojis.
- **Live repo:** https://github.com/Parithosh-Varma/formly
- **Stack:** Node.js + Express `server.js:1`, Supabase Postgres `schema.sql:1`, Vanilla JS `public/app.js:1`, Telegram Bot API `server.js:359`
- **Last updated:** 2026-08-24 (vault sync)

## Features
- Builder at `/admin.html` — dropdown / radio / checkbox / text (+ Other), copy link, results, clear, delete
- Survey at `/` — header only on step 0, progress bar, draft → `localStorage`, tab-switch warning (Notification + title flash), 15-min chime, white-screen → video → success
- Results at `/results.html` — public charts (bar fills), owner-only text answers + raw data gated by IP
- Profanity guard — 27-word list `server.js:58`, leet-normalized, per-word counting. Client live warning + server authoritative. At 3 total bad words → 5-min IP block with fullscreen video `https://cdn.vlipsy.com/clips/hElgqOJl/360p-watermark.mp4`
- Strikes persisted — `localStorage` `strikes_<formId>` synced via `strikeHint` (now removed, see [[07-Decisions#ADR-04 — strikeHint removed]])
- Grid nav — top bar with Back / Next / numbered grid to jump (validates required on forward jump) — now hidden via CSS `index.html:745` but JS still maintains
- Logo — `public/logo.png` (from `CONFIG/277201506.png`) in header + topnav + favicon
- No emojis — Iconoir CSS everywhere `iconoir-*`

## Repo Layout
```
FORM/
├─ server.js          # 748 lines, Express + Supabase, 7 routes
├─ schema.sql         # 45 lines, forms + form_responses + RLS (CHECK constraints in app only)
├─ public/
│  ├─ index.html      # ~995 lines, survey shell + sticky-progress + blockedOverlay
│  ├─ app.js          # 1186 lines, survey logic (was 789, now 1186)
│  ├─ admin.html      # ~90 lines, builder
│  ├─ admin.js        # 573 lines, builder + drag + import/export
│  ├─ results.js      # 359 lines, charts + CSV
│  ├─ results.html    # ~83 lines
│  └─ style.css       # 955 lines, :root + dark mode + toast + modal
├─ .env               # SUPABASE_URL=https://fcoupvxoniboruuqyksl.supabase.co
├─ .env.example       # 8 vars
├─ package.json       # express 4.19.2, supabase-js 2.45.0, ws 8.21.3
├─ todo.md            # Gap to Success (P0/P1/P2 + Tech Debt + Design + Business) — see [[08-Roadmap]]
├─ server.js.bak      # 577 lines, pre-harden snapshot
└─ FORMS/FORMS/       # ← THIS VAULT
   ├─ .obsidian/
   ├─ Index.md
   └─ 01-Context.md … 10-Environment.md
```

## Environment Vault
- Single source: `~/Downloads/CODING/global-env.env` `constant:globalEnvVault` — see [[10-Environment]]
- Load: `source ~/bin/load-env.zsh` or `source ~/Downloads/CODING/global-env.env`
- Project `.env` is copy of vault section + `ALLOWED_IPS=122.171.17.98,127.0.0.1,::1` `TRUST_PROXY=0` `PORT=3000`

## Key Files with Line Refs
- Forms CRUD: `server.js:373` `POST /api/forms` (IP-gated)
- Responses: `server.js:413` `POST /api/forms/:id/responses` (profanity + rate)
- Summary: `server.js:554` `GET /api/forms/:id/summary` (public aggregates, `limit 5000`)
- Raw: `server.js:605` `GET /api/forms/:id/responses` (IP-gated, `limit 1000`)
- Admin: `server.js:667` `GET /api/admin/forms`
- Delete: `server.js:686` `DELETE /api/forms/:id` + `703` `DELETE /responses`
- Profanity: `server.js:90` `BAD_WORDS` + `normalizeForProfanity:106`
- Rate: `server.js:179` `RATE_LIMIT_MAX 30/60s` + `ipStrikes:173`

## Links
- [[02-Architecture]] — deep dive per file
- [[03-Stress-Test-Report]] — how we broke it
- [[10-Environment]] — keys & Supabase project `fcoupvxoniboruuqyksl`
