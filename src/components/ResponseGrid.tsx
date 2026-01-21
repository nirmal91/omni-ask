import { AIProvider, AIResponse } from '@/lib/mockData';
import { AIResponseCard } from './AIResponseCard';

interface ResponseGridProps {
  responses: Record<AIProvider, AIResponse>;
  onRetry: (provider: AIProvider) => void;
}

const gridOrder: AIProvider[] = ['perplexity', 'gemini', 'chatgpt', 'claude'];

export function ResponseGrid({ responses, onRetry }: ResponseGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {gridOrder.map((provider) => (
        <AIResponseCard
          key={provider}
          data={responses[provider]}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
