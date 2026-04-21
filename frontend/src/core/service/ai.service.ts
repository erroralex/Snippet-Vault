import {Injectable} from '@angular/core';
import {Snippet} from './snippet.service';

export interface AiInsights {
  tags: string[];
  summary: string;
}

export type OllamaStatus = 'unknown' | 'running' | 'not_running' | 'model_missing';

const OLLAMA_BASE = 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5-coder:3b';
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * ──────────────────────────────────────────────
 * <h2>AiService</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Manages interactions with the local Ollama AI instance to generate intelligent insights, summaries, and tags for code snippets.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Checks the availability and status of the local Ollama server and verifies the presence of required language models.</li>
 * <li>Constructs optimized, context-aware prompts based on a snippet's language, title, description, and source code.</li>
 * <li>Communicates asynchronously with the Ollama API, specifically requesting structured JSON output.</li>
 * <li>Handles network errors, timeouts, and missing model scenarios gracefully.</li>
 * <li>Parses and sanitizes the AI's response to extract structured metadata (tags and summaries).</li>
 * <li>Implements an in-memory caching mechanism to prevent redundant API calls for unchanged snippet content.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Injectable} service providing AI integration capabilities, utilizing the native {@code fetch} API for HTTP requests and managing internal state for performance optimization via caching.</p>
 * ──────────────────────────────────────────────
 */
@Injectable({providedIn: 'root'})
export class AiService {
  private insightsCache = new Map<string, AiInsights>();

  async checkOllamaStatus(): Promise<OllamaStatus> {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });

      if (!res.ok) return 'not_running';

      const data = await res.json();
      const models: string[] = (data.models ?? []).map((m: any) =>
        (m.name as string).split(':')[0]
      );
      const modelBase = OLLAMA_MODEL.split(':')[0];
      const hasModel = models.some(name => name === modelBase);

      return hasModel ? 'running' : 'model_missing';

    } catch {
      return 'not_running';
    }
  }

  async getInsights(snippet: Snippet): Promise<AiInsights> {
    const cacheKey = `${snippet.id}-${snippet.content.length}-${(snippet.description ?? '').length}`;
    if (this.insightsCache.has(cacheKey)) {
      return this.insightsCache.get(cacheKey)!;
    }

    const prompt = this.buildPrompt(snippet);
    const raw = await this.callOllama(prompt);
    const parsed = this.parseResponse(raw);

    this.insightsCache.set(cacheKey, parsed);
    return parsed;
  }

  private buildPrompt(snippet: Snippet): string {
    const lines: string[] = [];

    lines.push('You are a code analysis assistant.');
    lines.push('Respond with ONLY a JSON object — no explanation, no markdown, no code fences.');
    lines.push('');
    lines.push('Required shape:');
    lines.push('{"tags": ["tag1", "tag2", "tag3"], "summary": "one sentence under 15 words"}');
    lines.push('');
    lines.push('Tag rules:');
    lines.push('- 3 to 5 tags, all lowercase');
    lines.push('- Use technology names, design patterns, or concepts');
    lines.push('- Good examples: "jwt", "spring-security", "singleton", "rest", "sql"');
    lines.push('');
    lines.push('Summary rules:');
    lines.push('- Plain English, present tense');
    lines.push('- Maximum 15 words');
    lines.push('- Describe what the snippet DOES, not what language it is');
    lines.push('');
    lines.push(`Language: ${snippet.language}`);
    lines.push(`Title: ${snippet.title}`);

    if (snippet.description?.trim()) {
      lines.push(`Description: ${snippet.description.trim()}`);
    }

    lines.push('');
    lines.push('Code:');
    lines.push('```' + snippet.language);
    lines.push(snippet.content.slice(0, 1500));
    lines.push('```');
    lines.push('');
    lines.push('JSON response:');

    return lines.join('\n');
  }

  private async callOllama(prompt: string): Promise<string> {
    let response: Response;

    try {
      response = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
            num_predict: 200,
          }
        })
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new Error('Ollama request timed out. The model may still be loading — try again.');
      }
      throw new Error('Could not reach Ollama. Is it running?');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (response.status === 404) {
        throw new Error(`Model "${OLLAMA_MODEL}" not found. Run: ollama pull ${OLLAMA_MODEL}`);
      }
      throw new Error(`Ollama error ${response.status}: ${body.slice(0, 120)}`);
    }

    const data = await response.json();

    const text = data.response ?? '';
    if (!text) {
      throw new Error('Ollama returned an empty response.');
    }

    return text;
  }

  private parseResponse(raw: string): AiInsights {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          throw new Error('Could not parse Ollama response as JSON.');
        }
      } else {
        throw new Error('Could not parse Ollama response as JSON.');
      }
    }

    const tags: string[] = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: any) => typeof t === 'string').slice(0, 5)
      : [];

    const summary: string = typeof parsed.summary === 'string'
      ? parsed.summary.trim()
      : 'No summary generated.';

    return {tags, summary};
  }

  clearCache(snippetId?: string): void {
    if (snippetId) {
      for (const key of this.insightsCache.keys()) {
        if (key.startsWith(snippetId)) this.insightsCache.delete(key);
      }
    } else {
      this.insightsCache.clear();
    }
  }
}
