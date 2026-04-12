/**
 * Linen quiet — soft olive walls, muted honey, dusty terracotta.
 * Keys are kebab-case so they match injected CSS custom properties (`define:vars`).
 */
const THEME_GREEN = "#353a34";

export const palette = {
  "theme-green": THEME_GREEN,
  "accent-mustard": "#c9a86a",
  "additional-red": "#a6756a",
  "accent-soft": "#e8d8b8",
  "terra-soft": "#e8cfc8",
  "page-a": THEME_GREEN,
  "page-b": "#2d322d",
  "page-c": "#262a26",
  "panel-a": "#3e443e",
  "panel-b": "#363b36",
  "text-primary": "#ebe8e2",
  "text-muted": "#b8b5ae",
  "text-body": "#d9d5cc",
  "text-meta": "#9a968e",
  /** Prose `<pre>` / code block surface (see post layout `.prose pre`). */
  "code-bg": "rgb(22 24 22 / 92%)",
  /** Code blocks: tighter than cards, not pill-shaped. */
  "radius-code": "0.55rem",
} as const;
