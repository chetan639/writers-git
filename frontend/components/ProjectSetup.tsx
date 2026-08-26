'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Button from './ui/Button';
import { ArrowLeftIcon } from './ui/icons';
import { coverFor } from '../lib/cover';

interface ProjectSetupProps {
  onProjectCreated: (uuid: string, title: string) => void;
}

export default function ProjectSetup({ onProjectCreated }: ProjectSetupProps) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const trimmed = title.trim();
  const [from, to] = coverFor(trimmed || 'untitled');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return toast.error('Give the book a working title first.');

    setIsCreating(true);
    try {
      const response = await api.post('/projects', {
        title: trimmed,
      });

      const { project_uuid } = response.data;
      toast.success('Your manuscript is open.');
      onProjectCreated(project_uuid, trimmed);
    } catch (error) {
      toast.error('Failed to create project. Is the backend running?');
      console.error('CORS or Network Error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        Back to your desk
      </Link>

      <div className="mt-8 grid animate-rise items-center gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14">
        <div>
          <p className="eyebrow">New manuscript</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
            What are we calling it?
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
            A working title is enough. It goes on the jacket, and every version you save from here
            will be filed under it.
          </p>

          <form onSubmit={handleCreate} className="mt-8">
            <label htmlFor="book-title" className="label">
              Title
            </label>
            <input
              id="book-title"
              type="text"
              autoFocus
              className="field !py-3 !font-[family-name:var(--font-newsreader)] !text-xl"
              placeholder="The Winds of Winter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
            />

            <Button
              type="submit"
              size="lg"
              className="mt-5"
              loading={isCreating}
              disabled={!trimmed}
            >
              {isCreating ? 'Setting the page…' : 'Open the manuscript'}
            </Button>
          </form>
        </div>

        {/* Live jacket, so the title lands somewhere before a word is written. */}
        <div className="hidden md:block">
          <div
            className="relative mx-auto flex aspect-[3/4] w-full max-w-[19rem] items-center justify-center rounded-r-[14px] rounded-l-[6px] p-8 shadow-float transition-[background] duration-500"
            style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-3 rounded-l-[6px]"
              style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.35), rgba(255,255,255,0.07))' }}
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-r-[14px] rounded-l-[6px] opacity-70"
              style={{ background: 'radial-gradient(24rem 16rem at 80% 0%, rgba(255,255,255,0.18), transparent 65%)' }}
            />
            <p
              className={`relative text-center font-display leading-[1.15] tracking-[-0.02em] text-[#f5efe6] drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${
                trimmed ? 'text-[1.65rem] font-semibold' : 'text-lg italic opacity-50'
              }`}
            >
              {trimmed || 'Untitled'}
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-ink-3">Your jacket, chosen by the title.</p>
        </div>
      </div>
    </div>
  );
}
