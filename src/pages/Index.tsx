/**
 * Index.tsx — Main page
 *
 * Orchestrates the entire app:
 *  - Auth state (useAuth)
 *  - AI streaming (useAIStreaming)
 *  - Conversation history (useConversations)
 *  - App mode: 'aggregator' (4-up grid) | 'focused' (single-AI chat)
 *  - Modal state: auth, api-keys
 *
 * After every completed question, the conversation is added to history
 * and (if authenticated) persisted to Supabase.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { QuestionInput } from '@/components/QuestionInput';
import { ResponseGrid } from '@/components/ResponseGrid';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { FocusedConversation } from '@/components/FocusedConversation';
import { AuthModal } from '@/components/auth/AuthModal';
import { ApiKeysModal } from '@/components/settings/ApiKeysModal';
import { useAuth } from '@/hooks/useAuth';
import { useAIStreaming } from '@/hooks/useAIStreaming';
import { useConversations } from '@/hooks/useConversations';
import { AppMode, AIProvider, FocusedSession } from '@/types';

const Index = () => {
  // ── Auth ─────────────────────────────────────────────────────────
  const { user, accessToken, isAuthenticated, signOut } = useAuth();

  // ── AI streaming ─────────────────────────────────────────────────
  const {
    providerStates,
    currentQuestion,
    isQuerying,
    hasResponses,
    submitQuestion,
    retryProvider,
    resetResponses,
  } = useAIStreaming(accessToken);

  // ── Conversation history ──────────────────────────────────────────
  const { conversations, isLoading: historyLoading, addConversation } =
    useConversations(user?.id);

  // Track whether we've already saved the current question to history
  const savedRef = useRef<string>('');

  useEffect(() => {
    // Save to history when all providers have finished and we haven't saved yet
    const allDone = Object.values(providerStates).every(
      (s) => s.isComplete,
    );
    if (allDone && currentQuestion && savedRef.current !== currentQuestion) {
      savedRef.current = currentQuestion;
      addConversation(currentQuestion, providerStates);
    }
  }, [providerStates, currentQuestion, addConversation]);

  // ── App mode ──────────────────────────────────────────────────────
  const [appMode, setAppMode] = useState<AppMode>({ mode: 'aggregator' });

  const handleFocusProvider = useCallback(
    (provider: AIProvider) => {
      const content = providerStates[provider].content;
      if (!content) return;
      const session: FocusedSession = {
        provider,
        originalQuestion: currentQuestion,
        initialResponse: content,
        messages: [],
      };
      setAppMode({ mode: 'focused', session });
    },
    [providerStates, currentQuestion],
  );

  const handleBackToAggregator = useCallback(() => {
    setAppMode({ mode: 'aggregator' });
  }, []);

  // ── Sidebar ───────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const handleSelectQuestion = useCallback(
    (question: string) => {
      // Return to aggregator view when replaying a history item
      setAppMode({ mode: 'aggregator' });
      submitQuestion(question);
      if (window.innerWidth < 768) setSidebarOpen(false);
    },
    [submitQuestion],
  );

  // ── Modal state ───────────────────────────────────────────────────
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        onToggleSidebar={toggleSidebar}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenApiKeys={() => setApiKeysModalOpen(true)}
        onSignOut={signOut}
        user={user}
      />

      <div className="flex flex-1 overflow-hidden">
        <ChatHistorySidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectQuestion={handleSelectQuestion}
          conversations={conversations}
          isLoading={historyLoading}
        />

        <main className="flex flex-1 flex-col overflow-y-auto">
          {appMode.mode === 'focused' ? (
            /* ── Focused single-AI conversation ────────────────── */
            <div className="flex h-full flex-col">
              <FocusedConversation
                session={appMode.session}
                onBack={handleBackToAggregator}
                accessToken={accessToken}
              />
            </div>
          ) : (
            /* ── Aggregator (4-up grid) ─────────────────────────── */
            <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 md:p-6">
              {/* Input */}
              <section className="space-y-2">
                <h2 className="text-lg font-semibold md:text-xl">Ask the AIs</h2>
                <QuestionInput
                  onSubmit={submitQuestion}
                  onReset={resetResponses}
                  isQuerying={isQuerying}
                  hasResponses={hasResponses}
                />
              </section>

              {/* Current question pill */}
              {currentQuestion && (
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Current question</p>
                  <p className="mt-0.5 text-sm font-medium">{currentQuestion}</p>
                </div>
              )}

              {/* 4-up resizable response grid */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold md:text-xl">AI Responses</h2>
                  {hasResponses && (
                    <p className="text-xs text-muted-foreground">
                      Double-click any response to continue that conversation
                    </p>
                  )}
                </div>
                <ResponseGrid
                  responses={providerStates}
                  onRetry={retryProvider}
                  onFocus={handleFocusProvider}
                />
              </section>
            </div>
          )}
        </main>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <ApiKeysModal
        open={apiKeysModalOpen}
        onOpenChange={setApiKeysModalOpen}
        accessToken={accessToken}
      />
    </div>
  );
};

export default Index;
