/**
 * ResponseGrid.tsx
 *
 * 2×2 grid of AI response cards with fully resizable panels.
 *
 * Layout (all 3 resize handles are draggable):
 *
 *   ┌────────────────┬────────────────┐
 *   │  Perplexity    │  Gemini        │
 *   │                │                │  ← vertical handle between columns
 *   ├────────────────┼────────────────┤  ← horizontal handles in each column
 *   │  ChatGPT       │  Claude        │
 *   └────────────────┴────────────────┘
 *
 * Uses react-resizable-panels (already in package.json).
 */

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { AIResponseCard } from './AIResponseCard';
import { AIProvider, AIProviderState } from '@/types';

interface ResponseGridProps {
  responses: Record<AIProvider, AIProviderState>;
  onRetry: (provider: AIProvider) => void;
  onFocus: (provider: AIProvider) => void;
}

export function ResponseGrid({ responses, onRetry, onFocus }: ResponseGridProps) {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-[600px] rounded-lg border"
    >
      {/* Left column */}
      <ResizablePanel defaultSize={50} minSize={25}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-2">
              <AIResponseCard
                data={responses.perplexity}
                onRetry={onRetry}
                onFocus={onFocus}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-2">
              <AIResponseCard
                data={responses.chatgpt}
                onRetry={onRetry}
                onFocus={onFocus}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right column */}
      <ResizablePanel defaultSize={50} minSize={25}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-2">
              <AIResponseCard
                data={responses.gemini}
                onRetry={onRetry}
                onFocus={onFocus}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-2">
              <AIResponseCard
                data={responses.claude}
                onRetry={onRetry}
                onFocus={onFocus}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
