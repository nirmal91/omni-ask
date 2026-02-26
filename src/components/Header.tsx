/**
 * Header.tsx
 *
 * Sticky top bar. Additions over original:
 *  - User avatar / sign-in button (right side)
 *  - API Keys button (Key icon)
 *  - Both buttons trigger modals passed in via props
 */

import { Menu, Sparkles, Key, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from './ThemeToggle';
import { User } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenAuth: () => void;
  onOpenApiKeys: () => void;
  onSignOut: () => void;
  user: User | null;
}

export function Header({
  onToggleSidebar,
  onOpenAuth,
  onOpenApiKeys,
  onSignOut,
  user,
}: HeaderProps) {
  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="mr-2 md:mr-4"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo + name */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-perplexity via-gemini to-claude">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">
            OmniAsk
          </h1>
        </div>

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {/* API Keys button — always visible */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenApiKeys}
            aria-label="API Keys"
            title="Manage API Keys"
          >
            <Key className="h-4 w-4" />
          </Button>

          {/* Auth — only shown when Supabase is configured */}
          {isSupabaseConfigured && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="User menu"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.displayName ?? user.email} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">
                        {user.displayName ?? 'My Account'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onOpenApiKeys} className="gap-2">
                      <Key className="h-4 w-4" />
                      API Keys
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onSignOut}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenAuth}
                  className="gap-1.5"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  Sign in
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
