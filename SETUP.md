# OmniAsk — Setup Guide

## Running in Demo Mode (no backend required)

```bash
npm install
npm run dev
```

The app runs immediately with **mock streaming** — simulated word-by-word
responses. No API keys, no sign-in required. Perfect for UI development.

---

## Connecting the Real Backend (Supabase)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New project.

### 2. Run the database migration

In the Supabase SQL Editor, paste and run the contents of:

```
supabase/migrations/001_initial.sql
```

This creates:
- `conversations` + `conversation_previews` tables (chat history)
- `user_api_keys` table with pgcrypto encryption
- `user_api_keys_decrypted` view
- `upsert_api_keys()` function
- Row-Level Security policies

### 3. Set frontend environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and anon key
(Supabase Dashboard → Project Settings → API):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Enable Google OAuth (optional)

In Supabase Dashboard → Authentication → Providers → Google:
- Enable it
- Add your Google OAuth Client ID + Secret
- Set the callback URL in Google Cloud Console to:
  `https://your-project-ref.supabase.co/auth/v1/callback`

### 5. Deploy the Edge Functions

Install the Supabase CLI if you haven't:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

Deploy both functions:

```bash
supabase functions deploy stream-ai
supabase functions deploy save-api-keys
```

### 6. Set Edge Function secrets

```bash
# Required — used to encrypt user API keys in the DB
supabase secrets set API_KEY_ENCRYPTION_SECRET="$(openssl rand -base64 32)"

# Optional — fallback keys if user hasn't added their own
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_AI_API_KEY=AIza...
supabase secrets set PERPLEXITY_API_KEY=pplx-...
```

### 7. Start the app

```bash
npm run dev
```

You'll now see a **Sign in** button in the header. Users can sign up,
add their own API keys (Settings → API Keys), and get real streaming
responses from all four AI providers.

---

## Deploying to Production

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Add the same env vars from `.env.local` in the Vercel project settings.

### Any static host (Netlify, Cloudflare Pages, etc.)

```bash
npm run build
# Upload the `dist/` folder
```

---

## iOS App (future)

The business logic in `src/hooks/` and `src/services/` is intentionally
framework-agnostic (plain fetch + async generators). When building the
iOS version with Expo/React Native:

1. Reuse `src/services/aiService.ts` — swap `import.meta.env` for a
   config module, everything else is standard fetch.
2. Reuse `src/hooks/useAIStreaming.ts`, `useAuth.ts`, `useConversations.ts`
   — all use standard React hooks.
3. Replace UI components only (`src/components/`) with React Native
   equivalents.
4. The Supabase backend is already mobile-ready — `@supabase/supabase-js`
   works in React Native.

---

## Architecture Overview

```
Browser (React/Vite)
  │
  ├─ Auth ──────────────────► Supabase Auth (JWT)
  │
  ├─ 4 parallel streams ────► Supabase Edge Function: stream-ai
  │                                │
  │                                ├─ Fetches user's decrypted key from DB
  │                                └─ Proxies to LLM API (OpenAI / Anthropic /
  │                                   Google / Perplexity) with streaming
  │
  └─ Conversation history ──► Supabase DB (conversations + previews)

API key storage:
  User enters key → ApiKeysModal → save-api-keys edge function
    → pgp_sym_encrypt(key, secret) → user_api_keys table (ciphertext only)

  On each query:
    stream-ai edge function → user_api_keys_decrypted view (decrypts on read)
    → uses key to call LLM → raw key is NEVER stored in plaintext or logged
```
