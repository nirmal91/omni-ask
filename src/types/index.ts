// ─── AI Provider ─────────────────────────────────────────────────────────────

export type AIProvider = 'perplexity' | 'gemini' | 'chatgpt' | 'claude';

export interface AIProviderConfig {
  name: string;
  icon: string;
  tagline: string;
  model: string;
}

// ─── Streaming state per provider ────────────────────────────────────────────

export interface AIProviderState {
  provider: AIProvider;
  content: string;       // accumulated streamed text
  isStreaming: boolean;  // actively receiving chunks
  isComplete: boolean;   // stream finished (success or error)
  error: string | null;
  timestamp: Date | null;
}

// ─── Conversations ────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  provider?: AIProvider;  // set on assistant messages
  timestamp: Date;
}

/** Lightweight record stored in history sidebar */
export interface ConversationSummary {
  id: string;
  question: string;           // the user's original question
  timestamp: Date;
  previews: { provider: AIProvider; preview: string }[];
}

/** Full conversation when a user drills into one AI (focused mode) */
export interface FocusedSession {
  provider: AIProvider;
  originalQuestion: string;
  initialResponse: string;   // the card content the user double-clicked
  messages: Message[];       // full back-and-forth from here on
}

// ─── Authentication ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  avatarUrl?: string;
  displayName?: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
}

// ─── API keys (user-owned model) ──────────────────────────────────────────────

export interface UserApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  perplexity?: string;
}

/** Shape stored in the user_api_keys table (keys are encrypted server-side) */
export interface UserApiKeysRow {
  user_id: string;
  has_openai: boolean;
  has_anthropic: boolean;
  has_google: boolean;
  has_perplexity: boolean;
  updated_at: string;
}

// ─── Streaming SSE event shapes (edge function → browser) ────────────────────

export type SSEEventType = 'chunk' | 'done' | 'error';

export interface SSEChunkEvent {
  type: 'chunk';
  content: string;
}

export interface SSEDoneEvent {
  type: 'done';
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

export type SSEEvent = SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;

// ─── App modes ────────────────────────────────────────────────────────────────

export type AppMode =
  | { mode: 'aggregator' }
  | { mode: 'focused'; session: FocusedSession };
