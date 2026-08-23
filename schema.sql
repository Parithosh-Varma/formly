-- ============================================================
-- Student AI Survey - schema for YOUR Supabase project
-- Paste into: SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.forms (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_responses (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
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
