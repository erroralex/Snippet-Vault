const COLOR_MAP: Record<string, string> = {
  java:        'var(--lang-java)',
  typescript:  'var(--lang-typescript)',
  javascript:  'var(--lang-javascript)',
  python:      'var(--lang-python)',
  html:        'var(--lang-html)',
  css:         'var(--lang-css)',
  scss:        'var(--lang-scss)',
  sql:         'var(--lang-sql)',
  json:        'var(--lang-json)',
  markdown:    'var(--lang-markdown)',
  prompt:      'var(--lang-prompt)',
  kotlin:      'var(--lang-kotlin)',
  rust:        'var(--lang-rust)',
  go:          'var(--lang-go)',
  csharp:      'var(--lang-csharp)',
  php:         'var(--lang-php)',
  ruby:        'var(--lang-ruby)',
  swift:       'var(--lang-swift)',
  bash:        'var(--lang-bash)',
  shell:       'var(--lang-bash)',
  dockerfile:  'var(--lang-dockerfile)',
  yaml:        'var(--lang-yaml)',
  xml:         'var(--lang-xml)',
  text:        'var(--lang-text)',
};

/**
 * Provides utility functions for determining the display color associated with a programming
 * language within the Snippet Vault application. This module centralizes the logic for mapping
 * a language name (e.g., 'typescript') to a corresponding CSS variable that defines its
 * representative color. It also handles cases where a user has assigned a custom color label
 * to a snippet, giving that selection priority. Additionally, it includes a function to
 * generate a dimmed background color variant, suitable for UI elements like tags or labels,
 * by mixing the base language color with a neutral background shade.
 */
export function languageColor(language: string, colorLabel?: string | null): string {
  if (colorLabel) return colorLabel;
  return COLOR_MAP[language?.toLowerCase()] ?? 'var(--lang-default)';
}

/**
 * Returns a dimmed version of the language color for backgrounds.
 * Uses CSS color-mix — supported in all modern Chromium versions (Electron uses Chromium).
 */
export function languageColorBg(language: string, colorLabel?: string | null): string {
  const base = languageColor(language, colorLabel);
  return `color-mix(in srgb, ${base} 12%, #252526)`;
}
