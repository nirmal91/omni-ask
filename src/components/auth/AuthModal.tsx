/**
 * AuthModal.tsx
 *
 * Sign-in / sign-up dialog.
 * - Email + password (toggle between sign-in and sign-up)
 * - Google OAuth
 * - "Continue without signing in" — full app works in demo mode
 *
 * Only renders when Supabase is configured. In demo mode the component
 * still mounts (so Index.tsx doesn't need to branch) but returns null.
 */

import { useState, useCallback } from 'react';
import { Sparkles, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // No Supabase → don't render (app works fine without auth)
  if (!isSupabaseConfigured) return null;

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) return;
      clearMessages();
      setLoading(true);
      try {
        if (mode === 'signin') {
          await signInWithEmail(email, password);
          onOpenChange(false);
        } else {
          await signUpWithEmail(email, password);
          setSuccessMsg('Check your email to confirm your account.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [email, password, mode, signInWithEmail, signUpWithEmail, onOpenChange],
  );

  const handleGoogle = useCallback(async () => {
    clearMessages();
    setLoading(true);
    try {
      await signInWithGoogle();
      // Google OAuth redirects away — modal will close naturally
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  }, [signInWithGoogle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-perplexity via-gemini to-claude">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-xl">
              {mode === 'signin' ? 'Sign in to OmniAsk' : 'Create your account'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {mode === 'signin'
              ? 'Sign in to save conversations and use your own API keys.'
              : 'Create an account to save conversations across sessions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Email + password */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  className="pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {successMsg && (
              <p className="text-sm text-chatgpt">{successMsg}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  className="text-foreground underline underline-offset-2 hover:text-primary"
                  onClick={() => { setMode('signup'); clearMessages(); }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  className="text-foreground underline underline-offset-2 hover:text-primary"
                  onClick={() => { setMode('signin'); clearMessages(); }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <Separator />

          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-xs"
            onClick={() => onOpenChange(false)}
          >
            Continue without signing in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
