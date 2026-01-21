import { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIProvider, AI_CONFIG, AIResponse } from '@/lib/mockData';
import { LoadingSpinner } from './LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface AIResponseCardProps {
  data: AIResponse;
  onRetry: (provider: AIProvider) => void;
}

const cardStyles: Record<AIProvider, { header: string; border: string; icon: string }> = {
  perplexity: {
    header: 'bg-gradient-to-r from-perplexity/20 to-perplexity/5',
    border: 'border-perplexity/30 hover:border-perplexity/50',
    icon: 'bg-perplexity text-perplexity-foreground',
  },
  gemini: {
    header: 'bg-gradient-to-r from-gemini/20 to-gemini/5',
    border: 'border-gemini/30 hover:border-gemini/50',
    icon: 'bg-gemini text-gemini-foreground',
  },
  chatgpt: {
    header: 'bg-gradient-to-r from-chatgpt/20 to-chatgpt/5',
    border: 'border-chatgpt/30 hover:border-chatgpt/50',
    icon: 'bg-chatgpt text-chatgpt-foreground',
  },
  claude: {
    header: 'bg-gradient-to-r from-claude/20 to-claude/5',
    border: 'border-claude/30 hover:border-claude/50',
    icon: 'bg-claude text-claude-foreground',
  },
};

export function AIResponseCard({ data, onRetry }: AIResponseCardProps) {
  const { provider, response, timestamp, isLoading, error } = data;
  const config = AI_CONFIG[provider];
  const styles = cardStyles[provider];
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!response) return;
    
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: `${config.name} response copied to clipboard.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [response, config.name, toast]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-hidden transition-all duration-300',
        styles.border,
        response && 'animate-fade-in'
      )}
    >
      <CardHeader className={cn('flex-row items-center justify-between space-y-0 p-4', styles.header)}>
        <div className="flex items-center gap-3">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-lg', styles.icon)}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold leading-none">{config.name}</h3>
            <p className="text-xs text-muted-foreground">{config.tagline}</p>
          </div>
        </div>
        {response && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8"
            aria-label="Copy response"
          >
            {copied ? <Check className="h-4 w-4 text-chatgpt" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-4 pt-0">
        <div className="mt-4 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full min-h-[150px] items-center justify-center">
              <LoadingSpinner provider={provider} />
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(provider)}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : response ? (
            <div className="h-full max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {response}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[150px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Ask a question to see {config.name}'s response
              </p>
            </div>
          )}
        </div>

        {timestamp && !isLoading && !error && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Received at {formatTime(timestamp)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
