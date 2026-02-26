/**
 * ChatHistorySidebar.tsx
 *
 * Left sidebar showing conversation history.
 *
 * Accepts real `conversations` from useConversations (local or Supabase-backed)
 * instead of hardcoded mock data. Falls back to an empty state with a prompt
 * to ask the first question.
 */

import { X, MessageSquare, Clock, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AI_CONFIG } from '@/lib/mockData';
import { ConversationSummary } from '@/types';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestion: (question: string) => void;
  conversations: ConversationSummary[];
  isLoading?: boolean;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

export function ChatHistorySidebar({
  isOpen,
  onClose,
  onSelectQuestion,
  conversations,
  isLoading = false,
}: ChatHistorySidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-72 border-r bg-background transition-all duration-300 ease-in-out md:relative md:top-0 md:h-full md:translate-x-0',
          isOpen
            ? 'translate-x-0'
            : '-translate-x-full md:-translate-x-full md:w-0 md:overflow-hidden md:border-0',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <h2 className="font-semibold">History</h2>
              {conversations.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {conversations.length}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-3">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No history yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Ask your first question to get started
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectQuestion(item.question)}
                    className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {item.question}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(item.timestamp)}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {item.previews.map((r) => (
                          <span
                            key={r.provider}
                            className="text-sm"
                            title={`${AI_CONFIG[r.provider].name}: ${r.preview}`}
                          >
                            {AI_CONFIG[r.provider].icon}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-3">
            <p className="text-center text-xs text-muted-foreground">
              {conversations.length > 0
                ? 'Click any question to ask it again'
                : 'History is saved automatically'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
