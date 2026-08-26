'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import Button from './ui/Button';
import { PlusIcon, SearchIcon } from './ui/icons';
import { coverFor } from '../lib/cover';
import { relativeTime } from '../lib/text';

interface Project {
  id: string;
  title: string;
  created_at: string;
}

interface DashboardProps {
  onStartNewBook: () => void;
  onOpenProject: (uuid: string, title: string) => void;
}

function BookCard({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: () => void;
}) {
  const [from, to] = coverFor(project.title);
  const started = relativeTime(project.created_at);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="group animate-rise card overflow-hidden text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-rule-strong hover:shadow-float focus-visible:-translate-y-1"
    >
      {/* The jacket */}
      <div
        className="relative flex aspect-[7/5] items-end p-5"
        style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
      >
        {/* Spine shadow, so the block reads as a book rather than a swatch. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[10px]"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.32), rgba(255,255,255,0.06))' }}
        />
        <span
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(28rem 14rem at 85% 0%, rgba(255,255,255,0.16), transparent 65%)' }}
        />
        <h3 className="relative line-clamp-3 pl-3 font-display text-[1.35rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[#f5efe6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
          {project.title}
        </h3>
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="truncate text-[13px] text-ink-3">
          {started ? `Started ${started}` : 'Manuscript'}
        </span>
        <span className="shrink-0 text-[13px] font-medium text-ink-3 transition-colors group-hover:text-accent">
          Open &rarr;
        </span>
      </div>
    </button>
  );
}

function CardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="card animate-fade overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-hidden
    >
      <div className="aspect-[7/5] animate-pulse bg-surface-2" />
      <div className="flex items-center justify-between px-5 py-4">
        <span className="h-3 w-28 animate-pulse rounded-full bg-surface-2" />
        <span className="h-3 w-10 animate-pulse rounded-full bg-surface-2" />
      </div>
    </div>
  );
}

export default function Dashboard({ onStartNewBook, onOpenProject }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data.projects || []);
      } catch (error) {
        toast.error('Failed to load projects.');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Your desk</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-[-0.03em]">
            Manuscripts
          </h1>
          <p className="mt-2 text-[15px] text-ink-2">
            {isLoading
              ? 'Gathering your pages…'
              : projects.length === 0
                ? 'Nothing on the desk yet.'
                : `${projects.length} ${projects.length === 1 ? 'book' : 'books'} in progress.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {projects.length > 0 && (
            <div className="relative flex-1 md:w-56 md:flex-none">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a book"
                aria-label="Search your manuscripts"
                className="field !py-2 pl-9"
              />
            </div>
          )}
          <Button onClick={onStartNewBook} size="lg" className="shrink-0">
            <PlusIcon size={16} />
            New manuscript
          </Button>
        </div>
      </div>

      <div className="divider-rule my-8" />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyDesk onStartNewBook={onStartNewBook} />
      ) : visible.length === 0 ? (
        <p className="py-20 text-center text-[15px] text-ink-2">
          No manuscript matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((proj, i) => (
            <BookCard
              key={proj.id}
              project={proj}
              index={i}
              onOpen={() => onOpenProject(proj.id, proj.title)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyDesk({ onStartNewBook }: { onStartNewBook: () => void }) {
  return (
    <div className="animate-rise card mx-auto flex max-w-2xl flex-col items-center px-8 py-16 text-center">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden className="mb-6">
        <rect x="14" y="10" width="44" height="54" rx="4" className="fill-surface-2 stroke-rule-strong" strokeWidth="1.5" />
        <path d="M24 24h24M24 32h24M24 40h16" className="stroke-rule-strong" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="52" cy="52" r="9" className="fill-accent-soft stroke-accent" strokeWidth="1.5" />
        <path d="M52 48v8M48 52h8" className="stroke-accent" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
        The page is blank. Good.
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
        Start a manuscript and GitWriter will keep a version of every draft you save — including the
        ones you talk yourself out of.
      </p>
      <Button onClick={onStartNewBook} size="lg" className="mt-7">
        <PlusIcon size={16} />
        Start your first book
      </Button>
    </div>
  );
}
