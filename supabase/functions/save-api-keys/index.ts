/**
 * save-api-keys — Supabase Edge Function
 *
 * Receives the user's raw API keys and stores them encrypted using
 * pgcrypto's `pgp_sym_encrypt` via a DB function. Raw keys never appear
 * in logs or the DB in plaintext.
 *
 * Request body (POST):
 *   {
 *     openai?: string
 *     anthropic?: string
 *     google?: string
 *     perplexity?: string
 *   }
 *
 * Response:
 *   { has_openai, has_anthropic, has_google, has_perplexity }
 *
 * Environment secrets required:
 *   API_KEY_ENCRYPTION_SECRET  — a strong random string used as the pgcrypto
 *                                symmetric encryption passphrase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  openai?: string;
  anthropic?: string;
  google?: string;
  perplexity?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = (await req.json()) as RequestBody;
    const encryptionSecret = Deno.env.get('API_KEY_ENCRYPTION_SECRET') ?? 'fallback-secret';

    // Use a DB function that encrypts keys server-side with pgcrypto
    const { data, error } = await supabase.rpc('upsert_api_keys', {
      p_user_id: user.id,
      p_openai_key: body.openai ?? null,
      p_anthropic_key: body.anthropic ?? null,
      p_google_key: body.google ?? null,
      p_perplexity_key: body.perplexity ?? null,
      p_encryption_secret: encryptionSecret,
    });

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
