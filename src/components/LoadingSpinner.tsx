import { cn } from '@/lib/utils';
import { AIProvider } from '@/lib/mockData';

interface LoadingSpinnerProps {
  provider: AIProvider;
  className?: string;
}

const spinnerColors: Record<AIProvider, string> = {
  perplexity: 'border-perplexity',
  gemini: 'border-gemini',
  chatgpt: 'border-chatgpt',
  claude: 'border-claude',
};

export function LoadingSpinner({ provider, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'h-8 w-8 animate-spin-slow rounded-full border-2 border-t-transparent',
          spinnerColors[provider]
        )}
      />
      <p className="text-sm text-muted-foreground animate-pulse-soft">
        Thinking...
      </p>
    </div>
  );
}
