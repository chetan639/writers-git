import React from 'react';

/**
 * The mark reads as a commit graph and a bookmark at once: a spine with two
 * commits and one branch — a manuscript that remembers where it's been.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" className="fill-ink" />
      <g stroke="var(--ink-inverse)" strokeWidth="1.9" strokeLinecap="round" fill="none">
        <path d="M11 8.5v15" />
        <path d="M11 15.5h4a3 3 0 0 0 3-3v-1" />
      </g>
      <circle cx="11" cy="8.5" r="2.6" fill="var(--ink-inverse)" />
      <circle cx="11" cy="23.5" r="2.6" fill="var(--ink-inverse)" />
      <circle cx="20.5" cy="11.5" r="2.6" fill="var(--accent)" />
    </svg>
  );
}

export default function Logo({
  size = 28,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {showWordmark && (
        <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">
          GitWriter
        </span>
      )}
    </span>
  );
}
