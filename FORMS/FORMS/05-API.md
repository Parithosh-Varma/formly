---
tags: [api, reference, curl, contract]
---

# 05 — API Reference

> Base: `http://localhost:3000` | Supabase `https://fcoupvxoniboruuqyksl.supabase.co` | All `POST` `Content-Type: application/json` `limit 25kb`

## Forms

### `POST /api/forms` — create (IP-gated `requireAllowedIp` `server.js:58`)
```bash
curl -X POST http://localhost:3000/api/forms \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Student AI Survey",        # 1-200 chars
    "description":"Anon - takes a minute", # 0-500 chars, optional
    "questions":[
      {"label":"How often AI?","type":"radio","options":["Daily","Weekly"],"required":true},
      {"label":"Explain","type":"text","required":false},
      {"label":"Use for?","type":"checkbox","options":["Explain","Draft"],"allowOther":true}
    ]                                   # 1-50 items, label 1-300, options 2-20 × 100 chars
  }'
# 201 {success:true, form:{id, title, description, questions:[{id:"q1",type,label,options,required,allowOther}], created_at}}
# 400 {success:false, message:"Validation failed.", errors:["title must be at most 200..."]}
# 403 {success:false, message:"Access restricted."} if IP not in ALLOWED_IPS and not loopback
# 413 {success:false, message:"Payload too large."}
```

### `GET /api/forms` — list (public, `limit 100` `server.js:397`)
```bash
curl http://localhost:3000/api/forms
# 200 {success:true, forms:[{id, title, description, created_at}]}
```

### `GET /api/forms/:id` — one (public)
```bash
curl http://localhost:3000/api/forms/1
# 200 {success:true, form:{id,title,description,questions,created_at}}
# 400 Invalid form id. (non-int or <=0)
# 404 Form not found.
```

## Responses

### `POST /api/forms/:id/responses` — submit (rate `30/60s` per IP `server.js:178` + profanity `STRIKE_LIMIT 3` `server.js:174`)
```bash
curl -X POST http://localhost:3000/api/forms/1/responses \
  -H "Content-Type: application/json" \
  -d '{"answers":{"q1":"Daily","q2":["Explain"],"q10":"hello"}}'
# 201 {success:true, message:"Thank you!...", response:{id, form_id, answers, submitted_at}}
# 400 Validation failed. {errors:["\"How often\" requires an answer.", "Duplicate selections...","Unexpected answer key: q999"]}
# 400 warning {success:false, warning:true, strike:1, wordCount:1, message:"Please keep... Warning 1 of 3."}
# 403 blocked {success:false, blocked:true, message:"Too many violations. Your IP is blocked for 5 minutes."}
# 429 {success:false, message:"Too many requests. Please slow down."}
```
**Profanity:** `normalizeForProfanity` + `collapsed` + `tokenMatchesWithWildcard` catches `f u c k`, `f**k`, `f*ck`, zero-width. `Other: text` inner max `500` + total `2000`.

### `GET /api/forms/:id/summary` — public aggregates (`limit 5000` `server.js:625`)
```bash
curl http://localhost:3000/api/forms/1/summary
# 200 {success:true, total: 253, summary:{
#   q1:{label, type:"radio", counts:{Daily:250, Weekly:1}},
#   q2:{label, type:"checkbox", counts:{Explain:139, Other:0}},
#   q10:{label, type:"text", answers:[], textCount:253}
# }}
```

### `GET /api/forms/:id/responses` — raw + text answers (IP-gated `server.js:474`, `limit 1000`)
```bash
curl http://localhost:3000/api/forms/1/responses
# 200 {success:true, total: 1000, responses:[{id, form_id, answers, submitted_at}], summary:{... includeTextAnswers:true}}
```

## Admin

### `GET /api/admin/forms` — list with counts (IP-gated)
```bash
curl http://localhost:3000/api/admin/forms
# 200 {success:true, forms:[{id,title,description,created_at,responseCount}]}
```

### `DELETE /api/forms/:id` — delete form + cascade responses (IP-gated)
```bash
curl -X DELETE http://localhost:3000/api/forms/9
# 200 {success:true, message:"Form #9 deleted."}
```

### `DELETE /api/forms/:id/responses` — clear all responses (IP-gated)
```bash
curl -X DELETE http://localhost:3000/api/forms/1/responses
# 200 {success:true, message:"Deleted 244 responses."}
# 503 Server lacks delete permission. Add SUPABASE_SERVICE_ROLE_KEY... (if anon fallback)
```

## Errors
- `400 Invalid JSON.` (parse failed `server.js:680`)
- `413 Payload too large.` (`express.json limit 25kb`)
- `400 Validation failed.` + `errors[]`
- `403 Access restricted.` / `blocked:true`
- `404 Form not found.`

## Telegram
- Every `201` response fires `notifyTelegram` `server.js:530` → `POST https://api.telegram.org/bot<token>/sendMessage` with `chat_id`, truncated `formTitle 60`, `q.label 80`, `val 300`, `signal timeout 8s`, concurrency `5`.

See [[02-Architecture]] for validation constants, [[03-Stress-Test-Report]] for bypass proofs now fixed.
