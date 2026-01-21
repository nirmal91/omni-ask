import { useState, useCallback } from 'react';
import { AIProvider, AIResponse, getRandomResponse, getRandomDelay } from '@/lib/mockData';

const initialResponses: Record<AIProvider, AIResponse> = {
  perplexity: { provider: 'perplexity', response: null, timestamp: null, isLoading: false, error: null },
  gemini: { provider: 'gemini', response: null, timestamp: null, isLoading: false, error: null },
  chatgpt: { provider: 'chatgpt', response: null, timestamp: null, isLoading: false, error: null },
  claude: { provider: 'claude', response: null, timestamp: null, isLoading: false, error: null },
};

export function useMockResponses() {
  const [responses, setResponses] = useState<Record<AIProvider, AIResponse>>(initialResponses);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isQuerying, setIsQuerying] = useState(false);

  const submitQuestion = useCallback((question: string) => {
    if (!question.trim() || isQuerying) return;

    setCurrentQuestion(question);
    setIsQuerying(true);

    // Set all to loading
    setResponses({
      perplexity: { ...initialResponses.perplexity, isLoading: true },
      gemini: { ...initialResponses.gemini, isLoading: true },
      chatgpt: { ...initialResponses.chatgpt, isLoading: true },
      claude: { ...initialResponses.claude, isLoading: true },
    });

    // Simulate staggered responses
    const providers: AIProvider[] = ['perplexity', 'gemini', 'chatgpt', 'claude'];
    
    providers.forEach((provider) => {
      const delay = getRandomDelay();
      
      setTimeout(() => {
        // Small chance of simulating an error (10%)
        const shouldError = Math.random() < 0.1;
        
        setResponses((prev) => ({
          ...prev,
          [provider]: {
            provider,
            response: shouldError ? null : getRandomResponse(provider),
            timestamp: new Date(),
            isLoading: false,
            error: shouldError ? 'Service temporarily unavailable. Please try again.' : null,
          },
        }));
      }, delay);
    });

    // Reset isQuerying after longest possible delay
    setTimeout(() => {
      setIsQuerying(false);
    }, 3000);
  }, [isQuerying]);

  const resetResponses = useCallback(() => {
    setResponses(initialResponses);
    setCurrentQuestion('');
    setIsQuerying(false);
  }, []);

  const retryProvider = useCallback((provider: AIProvider) => {
    setResponses((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], isLoading: true, error: null },
    }));

    setTimeout(() => {
      setResponses((prev) => ({
        ...prev,
        [provider]: {
          provider,
          response: getRandomResponse(provider),
          timestamp: new Date(),
          isLoading: false,
          error: null,
        },
      }));
    }, getRandomDelay());
  }, []);

  return {
    responses,
    currentQuestion,
    isQuerying,
    submitQuestion,
    resetResponses,
    retryProvider,
  };
}
