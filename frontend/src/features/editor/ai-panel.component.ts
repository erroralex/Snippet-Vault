import {
  Component, inject, input, signal, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Snippet, SnippetService } from '../../core/service/snippet.service';
import { AiService, AiInsights } from '../../core/service/ai.service';

type PanelState = 'checking' | 'ollama_down' | 'model_missing' | 'loading' | 'ready' | 'error';

/**
 * A sidebar panel that integrates with a local AI model (Ollama) to provide
 * automated insights for the currently selected code snippet.
 *
 * This component manages its own state machine to handle the various phases of
 * interacting with the local AI service. It checks if Ollama is running and
 * if the required model is available, providing helpful terminal commands to the
 * user if they are not. When ready, it streams an analysis request to the model
 * and displays the generated summary and suggested tags. It includes interactive
 * UI elements to accept or reject the suggested tags and save them back to the
 * snippet's data via the SnippetService.
 */
@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-panel">

      <div class="ai-header">
        <div class="ai-header-left">
          <span class="ai-dot" [class.loading]="state() === 'loading' || state() === 'checking'"></span>
          AI Insights
        </div>
        <button
          class="refresh-btn"
          [disabled]="state() === 'loading' || state() === 'checking'"
          (click)="refresh()"
          title="Refresh">↺</button>
      </div>

      @switch (state()) {

        @case ('checking') {
          <div class="ai-body">
            <p class="status-msg muted">Checking Ollama…</p>
          </div>
        }

        @case ('ollama_down') {
          <div class="ai-body">
            <div class="ollama-status">
              <span class="status-icon">⬡</span>
              <p class="status-msg">Ollama is not running</p>
              <p class="status-hint">
                Start it with:<br>
                <code>ollama serve</code>
              </p>
              <button class="retry-btn" (click)="refresh()">Check again</button>
            </div>
          </div>
        }

        @case ('model_missing') {
          <div class="ai-body">
            <div class="ollama-status">
              <span class="status-icon warn">⬡</span>
              <p class="status-msg">Model not installed</p>
              <p class="status-hint">
                Run in a terminal:<br>
                <code>ollama pull qwen2.5-coder:3b</code>
              </p>
              <button class="retry-btn" (click)="refresh()">Check again</button>
            </div>
          </div>
        }

        @case ('loading') {
          <div class="ai-body">
            <p class="status-msg muted" style="margin-bottom: -4px">{{ loadingMessage() }}</p>
            <div class="skeleton-label"></div>
            <div class="skeleton-tags">
              <div class="skeleton-tag"></div>
              <div class="skeleton-tag w60"></div>
              <div class="skeleton-tag w80"></div>
            </div>
            <div class="skeleton-label mt"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line w70"></div>
          </div>
        }

        @case ('error') {
          <div class="ai-body">
            <p class="error-msg">{{ errorMessage() }}</p>
            <button class="retry-btn" (click)="refresh()">Try again</button>
          </div>
        }

        @case ('ready') {
          <div class="ai-body">

            <div class="ai-section">
              <div class="ai-label">Tags</div>
              <div class="tag-group">
                @for (tag of insights()!.tags; track tag) {
                  <span
                    class="tag-chip"
                    [class.accepted]="isAccepted(tag)"
                    (click)="toggleTag(tag)"
                    [title]="isAccepted(tag) ? 'Click to remove' : 'Click to add'">
                    {{ tag }}
                  </span>
                }
                @if (insights()!.tags.length === 0) {
                  <span class="no-tags">No tags suggested</span>
                }
              </div>
              @if (pendingChanges()) {
                <button class="save-tags-btn" (click)="saveTags()">Save tags</button>
              }
            </div>

            <div class="ai-section">
              <div class="ai-label">Summary</div>
              <p class="ai-summary">{{ insights()!.summary }}</p>
            </div>

          </div>
        }

      }

    </div>
  `,
  styles: [`
    .ai-panel {
      width: 200px; min-width: 200px;
      border-left: 1px solid var(--border-light);
      background: var(--bg-panel);
      backdrop-filter: var(--glass-blur);
      display: flex; flex-direction: column; overflow-y: auto;
    }

    .ai-header {
      padding: 9px 10px; border-bottom: 1px solid var(--border-light);
      font-size: 10px; font-weight: 700; color: var(--text-secondary);
      display: flex; align-items: center; justify-content: space-between;
      letter-spacing: 0.1em; text-transform: uppercase; flex-shrink: 0;
    }

    .ai-header-left { display: flex; align-items: center; gap: 6px; }

    .ai-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #50fa7b; box-shadow: 0 0 6px rgba(80,250,123,0.6); flex-shrink: 0;
      transition: background 0.3s;
      &.loading {
        background: var(--accent-secondary);
        box-shadow: 0 0 6px rgba(255,45,120,0.6);
        animation: glow-pulse 1s ease-in-out infinite;
      }
    }

    .refresh-btn {
      background: none; border: none; color: var(--text-muted); cursor: pointer;
      font-size: 13px; padding: 0 2px; line-height: 1;
      transition: color var(--dur-fast), transform var(--dur-fast);
      &:hover:not(:disabled) { color: var(--accent-primary); transform: rotate(180deg); }
      &:disabled { opacity: 0.2; cursor: default; }
    }

    .ai-body { padding: 10px; display: flex; flex-direction: column; gap: 12px; }

    // Skeletons
    .skeleton-label  { height: 7px; width: 36px; background: rgba(255,255,255,0.04); border-radius: 4px; }
    .skeleton-label.mt { margin-top: 4px; }
    .skeleton-tags   { display: flex; gap: 4px; flex-wrap: wrap; }
    .skeleton-tag    { height: 18px; width: 46px; background: rgba(255,255,255,0.04); border-radius: 99px; animation: glow-pulse 1.8s ease-in-out infinite; }
    .skeleton-tag.w60 { width: 60px; animation-delay: 0.2s; }
    .skeleton-tag.w80 { width: 80px; animation-delay: 0.4s; }
    .skeleton-line   { height: 7px; background: rgba(255,255,255,0.04); border-radius: 4px; animation: glow-pulse 1.8s ease-in-out infinite; }
    .skeleton-line.w70 { width: 70%; animation-delay: 0.3s; }

    // States
    .error-msg { font-size: 11px; color: var(--accent-secondary); line-height: 1.5; margin: 0; }
    .retry-btn {
      font-size: 11px; padding: 3px 10px;
      border: 1px solid var(--border-light); border-radius: 5px;
      background: transparent; color: var(--text-secondary); cursor: pointer;
      align-self: flex-start; transition: all var(--dur-fast);
      &:hover { border-color: var(--accent-primary); color: var(--accent-primary); box-shadow: var(--shadow-glow-primary); }
    }

    .ai-section { display: flex; flex-direction: column; gap: 5px; }

    .ai-label {
      font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;
    }

    .tag-group { display: flex; flex-wrap: wrap; gap: 4px; }

    .tag-chip {
      font-size: 10px; padding: 2px 7px; border-radius: 99px; cursor: pointer;
      border: 1px dashed var(--border-light); color: var(--text-muted); background: transparent;
      transition: all var(--dur-fast);
      &.accepted {
        background: rgba(162,89,255,0.15); color: var(--accent-secondary);
        border: 1px solid rgba(162,89,255,0.4);
        box-shadow: 0 0 6px rgba(162,89,255,0.2);
      }
      &:hover { border-color: var(--accent-primary); color: var(--accent-primary); border-style: solid; }
    }

    .no-tags { font-size: 11px; color: var(--text-muted); font-style: italic; }

    .save-tags-btn {
      margin-top: 3px; font-size: 10px; padding: 3px 10px;
      border: 1px solid rgba(0,229,255,0.4); border-radius: 5px;
      background: rgba(0,229,255,0.08); color: var(--accent-primary); cursor: pointer;
      align-self: flex-start;
      &:hover { background: rgba(0,229,255,0.15); box-shadow: var(--shadow-glow-primary); }
    }

    .ai-summary {
      font-size: 11px; color: var(--text-secondary); line-height: 1.6; margin: 0;
      padding: 6px 9px; background: rgba(0,0,0,0.6); border-radius: 5px;
      border: 1px solid var(--border-light);
      border-left: 2px solid var(--accent-secondary);
    }

    // Ollama status states
    .ollama-status { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .status-icon { font-size: 18px; color: var(--text-muted); &.warn { color: var(--accent-secondary); } }
    .status-msg { font-size: 12px; color: var(--text-secondary); margin: 0; font-weight: 500; &.muted { color: var(--text-muted); font-weight: 400; } }
    .status-hint { font-size: 11px; color: var(--text-muted); line-height: 1.7; margin: 0; }
    .status-hint code {
      display: inline-block; margin-top: 3px; padding: 2px 7px;
      background: rgba(0,0,0,0.6); border: 1px solid var(--border-light); border-radius: 4px;
      color: var(--accent-primary); font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 10px;
      user-select: text;
    }
  `]
})
export class AiPanelComponent {
  snippet = input.required<Snippet>();

  private aiService  = inject(AiService);
  private snippetService = inject(SnippetService);

  state        = signal<PanelState>('checking');
  insights     = signal<AiInsights | null>(null);
  errorMessage = signal('');
  acceptedTags = signal<Set<string>>(new Set());
  pendingChanges = signal(false);
  loadingMessage = signal('Analyzing snippet…');

  constructor() {
    effect(() => {
      const s = this.snippet();
      if (s) this.loadInsights(s, false);
    });
  }

  private async loadInsights(snippet: Snippet, bustCache: boolean): Promise<void> {
    if (bustCache) this.aiService.clearCache(snippet.id);

    this.state.set('checking');
    this.acceptedTags.set(new Set(snippet.tags ?? []));
    this.pendingChanges.set(false);

    const status = await this.aiService.checkOllamaStatus();

    if (status === 'not_running') {
      this.state.set('ollama_down');
      return;
    }

    if (status === 'model_missing') {
      this.state.set('model_missing');
      return;
    }

    this.state.set('loading');

    const isFirstRun = !(this.aiService as any).insightsCache.size;
    this.loadingMessage.set(
      isFirstRun
        ? 'Loading model (first run may take ~15s)…'
        : 'Analyzing snippet…'
    );

    try {
      const result = await this.aiService.getInsights(snippet);
      this.insights.set(result);
      this.state.set('ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error.';
      this.errorMessage.set(msg);
      this.state.set('error');
    }
  }

  refresh(): void {
    this.loadInsights(this.snippet(), true);
  }

  isAccepted(tag: string): boolean {
    return this.acceptedTags().has(tag);
  }

  toggleTag(tag: string): void {
    const current = new Set(this.acceptedTags());
    current.has(tag) ? current.delete(tag) : current.add(tag);
    this.acceptedTags.set(current);
    this.pendingChanges.set(true);
  }

  saveTags(): void {
    const id = this.snippet().id;
    const tags = [...this.acceptedTags()];
    this.snippetService.updateTags(id, tags).subscribe({
      next: () => {
        this.pendingChanges.set(false);
        this.aiService.clearCache(id);
      },
      error: () => alert('Failed to save tags.')
    });
  }
}
