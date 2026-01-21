import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { QuestionInput } from '@/components/QuestionInput';
import { ResponseGrid } from '@/components/ResponseGrid';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { useMockResponses } from '@/hooks/useMockResponses';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { responses, currentQuestion, isQuerying, submitQuestion, resetResponses, retryProvider } = useMockResponses();

  const hasResponses = Object.values(responses).some((r) => r.response || r.error);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSelectQuestion = useCallback(
    (question: string) => {
      submitQuestion(question);
      // Close sidebar on mobile after selection
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    },
    [submitQuestion]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        <ChatHistorySidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectQuestion={handleSelectQuestion}
        />

        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-6 lg:p-8">
            {/* Question Input Section */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold md:text-xl">Ask the AIs</h2>
              <QuestionInput
                onSubmit={submitQuestion}
                onReset={resetResponses}
                isQuerying={isQuerying}
                hasResponses={hasResponses}
              />
            </section>

            {/* Current Question Display */}
            {currentQuestion && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Current question:</p>
                <p className="mt-1 font-medium">{currentQuestion}</p>
              </div>
            )}

            {/* Response Grid Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold md:text-xl">AI Responses</h2>
              <ResponseGrid responses={responses} onRetry={retryProvider} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
