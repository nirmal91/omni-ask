/**
 * stream-ai — Supabase Edge Function
 *
 * Receives a question + provider, fetches the user's decrypted API key from
 * the database, calls the appropriate LLM with streaming enabled, and pipes
 * the tokens back to the browser as Server-Sent Events (SSE).
 *
 * Request body (POST):
 *   {
 *     provider: 'perplexity' | 'gemini' | 'chatgpt' | 'claude'
 *     question: string
 *     conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
 *   }
 *
 * SSE response:
 *   data: {"type":"chunk","content":"Hello "}
 *   data: {"type":"chunk","content":"world"}
 *   data: [DONE]
 *   -- or on error --
 *   data: {"type":"error","message":"..."}
 *
 * Environment secrets required (set via `supabase secrets set`):
 *   OPENAI_API_KEY
 *   ANTHROPIC_API_KEY
 *   GOOGLE_AI_API_KEY
 *   PERPLEXITY_API_KEY
 *
 * If the user has stored their own key in user_api_keys, that takes
 * precedence over the environment variable.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = 'perplexity' | 'gemini' | 'chatgpt' | 'claude';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  provider: Provider;
  question: string;
  conversationHistory?: ChatMessage[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sseChunk(content: string): string {
  return `data: ${JSON.stringify({ type: 'chunk', content })}\n\n`;
}

function sseDone(): string {
  return 'data: [DONE]\n\n';
}

function sseError(message: string): string {
  return `data: ${JSON.stringify({ type: 'error', message })}\n\n`;
}

function makeStream(
  generator: (controller: ReadableStreamDefaultController) => Promise<void>,
): ReadableStream {
  return new ReadableStream({
    start(controller) {
      generator(controller).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(new TextEncoder().encode(sseError(msg)));
        controller.close();
      });
    },
  });
}

// ─── Provider: OpenAI / ChatGPT ───────────────────────────────────────────────

async function streamOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController,
  baseUrl = 'https://api.openai.com/v1',
  model = 'gpt-4o-mini',
): Promise<void> {
  const enc = new TextEncoder();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') {
        controller.enqueue(enc.encode(sseDone()));
        controller.close();
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) controller.enqueue(enc.encode(sseChunk(content)));
      } catch {
        // skip malformed lines
      }
    }
  }

  controller.enqueue(enc.encode(sseDone()));
  controller.close();
}

// ─── Provider: Anthropic / Claude ────────────────────────────────────────────

async function streamAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController,
): Promise<void> {
  const enc = new TextEncoder();

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      stream: true,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${body}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      try {
        const event = JSON.parse(payload);
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta' &&
          event.delta.text
        ) {
          controller.enqueue(enc.encode(sseChunk(event.delta.text)));
        } else if (event.type === 'message_stop') {
          controller.enqueue(enc.encode(sseDone()));
          controller.close();
          return;
        } else if (event.type === 'error') {
          throw new Error(event.error?.message ?? 'Anthropic stream error');
        }
      } catch (err) {
        if (err instanceof SyntaxError) continue; // skip malformed lines
        throw err;
      }
    }
  }

  controller.enqueue(enc.encode(sseDone()));
  controller.close();
}

// ─── Provider: Google Gemini ─────────────────────────────────────────────────

async function streamGemini(
  apiKey: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController,
): Promise<void> {
  const enc = new TextEncoder();
  const model = 'gemini-1.5-flash';

  // Convert message history to Gemini format
  // Gemini alternates user/model, so we map assistant → model
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini error ${res.status}: ${body}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      try {
        const event = JSON.parse(payload);
        const text = event?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) controller.enqueue(enc.encode(sseChunk(text)));
      } catch {
        // skip
      }
    }
  }

  controller.enqueue(enc.encode(sseDone()));
  controller.close();
}

// ─── Supabase: fetch user's decrypted API key ─────────────────────────────────

async function getUserApiKey(
  supabaseClient: ReturnType<typeof createClient>,
  provider: Provider,
): Promise<string | null> {
  const encryptionSecret = Deno.env.get('API_KEY_ENCRYPTION_SECRET') ?? 'fallback-secret';

  const { data, error } = await supabaseClient.rpc('get_decrypted_key', {
    p_provider: provider,
    p_secret: encryptionSecret,
  });

  if (error || !data) return null;
  return data as string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
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
    const body = (await req.json()) as RequestBody;
    const { provider, question, conversationHistory = [] } = body;

    if (!provider || !question) {
      return new Response('Missing provider or question', { status: 400 });
    }

    // Build auth'd Supabase client using the JWT from the request
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } },
    );

    // Resolve API key: user's stored key > env var fallback
    const envKeyMap: Record<Provider, string> = {
      chatgpt: 'OPENAI_API_KEY',
      claude: 'ANTHROPIC_API_KEY',
      gemini: 'GOOGLE_AI_API_KEY',
      perplexity: 'PERPLEXITY_API_KEY',
    };

    const userKey = await getUserApiKey(supabase, provider);
    const apiKey = userKey ?? Deno.env.get(envKeyMap[provider]);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: `No API key configured for ${provider}. Add yours in Settings → API Keys.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Build full message history
    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: question },
    ];

    // Create SSE streaming response
    const stream = makeStream(async (controller) => {
      switch (provider) {
        case 'chatgpt':
          await streamOpenAI(apiKey, messages, controller);
          break;
        case 'claude':
          await streamAnthropic(apiKey, messages, controller);
          break;
        case 'gemini':
          await streamGemini(apiKey, messages, controller);
          break;
        case 'perplexity':
          // Perplexity is OpenAI-compatible
          await streamOpenAI(
            apiKey,
            messages,
            controller,
            'https://api.perplexity.ai',
            'llama-3.1-sonar-large-128k-online',
          );
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Encoding': 'identity',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return new Response(sseError(msg), {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
