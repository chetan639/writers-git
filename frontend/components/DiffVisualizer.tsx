'use client';

import React, { useMemo } from 'react';
import { diffWords } from 'diff';
import { countWords, formatCount } from '../lib/text';

interface DiffVisualizerProps {
  oldText: string;
  newText: string;
}

export default function DiffVisualizer({ oldText, newText }: DiffVisualizerProps) {
  const { parts, added, removed } = useMemo(() => {
    const parts = diffWords(oldText, newText);
    let added = 0;
    let removed = 0;
    for (const part of parts) {
      if (part.added) added += countWords(part.value);
      else if (part.removed) removed += countWords(part.value);
    }
    return { parts, added, removed };
  }, [oldText, newText]);

  const unchanged = added === 0 && removed === 0;

  return (
    <div>
      {/* Legend — reads as a revision summary, not a debug view. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-rule px-4 py-2.5 text-[12px]">
        <span className="eyebrow">Since your last version</span>
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-add-bg ring-1 ring-add-fg/30" />
          {formatCount(added)} added
        </span>
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-del-bg ring-1 ring-del-fg/30" />
          {formatCount(removed)} cut
        </span>
      </div>

      <div className="min-h-[60vh] px-[clamp(1rem,6vw,4rem)] py-9">
        {unchanged ? (
          <p className="mx-auto max-w-[42rem] font-serif text-[15px] italic text-ink-3">
            Not a word has moved since your last saved version.
          </p>
        ) : (
          <div className="manuscript mx-auto max-w-[42rem] whitespace-pre-wrap break-words">
            {parts.map((part, index) => {
              if (part.added) {
                return (
                  <ins
                    key={index}
                    className="rounded-[3px] bg-add-bg px-0.5 text-add-fg underline decoration-add-fg/35 underline-offset-4"
                  >
                    {part.value}
                  </ins>
                );
              }
              if (part.removed) {
                return (
                  <del
                    key={index}
                    className="rounded-[3px] bg-del-bg px-0.5 text-del-fg decoration-del-fg/50"
                  >
                    {part.value}
                  </del>
                );
              }
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
