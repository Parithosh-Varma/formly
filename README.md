# Formly — monochrome survey app

Dynamic form builder + anonymous response collection + visual results. Built with Express + Supabase Postgres. One-question-at-a-time (Typeform-style), monochrome Formly design, Iconoir icons — no emojis.

Live repo: https://github.com/Parithosh-Varma/formly

## Stack

- Node.js + Express (`server.js:1`) — forms CRUD, responses, summary, admin, Telegram notifications, IP allowlist + profanity guard
- Supabase Postgres — `forms` + `form_responses` with RLS (anon can only SELECT forms + INSERT responses)
- Vanilla JS frontend — `public/app.js:1` (draft autosave, step nav, grid jump, real-time profanity, block overlay)
- Telegram Bot API — notifies `TELEGRAM_CHAT_ID` on each valid response (`server.js:342`)

## Features

- **Builder at `/admin.html`** — create forms with dropdown / radio / checkbox / text (+ Other), copy link, results, clear, delete
- **Survey at `/`** — header only on step 0, progress bar, draft → localStorage, tab-switch warning (Notification + title flash), 15-min chime, white-screen → celebration video → success
- **Results at `/results.html`** — public charts (bar fills), owner-only text answers + raw data gated by IP
- **Profanity guard** — 27-word list, leet-normalized, per-word counting. Client live warning + server authoritative. At 3 total bad words → 5-min IP block with fullscreen video (`https://cdn.vlipsy.com/clips/hElgqOJl/360p-watermark.mp4`)
- **Strikes persisted** — `localStorage` `strikes_<formId>` synced via `strikeHint` so server restarts don't reset warnings
- **Grid nav** — top bar with Back / Next / numbered grid to jump to any question (validates required on forward jump)
- **Logo** — `public/logo.png` (from `CONFIG/277201506.png`) in header + topnav + favicon
- **No emojis** — Iconoir CSS everywhere (`iconoir-*`)

## Quick start

```bash
npm install
cp .env.example .env   # fill SUPABASE_URL / keys / TELEGRAM_BOT_TOKEN
npm start              # http://localhost:3000
```

`schema.sql` — run in Supabase SQL editor to create tables + RLS.

## Env

See `.env.example`. `ALLOWED_IPS` gates `/api/forms/:id/responses` (raw data) + admin routes. Loopback always allowed.

## API

- `GET /api/forms` — list
- `POST /api/forms` — create (IP-gated)
- `GET /api/forms/:id` — form + questions
- `POST /api/forms/:id/responses` — submit `{answers, strikeHint?}`
- `GET /api/forms/:id/summary` — public aggregates
- `GET /api/forms/:id/responses` — IP-gated raw + text answers
- `DELETE /api/forms/:id` / `DELETE /api/forms/:id/responses` — IP-gated
