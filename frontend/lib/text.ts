/** Words as a writer counts them: runs of non-whitespace. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Minutes at a conventional 225 wpm, floored at one so it never reads "0 min". */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 225));
}

export function formatCount(n: number): string {
  return n.toLocaleString();
}

export function relativeTime(iso: string): string | null {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}
