import {
  Component, inject, signal, computed, HostListener,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SnippetService, Snippet } from '../core/service/snippet.service';
import { FolderService } from './folder.service';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  action: () => void;
  keywords: string[];
}

/**
 * ──────────────────────────────────────────────
 * <h2>CommandPaletteComponent</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides a fast, keyboard-driven interface for searching snippets and executing global application commands.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Displays an overlay palette accessible via global keyboard shortcuts (e.g., Ctrl+P or Cmd+P).</li>
 * <li>Allows unified search across snippet titles, languages, tags, descriptions, and predefined command keywords.</li>
 * <li>Displays a dynamically filtered list of matching snippets and executable commands based on user input.</li>
 * <li>Supports full keyboard navigation (up/down arrows) and selection (enter) within the results list.</li>
 * <li>Shows recent snippets by default when the search query is empty.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Component} that manages a floating UI overlay, handles complex global and localized keyboard events, and integrates with {@code SnippetService} and {@code FolderService} to execute application-wide actions and queries.</p>
 * ──────────────────────────────────────────────
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open()) {
      <div class="palette-backdrop" (click)="close()">
        <div class="palette-panel appear" (click)="$event.stopPropagation()">

          <div class="palette-search-row">
            <span class="palette-icon">⌕</span>
            <input
              #searchInput
              class="palette-input"
              [(ngModel)]="query"
              placeholder="Search snippets or type a command…"
              (keydown)="onKeydown($event)"
            />
            <kbd class="palette-esc">Esc</kbd>
          </div>

          <div class="palette-results">

            @if (matchingSnippets().length > 0) {
              <div class="result-group-label">Snippets</div>
              @for (snippet of matchingSnippets().slice(0, 5); track snippet.id; let i = $index) {
                <button
                  class="result-item pressable"
                  [class.focused]="focusedIndex() === i"
                  (click)="openSnippet(snippet)"
                  (mouseenter)="focusedIndex.set(i)">
                  <span class="result-lang"
                        [style.color]="langColor(snippet.language)">
                    {{ snippet.language }}
                  </span>
                  <span class="result-title">{{ snippet.title }}</span>
                  @if (snippet.description) {
                    <span class="result-hint">{{ snippet.description | slice:0:40 }}</span>
                  }
                </button>
              }
            }

            @if (matchingCommands().length > 0) {
              <div class="result-group-label">Commands</div>
              @for (cmd of matchingCommands().slice(0, 6); track cmd.id; let i = $index) {
                <button
                  class="result-item pressable"
                  [class.focused]="focusedIndex() === matchingSnippets().length + i"
                  (click)="runCommand(cmd)"
                  (mouseenter)="focusedIndex.set(matchingSnippets().length + i)">
                  <span class="result-cmd-icon">{{ cmd.icon }}</span>
                  <span class="result-title">{{ cmd.label }}</span>
                  @if (cmd.hint) {
                    <span class="result-hint">{{ cmd.hint }}</span>
                  }
                </button>
              }
            }

            @if (matchingSnippets().length === 0 && matchingCommands().length === 0) {
              <div class="no-results">No results for "{{ query }}"</div>
            }
          </div>

          <div class="palette-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .palette-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      z-index: var(--z-command-palette);
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 80px; backdrop-filter: var(--glass-blur);
    }

    .palette-panel {
      width: 580px; max-width: calc(100vw - 48px);
      background: var(--bg-menu);
      border: 1px solid rgba(230, 157, 103, 0.20); border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,0.7), var(--shadow-glow-primary);
      animation: drop-in var(--dur-standard) var(--ease-overlay) both;
    }

    .palette-search-row {
      display: flex; align-items: center; gap: 10px; padding: 14px 16px;
      border-bottom: 1px solid var(--border-light);
      background: linear-gradient(135deg, rgba(230, 157, 103, 0.05), rgba(212, 175, 55, 0.05));
    }

    .palette-icon { font-size: 16px; color: var(--accent-primary); flex-shrink: 0; }

    .palette-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--text-primary); font-size: 15px;
      &::placeholder { color: var(--text-muted); }
    }

    .palette-esc {
      font-size: 10px; padding: 2px 6px; background: rgba(255,255,255,0.04);
      border-radius: 4px; color: var(--text-muted); border: 1px solid var(--border-light);
    }

    .palette-results { max-height: 360px; overflow-y: auto; padding: 6px; }

    .result-group-label {
      font-size: 9px; color: var(--text-muted); text-transform: uppercase;
      letter-spacing: 0.1em; padding: 6px 8px 3px;
    }

    .result-item {
      display: flex; align-items: center; gap: 9px; width: 100%;
      padding: 8px 10px; background: transparent; border: none; border-radius: 7px;
      cursor: pointer; text-align: left; transition: all var(--dur-fast);
      &.focused, &:hover {
        background: rgba(255,255,255,0.04);
        box-shadow: inset 0 0 0 1px var(--border-light);
      }
    }

    .result-lang {
      font-size: 10px; text-transform: uppercase; font-weight: 700;
      min-width: 54px; flex-shrink: 0; letter-spacing: 0.05em;
    }

    .result-cmd-icon { font-size: 14px; min-width: 20px; text-align: center; flex-shrink: 0; }

    .result-title {
      font-size: 13px; color: var(--text-primary); flex: 1;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .result-hint {
      font-size: 11px; color: var(--text-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;
    }

    .no-results { padding: 24px; text-align: center; font-size: 13px; color: var(--text-muted); }

    .palette-footer {
      display: flex; gap: 16px; padding: 8px 16px;
      border-top: 1px solid var(--border-light);
      font-size: 11px; color: var(--text-muted);
      background: var(--bg-app);
      kbd {
        display: inline-block; padding: 1px 5px;
        background: rgba(255,255,255,0.04); border-radius: 3px;
        border: 1px solid var(--border-light);
        font-size: 10px; color: var(--accent-primary); margin: 0 1px;
      }
    }
  `]
})
export class CommandPaletteComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private snippetService = inject(SnippetService);
  private folderService  = inject(FolderService);

  open  = signal(false);
  query = '';
  focusedIndex = signal(0);

  matchingSnippets = computed(() => {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.snippetService.recentSnippets();
    return this.snippetService.snippets()
      .filter(s => !s.template &&
        (s.title.toLowerCase().includes(q) ||
         s.language.toLowerCase().includes(q) ||
         s.tags.some((t: any) => t.toLowerCase().includes(q)) ||
         (s.description ?? '').toLowerCase().includes(q))
      )
      .slice(0, 8);
  });

  matchingCommands = computed((): Command[] => {
    const q = this.query.toLowerCase().trim();
    return this.commands.filter(c =>
      !q ||
      c.label.toLowerCase().includes(q) ||
      c.keywords.some(k => k.includes(q))
    );
  });

  private commands: Command[] = [
    {
      id: 'new-snippet',
      label: 'New snippet',
      icon: '+',
      hint: 'Ctrl+N',
      keywords: ['create', 'add', 'new'],
      action: () => {}
    },
    {
      id: 'new-folder',
      label: 'New folder',
      icon: '📁',
      keywords: ['create', 'folder', 'collection'],
      action: () => {}
    },
    {
      id: 'toggle-favorites',
      label: 'Toggle favorites filter',
      icon: '★',
      keywords: ['star', 'favorite', 'filter'],
      action: () => this.snippetService.showFavoritesOnly.update(v => !v)
    },
    {
      id: 'clear-filters',
      label: 'Clear all filters',
      icon: '✕',
      keywords: ['reset', 'clear', 'filter'],
      action: () => {
        this.snippetService.searchQuery.set('');
        this.snippetService.activeLanguageFilter.set(null);
        this.snippetService.activeTagFilter.set(null);
        this.snippetService.showFavoritesOnly.set(false);
      }
    },
  ];

  ngAfterViewInit(): void {}

  toggle(): void {
    this.open.update(v => !v);
    if (this.open()) {
      this.query = '';
      this.focusedIndex.set(0);
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  close(): void { this.open.set(false); }

  openSnippet(snippet: Snippet): void {
    this.snippetService.selectSnippet(snippet);
    this.close();
  }

  runCommand(cmd: Command): void {
    cmd.action();
    this.close();
  }

  langColor(lang: string): string {
    return `var(--lang-${lang.toLowerCase()}, var(--lang-default))`;
  }

  onKeydown(event: KeyboardEvent): void {
    const total = this.matchingSnippets().length + this.matchingCommands().length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedIndex.update(i => Math.min(i + 1, total - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.focusedIndex();
      const snippets = this.matchingSnippets();
      if (idx < snippets.length) {
        this.openSnippet(snippets[idx]);
      } else {
        const cmd = this.matchingCommands()[idx - snippets.length];
        if (cmd) this.runCommand(cmd);
      }
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      this.toggle();
    }
  }
}
