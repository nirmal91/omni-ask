/**
 * useAuth.ts
 *
 * Authentication state management.
 *
 * Demo mode  : always returns unauthenticated (no Supabase)
 * Real mode  : listens to Supabase auth state changes; exposes signIn,
 *              signUp, signInWithGoogle, signOut.
 *
 * The hook is a thin wrapper — all raw Supabase calls are isolated here so
 * the rest of the app only imports from this hook, making a React Native
 * port easy (swap the Supabase calls for your mobile auth provider).
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthState, User } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function supabaseUserToUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, string> }): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    avatarUrl: sbUser.user_metadata?.avatar_url,
    displayName: sbUser.user_metadata?.full_name ?? sbUser.user_metadata?.name,
  };
}

const INITIAL_STATE: AuthState = {
  status: isSupabaseConfigured ? 'loading' : 'unauthenticated',
  user: null,
  accessToken: null,
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_STATE);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthState({
          status: 'authenticated',
          user: supabaseUserToUser(session.user),
          accessToken: session.access_token,
        });
      } else {
        setAuthState({ status: 'unauthenticated', user: null, accessToken: null });
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthState({
          status: 'authenticated',
          user: supabaseUserToUser(session.user),
          accessToken: session.access_token,
        });
      } else {
        setAuthState({ status: 'unauthenticated', user: null, accessToken: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return {
    ...authState,
    isAuthenticated: authState.status === 'authenticated',
    isLoading: authState.status === 'loading',
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };
}
