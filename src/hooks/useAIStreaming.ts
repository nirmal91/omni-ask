/**
 * useAIStreaming.ts
 *
 * The core hook that replaces useMockResponses.
 *
 * Responsibilities:
 *  - Starts 4 parallel streams when a question is submitted
 *  - Accumulates content per-provider in real-time (drives the typing effect)
 *  - Handles per-provider errors and retries
 *  - Cleans up (aborts) on unmount or when a new question is submitted
 *
 * Streaming is done via `streamAIResponse` from aiService, which handles
 * both demo mode (mock) and real mode (Supabase edge function) transparently.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AIProvider, AIProviderState } from '@/types';
import { streamAIResponse } from '@/services/aiService';

const PROVIDERS: AIProvider[] = ['perplexity', 'gemini', 'chatgpt', 'claude'];

function makeInitialState(isStreaming = false): Record<AIProvider, AIProviderState> {
  const entry = (provider: AIProvider): AIProviderState => ({
    provider,
    content: '',
    isStreaming,
    isComplete: false,
    error: null,
    timestamp: null,
  });
  return {
    perplexity: entry('perplexity'),
    gemini: entry('gemini'),
    chatgpt: entry('chatgpt'),
    claude: entry('claude'),
  };
}

export function useAIStreaming(accessToken?: string | null) {
  const [providerStates, setProviderStates] = useState<Record<AIProvider, AIProviderState>>(
    makeInitialState(),
  );
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  // AbortController ref — cancelled when new question starts or on unmount
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Helper: patch a single provider's state
  const patchProvider = useCallback(
    (provider: AIProvider, patch: Partial<AIProviderState>) => {
      setProviderStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], ...patch },
      }));
    },
    [],
  );

  const runProvider = useCallback(
    async (provider: AIProvider, question: string, signal: AbortSignal) => {
      patchProvider(provider, { isStreaming: true, content: '', error: null, isComplete: false });

      try {
        const stream = streamAIResponse(provider, question, { accessToken, signal });
        let content = '';

        for await (const chunk of stream) {
          if (signal.aborted) return;
          content += chunk;
          // Update content in state directly — React 18 batches these
          patchProvider(provider, { content });
        }

        if (!signal.aborted) {
          patchProvider(provider, {
            isStreaming: false,
            isComplete: true,
            timestamp: new Date(),
          });
        }
      } catch (err) {
        if (signal.aborted) return;
        patchProvider(provider, {
          isStreaming: false,
          isComplete: true,
          error: err instanceof Error ? err.message : 'Failed to get response',
        });
      }
    },
    [accessToken, patchProvider],
  );

  const submitQuestion = useCallback(
    async (question: string) => {
      if (!question.trim() || isQuerying) return;

      // Abort any in-flight streams from the previous question
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setCurrentQuestion(question);
      setIsQuerying(true);
      setProviderStates(makeInitialState(true));

      // Fire all 4 providers in parallel
      await Promise.allSettled(
        PROVIDERS.map((p) => runProvider(p, question, controller.signal)),
      );

      if (!controller.signal.aborted) {
        setIsQuerying(false);
      }
    },
    [isQuerying, runProvider],
  );

  const retryProvider = useCallback(
    (provider: AIProvider) => {
      if (!currentQuestion) return;

      const signal = abortRef.current?.signal ?? new AbortController().signal;
      runProvider(provider, currentQuestion, signal);
    },
    [currentQuestion, runProvider],
  );

  const resetResponses = useCallback(() => {
    abortRef.current?.abort();
    setProviderStates(makeInitialState());
    setCurrentQuestion('');
    setIsQuerying(false);
  }, []);

  const hasResponses = PROVIDERS.some(
    (p) => providerStates[p].content || providerStates[p].error,
  );

  return {
    providerStates,
    currentQuestion,
    isQuerying,
    hasResponses,
    submitQuestion,
    retryProvider,
    resetResponses,
  };
}
