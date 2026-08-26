'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../lib/api';
import Button from './ui/Button';
import Input from './ui/Input';
import Logo from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';

/** The pitch, told as a version history — the product explaining itself. */
const HISTORY = [
  { hash: 'a1f0c4e', label: 'Cut the flashback. It was slowing chapter three.', when: 'this morning' },
  { hash: '7b2d918', label: 'Gave Mara the last word in the argument.', when: 'yesterday' },
  { hash: '3e9a077', label: 'First draft of the opening.', when: 'three weeks ago' },
];

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Backend now sets the cookie automatically!
        await api.post('/login', { email, password });
        toast.success('Welcome back.');
        router.push('/dashboard'); // <-- Let middleware handle the redirect
      } else {
        await api.post('/signup', { username, email, password });
        toast.success('Your desk is ready. Log in to begin.');
        setIsLogin(true);
      }
    } catch (error) {
      console.error(isLogin ? 'Login failed:' : 'Signup failed:', error);
      toast.error(
        isLogin ? 'Login failed. Check your credentials.' : 'Signup failed. Try a different email.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── Left: the story ─────────────────────────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-panel p-12 text-panel-ink lg:flex xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              'radial-gradient(50rem 30rem at 15% 0%, rgba(224,138,99,0.16), transparent 60%),' +
              'radial-gradient(40rem 30rem at 100% 100%, rgba(224,138,99,0.10), transparent 60%)',
          }}
        />

        <div className="relative">
          <Logo size={30} showWordmark={false} />
          <span className="ml-3 align-middle font-display text-xl font-semibold tracking-[-0.02em] text-panel-ink">
            GitWriter
          </span>
        </div>

        <div className="relative max-w-xl">
          <h1 className="font-display text-[clamp(2.25rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-panel-ink">
            Every draft you were
            <br />
            afraid to delete.
          </h1>
          <p className="mt-6 max-w-md font-serif text-lg leading-relaxed text-panel-ink-2">
            Write freely, cut ruthlessly. GitWriter keeps every version of your manuscript, so the
            sentence you tore out last spring is still there when you want it back.
          </p>

          {/* The version history, as the product's own argument. */}
          <ol className="mt-12 space-y-0">
            {HISTORY.map((entry, i) => (
              <li key={entry.hash} className="relative flex gap-4 pb-7 last:pb-0">
                {i < HISTORY.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[5px] top-4 h-full w-px bg-panel-ink/20"
                  />
                )}
                <span
                  aria-hidden
                  className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    i === 0 ? 'bg-accent' : 'bg-panel-ink/35'
                  }`}
                />
                <div className="min-w-0">
                  <p className="font-serif text-[15px] leading-snug text-panel-ink">{entry.label}</p>
                  <p className="mt-1 font-mono text-[11px] tracking-wide text-panel-ink-2">
                    {entry.hash} · {entry.when}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative font-serif text-sm italic text-panel-ink-2">
          &ldquo;Writing is rewriting.&rdquo;
        </p>
      </aside>

      {/* ── Right: the door ─────────────────────────────────────────────── */}
      <main className="relative flex flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden">
            <Logo size={26} />
          </span>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem] animate-rise">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] text-ink">
              {isLogin ? 'Welcome back' : 'Start your first draft'}
            </h2>
            <p className="mt-2 text-[15px] text-ink-2">
              {isLogin
                ? 'Pick up where the last version left off.'
                : 'A desk, a blank page, and a memory that never loses a word.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {!isLogin && (
                <Input
                  label="Pen name"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="How your work is signed"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button type="submit" size="lg" fullWidth loading={isLoading} className="!mt-6">
                {isLoading ? 'One moment…' : isLogin ? 'Open my desk' : 'Create my desk'}
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-rule" />
              <span className="text-xs text-ink-3">
                {isLogin ? 'New here?' : 'Already writing with us?'}
              </span>
              <span className="h-px flex-1 bg-rule" />
            </div>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="mt-4 w-full rounded-[10px] border border-rule-strong px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
            >
              {isLogin ? 'Create an account' : 'Log in instead'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
