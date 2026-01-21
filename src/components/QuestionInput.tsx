import { useState, useCallback, KeyboardEvent } from 'react';
import { Send, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  onReset: () => void;
  isQuerying: boolean;
  hasResponses: boolean;
}

export function QuestionInput({ onSubmit, onReset, isQuerying, hasResponses }: QuestionInputProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = useCallback(() => {
    if (question.trim() && !isQuerying) {
      onSubmit(question.trim());
      setQuestion('');
    }
  }, [question, isQuerying, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleReset = useCallback(() => {
    setQuestion('');
    onReset();
  }, [onReset]);

  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your question... (Press Enter to send, Shift+Enter for new line)"
          className="min-h-[100px] resize-none pr-24 text-base"
          disabled={isQuerying}
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          {hasResponses && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              disabled={isQuerying}
              aria-label="Clear and reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || isQuerying}
            className="gap-2"
          >
            {isQuerying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Asking...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Your question will be sent to all 4 AI assistants simultaneously.
      </p>
    </div>
  );
}
