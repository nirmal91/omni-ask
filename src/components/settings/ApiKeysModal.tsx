/**
 * ApiKeysModal.tsx
 *
 * Lets users enter their own API keys for each LLM provider.
 *
 * Security model:
 *   REAL mode  — Keys are sent to the Supabase Edge Function `save-api-keys`,
 *               which encrypts them server-side (pgcrypto) and stores only the
 *               ciphertext. The raw keys never touch the DB.
 *               The `has_*` flags are returned so the UI can show ✓ status.
 *
 *   DEMO mode  — No backend. Keys are stored in sessionStorage only (cleared
 *               when the tab closes), with a warning shown to the user.
 *               This lets you test the UI flow without Supabase set up.
 *               NOTE: sessionStorage is not secure for real key storage —
 *               always use real mode in production.
 *
 * The component reads existing key status on open so users know which
 * providers are already configured.
 */

import { useState, useEffect, useCallback } from 'react';
import { Key, Check, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured, supabase, supabaseFunctionsUrl } from '@/lib/supabase';
import { AI_CONFIG } from '@/lib/mockData';
import { AIProvider } from '@/types';

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken?: string | null;
}

const PROVIDERS: { key: AIProvider; label: string; placeholder: string; sessionKey: string }[] = [
  { key: 'perplexity', label: 'Perplexity', placeholder: 'pplx-...', sessionKey: 'omniask_pplx_key' },
  { key: 'gemini', label: 'Gemini (Google AI)', placeholder: 'AIza...', sessionKey: 'omniask_gemini_key' },
  { key: 'chatgpt', label: 'ChatGPT (OpenAI)', placeholder: 'sk-...', sessionKey: 'omniask_openai_key' },
  { key: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-...', sessionKey: 'omniask_anthropic_key' },
];

// Map AIProvider → the `has_*` column name returned by the DB
const HAS_KEY: Record<AIProvider, keyof HasKeysStatus> = {
  perplexity: 'has_perplexity',
  gemini: 'has_google',
  chatgpt: 'has_openai',
  claude: 'has_anthropic',
};

interface HasKeysStatus {
  has_openai: boolean;
  has_anthropic: boolean;
  has_google: boolean;
  has_perplexity: boolean;
}

export function ApiKeysModal({ open, onOpenChange, accessToken }: ApiKeysModalProps) {
  const [keys, setKeys] = useState<Record<AIProvider, string>>({
    perplexity: '',
    gemini: '',
    chatgpt: '',
    claude: '',
  });
  const [showKey, setShowKey] = useState<Record<AIProvider, boolean>>({
    perplexity: false,
    gemini: false,
    chatgpt: false,
    claude: false,
  });
  const [savedStatus, setSavedStatus] = useState<HasKeysStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load existing key status when modal opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);

    if (isSupabaseConfigured && accessToken && supabase) {
      supabase
        .from('user_api_keys')
        .select('has_openai,has_anthropic,has_google,has_perplexity')
        .single()
        .then(({ data }) => {
          if (data) setSavedStatus(data as HasKeysStatus);
        });
    } else {
      // Demo mode: check sessionStorage
      const status: HasKeysStatus = {
        has_openai: Boolean(sessionStorage.getItem('omniask_openai_key')),
        has_anthropic: Boolean(sessionStorage.getItem('omniask_anthropic_key')),
        has_google: Boolean(sessionStorage.getItem('omniask_gemini_key')),
        has_perplexity: Boolean(sessionStorage.getItem('omniask_pplx_key')),
      };
      setSavedStatus(status);
    }
  }, [open, accessToken]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);

    try {
      if (isSupabaseConfigured && accessToken) {
        // Real mode: send to edge function for server-side encryption
        const res = await fetch(`${supabaseFunctionsUrl}/save-api-keys`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            openai: keys.chatgpt || undefined,
            anthropic: keys.claude || undefined,
            google: keys.gemini || undefined,
            perplexity: keys.perplexity || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const updated = await res.json() as HasKeysStatus;
        setSavedStatus(updated);
      } else {
        // Demo mode: sessionStorage only (with warning already shown in UI)
        PROVIDERS.forEach(({ key, sessionKey }) => {
          if (keys[key]) sessionStorage.setItem(sessionKey, keys[key]);
        });
        setSavedStatus({
          has_openai: Boolean(keys.chatgpt || sessionStorage.getItem('omniask_openai_key')),
          has_anthropic: Boolean(keys.claude || sessionStorage.getItem('omniask_anthropic_key')),
          has_google: Boolean(keys.gemini || sessionStorage.getItem('omniask_gemini_key')),
          has_perplexity: Boolean(keys.perplexity || sessionStorage.getItem('omniask_pplx_key')),
        });
      }

      // Clear the input fields after saving
      setKeys({ perplexity: '', gemini: '', chatgpt: '', claude: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save keys');
    } finally {
      setSaving(false);
    }
  }, [keys, accessToken]);

  const hasAnyNewKey = Object.values(keys).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Key className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>API Keys</DialogTitle>
          </div>
          <DialogDescription>
            Your keys are encrypted server-side and used only to proxy your
            requests. They are never logged or shared.
          </DialogDescription>
        </DialogHeader>

        {!isSupabaseConfigured && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Demo mode — keys are stored in <strong>sessionStorage</strong> only
              and will be cleared when you close the tab. Connect Supabase for
              secure, persistent key storage.
            </p>
          </div>
        )}

        <div className="space-y-4 pt-1">
          {PROVIDERS.map(({ key, label, placeholder }) => {
            const config = AI_CONFIG[key];
            const isSet = savedStatus?.[HAS_KEY[key]] ?? false;

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <span>{config.icon}</span>
                    <span>{label}</span>
                  </Label>
                  {isSet && (
                    <Badge variant="secondary" className="gap-1 text-xs text-chatgpt">
                      <Check className="h-3 w-3" /> Saved
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showKey[key] ? 'text' : 'password'}
                    placeholder={isSet ? '••••••••••••••••' : placeholder}
                    value={keys[key]}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="pr-9 font-mono text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey((prev) => ({ ...prev, [key]: !prev[key] }))}
                    tabIndex={-1}
                  >
                    {showKey[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-chatgpt">
              <Check className="h-4 w-4" /> Keys saved successfully
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !hasAnyNewKey}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save keys'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
