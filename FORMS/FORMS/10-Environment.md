---
tags: [env, supabase, telegram, security]
---

# 10 — Environment

> **Source of truth:** `~/Downloads/CODING/global-env.env` — `constant:globalEnvVault` (sectioned per project)
> Never ask user for keys — `grep -A5 "# PROJECT:" ~/Downloads/CODING/global-env.env`

## Project `.env` (`/Users/varma/Downloads/CODING/FORM/.env`)
```
SUPABASE_URL=https://fcoupvxoniboruuqyksl.supabase.co
SUPABASE_KEY=sb_publishable_W6r_HISyPBu65S5NgeG0Bw_bM2I4wDY   # anon / publishable
SUPABASE_SERVICE_ROLE_KEY=sb_secret_ll_YjhlbAa1qZZgG0q-xgg_1U31ddmh # service_role, bypasses RLS
TELEGRAM_BOT_TOKEN=8917271800:AAFG48SPojNrxDTnpfMtkhkhPVajg_5j3OU
TELEGRAM_CHAT_ID=7587094510
ALLOWED_IPS=122.171.17.98,127.0.0.1,::1
TRUST_PROXY=0
PORT=3000
```
- `.env` is `644` in repo root, gitignored `..gitignore:2` (`*.env`) but `.env` is 340B on disk — Docker layer leak risk (see [[02-Architecture]]).
- `.env.example` `246B` has same keys with placeholders `sb_publishable_...` `sb_secret_...` `891727...` `758709...` — example leaks real prefix `122.171.17.98`.

## Supabase Project `fcoupvxoniboruuqyksl`
- **URL:** `https://fcoupvxoniboruuqyksl.supabase.co`
- **Region:** not `eu-central-1` (needed for DPA) — P1 Trust todo.
- **Tables:** `forms` + `form_responses` `schema.sql:6` + `idx_form_responses_form(form_id)`.
- **RLS:** `forms` `SELECT anon` true, `form_responses` `INSERT anon WITH CHECK(true)` `schema.sql:39` — live test `fetch anon POST /rest/v1/form_responses` → `401 42501` (blocks) vs schema allows — divergence noted [[03-Stress-Test-Report#Direct anon RLS]].
- **Keys:** `sb_publishable_` vs `sb_secret_` naming confusion `server.js:19` — no startup assert `if(key.startsWith('sb_secret')) throw`.
- **Realtime:** `ws` transport `server.js:5` unused — `ws@8.21.3` adds CVE surface.

## Telegram
- `notifyTelegram` `server.js:530` fires on every `201` response, `signal timeout 8s`, concurrency `5`, `trunc(formTitle 60)` `q.label 80` `val 300`, `disable_web_page_preview true`.
- Token in `fetch https://api.telegram.org/bot${token}/sendMessage` URL — if client logs URL, leaks to `console.error` `server.js:530` (only `err.message` logged, safe).

## Load Env
```bash
source ~/bin/load-env.zsh
# or
source ~/Downloads/CODING/global-env.env
grep -A5 "# PROJECT: FORM" ~/Downloads/CODING/global-env.env
cp ~/Downloads/CODING/global-env.env .env  # then edit ALLOWED_IPS
npm start  # http://localhost:3000
```

*Last updated: 2026-08-24*

## Security Notes
- `.env` is gitignored but `FORMS/FORMS/.obsidian` vault is `644` — never copy `.env` into vault (we didn't).
- `ALLOWED_IPS` empty → `Set{}` → only loopback passes `server.js:48` — starves admin on remote.
- `TRUST_PROXY` `0` vs `1` → `XFF` spoof vs local proxy open — see `ADR-01` [[07-Decisions]].

## Links
- [[01-Context]] — stack
- [[02-Architecture]] — `createClient` + `supabaseAdmin` fallback
- `todo.md:1` — `GROQ_API_KEY` already in `global-env.env` for AI generate P2

*Last verified: 2026-08-24*
