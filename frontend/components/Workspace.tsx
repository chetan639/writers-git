'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import DiffVisualizer from './DiffVisualizer';
import api from '../lib/api';
import Button from './ui/Button';
import { CommitIcon, CompareIcon, FileIcon, PenIcon } from './ui/icons';
import { countWords, formatCount, readingMinutes } from '../lib/text';

const SimpleMdeReact = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center text-sm text-ink-3">
      Setting the page…
    </div>
  ),
});

interface WorkspaceProps {
  bookTitle: string;
  lastSavedText: string;
  setLastSavedText: (text: string) => void;
}

export default function Workspace({ bookTitle, lastSavedText, setLastSavedText }: WorkspaceProps) {
  const params = useParams();
  const projectUuid = params?.id as string;

  const [filePath, setFilePath] = useState('chapter_1.md');
  const [currentText, setCurrentText] = useState(lastSavedText);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [lastCommit, setLastCommit] = useState<string | null>(null);

  // lastSavedText arrives asynchronously (and again after each save). Adjusting
  // during render — rather than in an effect — avoids a flash of stale text.
  const [syncedFrom, setSyncedFrom] = useState(lastSavedText);
  if (syncedFrom !== lastSavedText) {
    setSyncedFrom(lastSavedText);
    setCurrentText(lastSavedText);
  }

  // Stable options reference — prevents SimpleMDE from reinitializing
  // CodeMirror on every render, which would reset the cursor position
  const editorOptions = useMemo(() => ({
    spellChecker: false,
    autofocus: true,
    lineWrapping: true,
    minHeight: '60vh',
    placeholder: 'Chapter One…\n\nBegin anywhere. Every version you save is kept.',
    // EasyMDE otherwise injects a stylesheet from a long-dead Font Awesome CDN.
    // Our toolbar icons are masked SVG in globals.css instead.
    autoDownloadFontAwesome: false,
    // Our own status bar below the editor reports words and reading time.
    status: false,
    sideBySideFullscreen: false,
    previewClass: ['editor-preview', 'manuscript'],
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'code', '|',
      'preview', 'side-by-side', 'fullscreen',
      'guide',
    ],
  }) as const, []);

  const words = countWords(currentText);
  const savedWords = countWords(lastSavedText);
  const wordDelta = words - savedWords;
  const isDirty = currentText !== lastSavedText;

  const handleCommit = async () => {
    if (!projectUuid) {
      return toast.error('Project UUID is missing. Cannot save.');
    }
    if (!filePath.trim() || !filePath.endsWith('.md')) {
      return toast.error('Please provide a valid file path ending in .md');
    }
    if (!isDirty) {
      return toast('Nothing has changed since the last version.', { icon: '✎' });
    }

    setIsSaving(true);
    try {
      const response = await api.post('/projects/save', {
        project_uuid: projectUuid,
        file_path: filePath,
        content: currentText,
        // author_name is entirely removed. Backend handles it via the HttpOnly JWT!
      });

      setLastSavedText(currentText);
      setLastCommit(response.data.commit_hash);
      toast.success('Version saved.');
      setShowDiff(false);
    } catch (error) {
      toast.error('Failed to save this version.');
      console.error('Commit Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ⌘S / Ctrl+S saves a version — the reflex every writer already has.
  const commitRef = useRef(handleCommit);
  useEffect(() => {
    commitRef.current = handleCommit;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        commitRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* ── Title block ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Manuscript</p>
          <h1 className="mt-1.5 truncate font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.03em]">
            {bookTitle}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowDiff(!showDiff)}
            disabled={!showDiff && !isDirty}
            title={
              !isDirty ? 'No changes to compare yet' : 'See what changed since the last version'
            }
          >
            {showDiff ? <PenIcon size={16} /> : <CompareIcon size={16} />}
            {showDiff ? 'Back to writing' : 'Compare'}
          </Button>

          <Button size="lg" onClick={handleCommit} loading={isSaving} disabled={!isDirty}>
            {!isSaving && <CommitIcon size={16} />}
            {isSaving ? 'Saving…' : 'Save version'}
          </Button>
        </div>
      </div>

      {/* ── The sheet ────────────────────────────────────────────────────── */}
      {/* No overflow-hidden here: it would trap the editor's sticky toolbar. */}
      <div className="card">
        {/* File bar */}
        {/* Fixed height (h-12) so the editor toolbar below can stick at a known offset. */}
        <div className="sticky top-16 z-20 flex h-12 items-center gap-3 rounded-t-[14px] border-b border-rule bg-surface-2 px-4">
          <FileIcon size={15} className="shrink-0 text-ink-3" />
          <label htmlFor="file-path" className="sr-only">
            File this draft is saved to
          </label>
          <input
            id="file-path"
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="chapter_1.md"
            title="The file inside your manuscript that this version is saved to"
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-[13px] text-ink transition-colors hover:border-rule-strong focus:border-accent focus:bg-surface focus:outline-none"
          />

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isDirty
                ? 'bg-accent-soft text-accent'
                : 'bg-transparent text-ink-3'
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-accent' : 'bg-ink-3'}`}
            />
            <span className="hidden sm:inline">
              {isDirty ? 'Unsaved changes' : 'All versions saved'}
            </span>
          </span>
        </div>

        {/* Editor or diff */}
        {showDiff ? (
          <DiffVisualizer oldText={lastSavedText} newText={currentText} />
        ) : (
          <SimpleMdeReact
            key={lastSavedText ? 'loaded' : 'empty'}
            value={currentText}
            onChange={setCurrentText}
            options={editorOptions}
          />
        )}

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-b-[14px] border-t border-rule bg-surface-2 px-4 py-2.5 text-[12px] text-ink-3">
          <span className="text-ink-2">
            <strong className="font-semibold text-ink">{formatCount(words)}</strong>{' '}
            {words === 1 ? 'word' : 'words'}
          </span>
          {wordDelta !== 0 && (
            <span className={wordDelta > 0 ? 'text-add-fg' : 'text-del-fg'}>
              {wordDelta > 0 ? '+' : '−'}
              {formatCount(Math.abs(wordDelta))} since last version
            </span>
          )}
          <span>{readingMinutes(words)} min read</span>
          <span className="ml-auto flex items-center gap-4">
            {lastCommit && (
              <span className="font-mono" title="Latest version">
                {lastCommit.slice(0, 7)}
              </span>
            )}
            <span className="hidden sm:inline">
              <kbd className="rounded border border-rule-strong bg-surface px-1.5 py-0.5 font-sans text-[10px] text-ink-2">
                ⌘S
              </kbd>{' '}
              saves a version
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
