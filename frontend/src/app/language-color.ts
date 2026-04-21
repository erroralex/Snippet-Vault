/**
 * ──────────────────────────────────────────────
 * <h2>LanguageColor Utility</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides utility functions for resolving and applying display colors based on programming languages within the Snippet Vault application.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Maps programming language names (e.g., 'typescript', 'java') to specific CSS variables representing their standard colors.</li>
 * <li>Handles overrides by prioritizing user-assigned custom color labels when provided.</li>
 * <li>Provides a method to generate a dimmed background color variant suitable for UI elements like tags, utilizing modern CSS {@code color-mix}.</li>
 * <li>Ensures a fallback default color is applied when a language is unrecognized or unassigned.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A standalone utility module containing pure functions and a centralized mapping dictionary to ensure consistent language coloring across the UI components.</p>
 * ──────────────────────────────────────────────
 */
const COLOR_MAP: Record<string, string> = {
  java: 'var(--lang-java)',
  typescript: 'var(--lang-typescript)',
  javascript: 'var(--lang-javascript)',
  python: 'var(--lang-python)',
  html: 'var(--lang-html)',
  css: 'var(--lang-css)',
  scss: 'var(--lang-scss)',
  sql: 'var(--lang-sql)',
  json: 'var(--lang-json)',
  markdown: 'var(--lang-markdown)',
  prompt: 'var(--lang-prompt)',
  kotlin: 'var(--lang-kotlin)',
  rust: 'var(--lang-rust)',
  go: 'var(--lang-go)',
  csharp: 'var(--lang-csharp)',
  php: 'var(--lang-php)',
  ruby: 'var(--lang-ruby)',
  swift: 'var(--lang-swift)',
  bash: 'var(--lang-bash)',
  shell: 'var(--lang-bash)',
  dockerfile: 'var(--lang-dockerfile)',
  yaml: 'var(--lang-yaml)',
  xml: 'var(--lang-xml)',
  text: 'var(--lang-text)',
};

export function languageColor(language: string, colorLabel?: string | null): string {
  if (colorLabel) return colorLabel;
  return COLOR_MAP[language?.toLowerCase()] ?? 'var(--lang-default)';
}

export function languageColorBg(language: string, colorLabel?: string | null): string {
  const base = languageColor(language, colorLabel);
  return `color-mix(in srgb, ${base} 12%, #252526)`;
}
