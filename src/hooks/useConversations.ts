/**
 * useConversations.ts
 *
 * Manages conversation history.
 *
 * Demo mode  : stores up to 50 conversations in memory (lost on page reload).
 * Real mode  : persists to Supabase `conversations` + `messages` tables.
 *              Loads prior history on mount when user is authenticated.
 *
 * The hook exposes a stable `addConversation` function that the parent page
 * calls after a question completes, so history automatically appears in the
 * sidebar.
 */

import { useState, useCallback, useEffect } from 'react';
import { AIProvider, AIProviderState, ConversationSummary } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const MAX_LOCAL = 50;
const PREVIEW_LEN = 80;

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchConversationsFromDB(userId: string): Promise<ConversationSummary[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select('id, question, created_at, conversation_previews(provider, preview)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    question: row.question,
    timestamp: new Date(row.created_at),
    previews: (row.conversation_previews ?? []).map(
      (p: { provider: AIProvider; preview: string }) => ({
        provider: p.provider,
        preview: p.preview,
      }),
    ),
  }));
}

async function saveConversationToDB(
  userId: string,
  summary: ConversationSummary,
): Promise<void> {
  if (!supabase) return;

  // Insert conversation row
  const { error: convErr } = await supabase.from('conversations').insert({
    id: summary.id,
    user_id: userId,
    question: summary.question,
    created_at: summary.timestamp.toISOString(),
  });

  if (convErr) {
    console.error('[conversations] insert error:', convErr.message);
    return;
  }

  // Insert previews
  const previews = summary.previews.map((p) => ({
    conversation_id: summary.id,
    provider: p.provider,
    preview: p.preview,
  }));

  const { error: prevErr } = await supabase
    .from('conversation_previews')
    .insert(previews);

  if (prevErr) {
    console.error('[conversation_previews] insert error:', prevErr.message);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConversations(userId?: string | null) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load history from DB on sign-in
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;

    setIsLoading(true);
    fetchConversationsFromDB(userId)
      .then(setConversations)
      .finally(() => setIsLoading(false));
  }, [userId]);

  const addConversation = useCallback(
    (question: string, providerStates: Record<AIProvider, AIProviderState>) => {
      const previews = (
        ['perplexity', 'gemini', 'chatgpt', 'claude'] as AIProvider[]
      )
        .filter((p) => providerStates[p].content)
        .map((p) => ({
          provider: p,
          preview: providerStates[p].content.slice(0, PREVIEW_LEN).trimEnd() + '…',
        }));

      const summary: ConversationSummary = {
        id: crypto.randomUUID(),
        question,
        timestamp: new Date(),
        previews,
      };

      setConversations((prev) => [summary, ...prev].slice(0, MAX_LOCAL));

      // Fire-and-forget persist to DB
      if (isSupabaseConfigured && userId) {
        saveConversationToDB(userId, summary).catch(console.error);
      }
    },
    [userId],
  );

  const clearConversations = useCallback(() => {
    setConversations([]);
  }, []);

  return { conversations, isLoading, addConversation, clearConversations };
}
