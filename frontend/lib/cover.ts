/** Muted, book-cloth duotones. Chosen so cream type sits comfortably on any of them. */
export const COVERS: ReadonlyArray<readonly [string, string]> = [
  ['#2f3e46', '#52796f'],
  ['#3d2c29', '#8c5a45'],
  ['#2b2d42', '#5c6784'],
  ['#402d3c', '#7a5069'],
  ['#33322c', '#78744f'],
  ['#3b2a2a', '#a05c4a'],
];

/** Stable per-title cover, so a book keeps its jacket between visits. */
export function coverFor(title: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return COVERS[hash % COVERS.length];
}
