-- ============================================================
-- OmniAsk — Initial Database Schema
-- ============================================================
--
-- Run this in Supabase SQL Editor or via `supabase db push`.
--
-- Tables:
--   conversations          — one row per question asked
--   conversation_previews  — provider response previews for sidebar
--   user_api_keys          — pgcrypto-encrypted API keys per user
--
-- Views:
--   user_api_keys_decrypted — decrypts keys for edge function reads
--
-- Functions:
--   upsert_api_keys()  — called by save-api-keys edge function
--
-- All tables use RLS so users can only access their own data.
-- ============================================================

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── conversations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations"
  ON public.conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX conversations_user_id_created_at
  ON public.conversations (user_id, created_at DESC);

-- ─── conversation_previews ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversation_previews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('perplexity', 'gemini', 'chatgpt', 'claude')),
  preview         TEXT NOT NULL
);

ALTER TABLE public.conversation_previews ENABLE ROW LEVEL SECURITY;

-- Access through parent conversation's user_id
CREATE POLICY "Users can access previews for their conversations"
  ON public.conversation_previews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- ─── user_api_keys ───────────────────────────────────────────────────────────
--
-- Keys are stored encrypted with pgp_sym_encrypt(key, secret).
-- The decryption secret lives only in Supabase Secrets / Edge Function env.

CREATE TABLE IF NOT EXISTS public.user_api_keys (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_key            BYTEA,     -- pgp_sym_encrypt(raw_key, secret)
  anthropic_key         BYTEA,
  google_key            BYTEA,
  perplexity_key        BYTEA,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own row
CREATE POLICY "Users can manage their own API keys"
  ON public.user_api_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_api_keys_decrypted (view) ──────────────────────────────────────────
--
-- Used by the stream-ai edge function to fetch decrypted keys.
-- Decryption requires current_setting('app.encryption_secret') to be set
-- at the start of the DB session by the edge function.

CREATE OR REPLACE VIEW public.user_api_keys_decrypted
  WITH (security_invoker = true)  -- runs as the calling user, so RLS applies
AS
SELECT
  user_id,
  CASE WHEN openai_key IS NOT NULL
    THEN pgp_sym_decrypt(openai_key, current_setting('app.encryption_secret', true))
  END AS openai_key,
  CASE WHEN anthropic_key IS NOT NULL
    THEN pgp_sym_decrypt(anthropic_key, current_setting('app.encryption_secret', true))
  END AS anthropic_key,
  CASE WHEN google_key IS NOT NULL
    THEN pgp_sym_decrypt(google_key, current_setting('app.encryption_secret', true))
  END AS google_key,
  CASE WHEN perplexity_key IS NOT NULL
    THEN pgp_sym_decrypt(perplexity_key, current_setting('app.encryption_secret', true))
  END AS perplexity_key,
  -- status flags (safe to expose — no key material)
  openai_key      IS NOT NULL AS has_openai,
  anthropic_key   IS NOT NULL AS has_anthropic,
  google_key      IS NOT NULL AS has_google,
  perplexity_key  IS NOT NULL AS has_perplexity,
  updated_at
FROM public.user_api_keys
WHERE user_id = auth.uid();

-- ─── upsert_api_keys() ───────────────────────────────────────────────────────
--
-- Called by the save-api-keys edge function.
-- Only updates a column when the caller passes a non-null value.
-- Returns the has_* status flags.

CREATE OR REPLACE FUNCTION public.upsert_api_keys(
  p_user_id           UUID,
  p_openai_key        TEXT DEFAULT NULL,
  p_anthropic_key     TEXT DEFAULT NULL,
  p_google_key        TEXT DEFAULT NULL,
  p_perplexity_key    TEXT DEFAULT NULL,
  p_encryption_secret TEXT DEFAULT NULL
)
RETURNS TABLE(
  has_openai      BOOLEAN,
  has_anthropic   BOOLEAN,
  has_google      BOOLEAN,
  has_perplexity  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as the function owner (postgres), not the caller
AS $$
DECLARE
  v_secret TEXT := COALESCE(p_encryption_secret, current_setting('app.encryption_secret', true));
BEGIN
  -- Security check: only the authenticated user can update their own keys
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.user_api_keys (user_id, updated_at)
  VALUES (p_user_id, NOW())
  ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();

  -- Only overwrite a key column when a new value is explicitly provided
  IF p_openai_key IS NOT NULL THEN
    UPDATE public.user_api_keys
    SET openai_key = pgp_sym_encrypt(p_openai_key, v_secret)
    WHERE user_id = p_user_id;
  END IF;

  IF p_anthropic_key IS NOT NULL THEN
    UPDATE public.user_api_keys
    SET anthropic_key = pgp_sym_encrypt(p_anthropic_key, v_secret)
    WHERE user_id = p_user_id;
  END IF;

  IF p_google_key IS NOT NULL THEN
    UPDATE public.user_api_keys
    SET google_key = pgp_sym_encrypt(p_google_key, v_secret)
    WHERE user_id = p_user_id;
  END IF;

  IF p_perplexity_key IS NOT NULL THEN
    UPDATE public.user_api_keys
    SET perplexity_key = pgp_sym_encrypt(p_perplexity_key, v_secret)
    WHERE user_id = p_user_id;
  END IF;

  -- Return status flags
  RETURN QUERY
  SELECT
    openai_key      IS NOT NULL,
    anthropic_key   IS NOT NULL,
    google_key      IS NOT NULL,
    perplexity_key  IS NOT NULL
  FROM public.user_api_keys
  WHERE user_id = p_user_id;
END;
$$;

-- ─── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_on_user_api_keys
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── get_decrypted_key() ──────────────────────────────────────────────────────
--
-- Called by the stream-ai edge function to retrieve and decrypt a user's
-- API key for a given provider. Accepts the encryption secret as a parameter
-- to avoid relying on session-level configuration.

CREATE OR REPLACE FUNCTION public.get_decrypted_key(p_provider TEXT, p_secret TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE result TEXT;
BEGIN
  CASE p_provider
    WHEN 'chatgpt' THEN
      SELECT pgp_sym_decrypt(openai_key, p_secret) INTO result FROM public.user_api_keys WHERE user_id = auth.uid();
    WHEN 'claude' THEN
      SELECT pgp_sym_decrypt(anthropic_key, p_secret) INTO result FROM public.user_api_keys WHERE user_id = auth.uid();
    WHEN 'gemini' THEN
      SELECT pgp_sym_decrypt(google_key, p_secret) INTO result FROM public.user_api_keys WHERE user_id = auth.uid();
    WHEN 'perplexity' THEN
      SELECT pgp_sym_decrypt(perplexity_key, p_secret) INTO result FROM public.user_api_keys WHERE user_id = auth.uid();
    ELSE
      result := NULL;
  END CASE;
  RETURN result;
END;
$$;
