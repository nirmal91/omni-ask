/**
 * aiService.ts
 *
 * Single source of truth for streaming AI responses.
 *
 * Two modes:
 *   DEMO  – No backend required. Simulates word-by-word streaming from mockData.
 *   REAL  – Calls the Supabase Edge Function `stream-ai`, which proxies to the
 *           actual LLM APIs using keys the user has stored in the DB.
 *
 * The same AsyncGenerator interface is used in both modes, so hooks/components
 * never need to know which mode they're in.
 *
 * iOS compatibility note: This file uses only `fetch` and standard async
 * iteration — both available in React Native. Swap `import.meta.env` checks
 * for a platform config object when porting.
 */

import { AIProvider, Message, SSEEvent } from '@/types';
import { mockResponses } from '@/lib/mockData';
import { isSupabaseConfigured, supabaseFunctionsUrl, supabaseAnonKey } from '@/lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// ─── Mock streaming ───────────────────────────────────────────────────────────

/**
 * Yields the mock response for a provider, word-by-word with realistic delays.
 * Simulates what real streaming will look like once the backend is wired up.
 */
async function* mockStream(provider: AIProvider): AsyncGenerator<string> {
  const responses = mockResponses[provider];
  const text = responses[Math.floor(Math.random() * responses.length)];

  // Initial "thinking" pause
  await sleep(randomBetween(300, 800));

  // Split on whitespace but keep the whitespace tokens so spacing is preserved
  const tokens = text.split(/(\s+)/);

  for (const token of tokens) {
    await sleep(randomBetween(15, 60));
    yield token;
  }
}

// ─── Real streaming (Supabase Edge Function) ──────────────────────────────────

/**
 * Opens an SSE connection to the `stream-ai` edge function and yields content
 * chunks as they arrive.
 *
 * The edge function returns newline-delimited SSE:
 *   data: {"type":"chunk","content":"Hello "}
 *   data: {"type":"chunk","content":"world"}
 *   data: [DONE]
 */
async function* realStream(
  provider: AIProvider,
  question: string,
  conversationHistory: Message[],
  accessToken: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const url = `${supabaseFunctionsUrl}/stream-ai`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    },
    body: JSON.stringify({
      provider,
      question,
      conversationHistory: conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(body || `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body from stream-ai');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;

      let event: SSEEvent;
      try {
        event = JSON.parse(payload) as SSEEvent;
      } catch {
        continue; // skip malformed JSON
      }
      if (event.type === 'chunk' && event.content) {
        yield event.content;
      } else if (event.type === 'error') {
        throw new Error(event.message);
      }
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface StreamOptions {
  /** JWT from Supabase auth — required for real mode */
  accessToken?: string | null;
  /** Prior messages for focused/follow-up conversations */
  conversationHistory?: Message[];
  /** AbortSignal to cancel mid-stream */
  signal?: AbortSignal;
}

/**
 * Returns an AsyncGenerator that yields string chunks for a provider's response.
 * Automatically uses mock mode when Supabase is not configured or no accessToken
 * is provided.
 */
export function streamAIResponse(
  provider: AIProvider,
  question: string,
  options: StreamOptions = {},
): AsyncGenerator<string> {
  const { accessToken, conversationHistory = [], signal = new AbortController().signal } = options;

  const useReal = isSupabaseConfigured && Boolean(accessToken);

  if (useReal) {
    return realStream(provider, question, conversationHistory, accessToken!, signal);
  }

  return mockStream(provider);
}
