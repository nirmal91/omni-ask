import { X, MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { mockChatHistory, AI_CONFIG } from '@/lib/mockData';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestion: (question: string) => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function ChatHistorySidebar({ isOpen, onClose, onSelectQuestion }: ChatHistorySidebarProps) {
  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-72 border-r bg-background transition-transform duration-300 ease-in-out md:relative md:top-0 md:h-full md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full md:w-0 md:border-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <h2 className="font-semibold">Chat History</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* History List */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {mockChatHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectQuestion(item.question)}
                  className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                >
                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                    {item.question}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(item.timestamp)}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {item.responses.map((r) => (
                      <span
                        key={r.provider}
                        className="text-xs"
                        title={AI_CONFIG[r.provider].name}
                      >
                        {AI_CONFIG[r.provider].icon}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Footer hint */}
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground text-center">
              Click a question to ask it again
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
