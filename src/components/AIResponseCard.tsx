/**
 * AIResponseCard.tsx
 *
 * Displays one AI provider's streaming response. Upgrades from original:
 *  • Real-time streaming text with blinking cursor while receiving
 *  • Double-click card body → onFocus() triggers FocusedConversation view
 *  • Maximize icon button in header for same action with tooltip
 *  • Proper idle / streaming / complete / error state machine
 */

import { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw, AlertCircle, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AI_CONFIG } from '@/lib/mockData';
import { AIProvider, AIProviderState } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AIResponseCardProps {
  data: AIProviderState;
  onRetry: (provider: AIProvider) => void;
  /** Double-click or maximize → enter focused conversation with this AI */
  onFocus: (provider: AIProvider) => void;
}

const cardStyles: Record<AIProvider, { header: string; border: string; icon: string }> = {
  perplexity: {
    header: 'bg-gradient-to-r from-perplexity/20 to-perplexity/5',
    border: 'border-perplexity/30 hover:border-perplexity/60',
    icon: 'bg-perplexity text-perplexity-foreground',
  },
  gemini: {
    header: 'bg-gradient-to-r from-gemini/20 to-gemini/5',
    border: 'border-gemini/30 hover:border-gemini/60',
    icon: 'bg-gemini text-gemini-foreground',
  },
  chatgpt: {
    header: 'bg-gradient-to-r from-chatgpt/20 to-chatgpt/5',
    border: 'border-chatgpt/30 hover:border-chatgpt/60',
    icon: 'bg-chatgpt text-chatgpt-foreground',
  },
  claude: {
    header: 'bg-gradient-to-r from-claude/20 to-claude/5',
    border: 'border-claude/30 hover:border-claude/60',
    icon: 'bg-claude text-claude-foreground',
  },
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AIResponseCard({ data, onRetry, onFocus }: AIResponseCardProps) {
  const { provider, content, isStreaming, isComplete, error, timestamp } = data;
  const config = AI_CONFIG[provider];
  const styles = cardStyles[provider];
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({ title: 'Copied!', description: `${config.name} response copied.` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  }, [content, config.name, toast]);

  const handleDoubleClick = useCallback(() => {
    if (content) onFocus(provider);
  }, [content, provider, onFocus]);

  const isIdle = !isStreaming && !isComplete && !error && !content;

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-hidden transition-all duration-200',
        styles.border,
        isComplete && content && 'animate-fade-in',
      )}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <CardHeader
        className={cn(
          'flex-row items-center justify-between space-y-0 p-3',
          styles.header,
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-base', styles.icon)}>
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">{config.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{config.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isComplete && content && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFocus(provider)}
                  className="h-7 w-7"
                  aria-label={`Continue with ${config.name}`}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Continue this conversation</TooltipContent>
            </Tooltip>
          )}

          {content && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-7 w-7"
              aria-label="Copy response"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-chatgpt" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {/* ── Body ────────────────────────────────────────────────── */}
      <CardContent className="flex flex-1 flex-col p-3 pt-0">
        <div className="mt-3 flex-1 overflow-hidden">

          {/* Idle */}
          {isIdle && (
            <div className="flex h-full min-h-[120px] items-center justify-center">
              <p className="text-center text-sm text-muted-foreground px-4">
                Ask a question to see {config.name}'s response
              </p>
            </div>
          )}

          {/* Streaming — dot bounce before first token */}
          {isStreaming && !content && (
            <div className="flex h-full min-h-[120px] items-center justify-center gap-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
              <p className="text-sm text-muted-foreground">Thinking…</p>
            </div>
          )}

          {/* Text — shows during streaming and after completion */}
          {(content || (isStreaming && content)) && (
            <div
              className={cn(
                'h-full max-h-[280px] overflow-y-auto scrollbar-thin pr-1',
                isComplete && content && 'cursor-pointer',
              )}
              onDoubleClick={handleDoubleClick}
              title={isComplete && content ? `Double-click to continue with ${config.name}` : undefined}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {content}
                {/* Blinking cursor while streaming */}
                {isStreaming && (
                  <span
                    className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[1px] animate-pulse bg-current opacity-60"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
              <p className="max-w-[180px] text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(provider)}
                className="gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* Footer timestamp */}
        {timestamp && isComplete && !error && (
          <div className="mt-3 flex items-center justify-between border-t pt-2">
            <p className="text-xs text-muted-foreground">
              Received at {formatTime(timestamp)}
            </p>
            {content && (
              <p className="text-xs text-muted-foreground opacity-60">
                Double-click to continue ↗
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
