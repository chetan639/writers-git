'use client';

import React from 'react';
import Link from 'next/link';
import Logo from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';

interface AppHeaderProps {
  /** Where the wordmark links to. Signed-out pages point back at the door. */
  homeHref?: string;
  /** Breadcrumb-ish label shown after the wordmark. */
  context?: React.ReactNode;
  /** Right-hand actions, rendered before the theme toggle. */
  actions?: React.ReactNode;
  /** Sticks to the top and blurs the content scrolling under it. */
  sticky?: boolean;
}

export default function AppHeader({
  homeHref = '/dashboard',
  context,
  actions,
  sticky = true,
}: AppHeaderProps) {
  return (
    <header
      className={`${sticky ? 'sticky top-0 z-40' : ''} border-b border-rule bg-paper/80 backdrop-blur-md`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={homeHref}
          className="shrink-0 rounded-lg transition-opacity hover:opacity-80"
          aria-label="GitWriter home"
        >
          <Logo size={28} />
        </Link>

        {context && (
          <>
            <span aria-hidden className="hidden text-ink-3/60 sm:inline">
              /
            </span>
            <div className="min-w-0 flex-1 truncate text-sm text-ink-2">{context}</div>
          </>
        )}

        <div className={`flex items-center gap-1.5 ${context ? '' : 'ml-auto'}`}>
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
