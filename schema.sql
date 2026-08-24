-- ============================================================
-- Student AI Survey - schema for YOUR Supabase project
-- Paste into: SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.forms (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  questions JSONB NOT NULL CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_responses (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  answers JSONB NOT NULL CHECK (jsonb_typeof(answers) = 'object' AND octet_length(answers::text) < 20000),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_responses_form ON public.form_responses(form_id);

-- ------------------------------------------------------------
-- Row Level Security
--   - Anyone (anon) may READ form definitions and SUBMIT responses.
--   - NOBODY (except the server holding sb_secret key) may read,
--     update or delete responses. The secret key bypasses RLS.
-- ------------------------------------------------------------

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read forms" ON public.forms;
CREATE POLICY "public read forms"
  ON public.forms FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public submit responses" ON public.form_responses;
CREATE POLICY "public submit responses"
  ON public.form_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Done! No SELECT/UPDATE/DELETE policies = locked for everyone else.
