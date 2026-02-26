/**
 * FocusedConversation.tsx
 *
 * Full-screen view that opens when the user double-clicks an AI response card.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │  ← Back   [Provider icon + name]            │  ← sticky header
 *   ├─────────────────────────────────────────────┤
 *   │  Original question bubble                   │
 *   │  AI's first response (already received)     │
 *   │  [follow-up messages scroll here]           │
 *   ├─────────────────────────────────────────────┤
 *   │  [textarea]                    [Send]        │  ← sticky footer
 *   └─────────────────────────────────────────────┘
 *
 * The conversation continues with the selected provider only. Each follow-up
 * streams in real-time using the same aiService layer (mock or real).
 */

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowLeft, Send, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AI_CONFIG } from '@/lib/mockData';
import { FocusedSession, Message, AIProvider } from '@/types';
import { streamAIResponse } from '@/services/aiService';
import { useToast } from '@/hooks/use-toast';

interface FocusedConversationProps {
  session: FocusedSession;
  onBack: () => void;
  accessToken?: string | null;
}

const providerAccent: Record<AIProvider, string> = {
  perplexity: 'text-perplexity border-perplexity/30 bg-perplexity/5',
  gemini: 'text-gemini border-gemini/30 bg-gemini/5',
  chatgpt: 'text-chatgpt border-chatgpt/30 bg-chatgpt/5',
  claude: 'text-claude border-claude/30 bg-claude/5',
};

const providerBubble: Record<AIProvider, string> = {
  perplexity: 'bg-perplexity/10 border-perplexity/20',
  gemini: 'bg-gemini/10 border-gemini/20',
  chatgpt: 'bg-chatgpt/10 border-chatgpt/20',
  claude: 'bg-claude/10 border-claude/20',
};

function MessageBubble({
  message,
  provider,
  isStreaming,
}: {
  message: Message;
  provider: AIProvider;
  isStreaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content).catch(() => {});
    setCopied(true);
    toast({ title: 'Copied!', description: 'Response copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground border-transparent'
            : cn('rounded-bl-sm', providerBubble[provider]),
        )}
      >
        <div className="whitespace-pre-wrap">
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current opacity-70" />
          )}
        </div>

        {/* Copy button — only on AI messages with content */}
        {!isUser && message.content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="absolute -right-8 top-2 hidden rounded p-1 text-muted-foreground hover:text-foreground group-hover:flex"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function FocusedConversation({ session, onBack, accessToken }: FocusedConversationProps) {
  const { provider, originalQuestion, initialResponse } = session;
  const config = AI_CONFIG[provider];

  // Full message list: seeded with the original Q&A pair
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: crypto.randomUUID(),
      role: 'user',
      content: originalQuestion,
      timestamp: new Date(),
    },
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      provider,
      content: initialResponse,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        provider,
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setStreamingId(assistantId);
      setIsStreaming(true);

      // Build conversation history for the edge function
      const history = [...messages, userMsg].map((m) => ({
        ...m,
        // strip the extra fields the edge function doesn't need
      }));

      try {
        const stream = streamAIResponse(provider, text.trim(), {
          accessToken,
          conversationHistory: history,
          signal: controller.signal,
        });

        let content = '';
        for await (const chunk of stream) {
          if (controller.signal.aborted) break;
          content += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content } : m)),
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
                : m,
            ),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setStreamingId(null);
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, timestamp: new Date() } : m,
            ),
          );
          // Re-focus the textarea
          textareaRef.current?.focus();
        }
      }
    },
    [isStreaming, messages, provider, accessToken],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-3 border-b px-4 py-3',
          providerAccent[provider],
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 shrink-0"
          aria-label="Back to all responses"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-base',
              `bg-${provider} text-${provider}-foreground`,
            )}
            style={{ background: `hsl(var(--${provider}))` }}
          >
            {config.icon}
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{config.name}</p>
            <p className="text-xs text-muted-foreground">{config.tagline}</p>
          </div>
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {messages.filter((m) => m.role === 'user').length} message
          {messages.filter((m) => m.role === 'user').length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Scrollable message list ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              provider={provider}
              isStreaming={msg.id === streamingId}
            />
          ))}
        </div>
      </div>

      {/* ── Sticky input footer ────────────────────────────────────── */}
      <div className="border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Continue the conversation with ${config.name}… (Enter to send)`}
              className="min-h-[80px] resize-none pr-14 text-sm"
              disabled={isStreaming}
              autoFocus
            />
            <Button
              size="icon"
              className="absolute bottom-3 right-3 h-8 w-8"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Shift+Enter for new line · Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
