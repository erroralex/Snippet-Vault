import { Component, inject, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnippetService, Snippet } from '../../core/service/snippet.service';
import { FormsModule } from '@angular/forms';
import { languageColor } from '../../app/language-color';

/**
 * The main sidebar component responsible for navigating, filtering, and managing
 * the collection of code snippets.
 *
 * This component provides a comprehensive interface for finding and organizing snippets.
 * It includes a search bar, toggleable filters for favorites, programming languages,
 * and tags. It renders the list of snippets dynamically based on the current active
 * filters and selected folder. It supports drag-and-drop reordering of snippets within
 * the list, as well as dragging snippets into folders (handled in conjunction with the
 * folder tree). Additionally, it provides inline actions for creating, renaming,
 * deleting, and favoriting snippets directly from the list view.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sidebar-container">

      <div class="sidebar-search">
        <div class="search-input-wrap">
          <span class="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search…"
            class="search-input"
            [ngModel]="snippetService.searchQuery()"
            (ngModelChange)="snippetService.searchQuery.set($event)"
          />
          @if (snippetService.searchQuery()) {
            <button class="clear-btn pressable" (click)="snippetService.searchQuery.set('')">✕</button>
          }
        </div>
      </div>

      <div class="filter-bar">

        <button
          class="fav-filter pressable"
          [class.active]="snippetService.showFavoritesOnly()"
          (click)="snippetService.showFavoritesOnly.update(v => !v)"
          title="Show favorites only">
          {{ snippetService.showFavoritesOnly() ? '★' : '☆' }}
        </button>

        <div class="chip-scroll">
          <button
            class="chip pressable"
            [class.active]="snippetService.activeLanguageFilter() === null"
            (click)="snippetService.activeLanguageFilter.set(null)">
            All
          </button>
          @for (lang of snippetService.availableLanguages(); track lang) {
            <button
              class="chip pressable"
              [class.active]="snippetService.activeLanguageFilter() === lang"
              [style.--chip-color]="langColor(lang)"
              (click)="toggleLanguageFilter(lang)">
              {{ lang }}
            </button>
          }
        </div>
      </div>

      @if (snippetService.activeTagFilter()) {
        <div class="tag-filter-active">
          <span>Tag: {{ snippetService.activeTagFilter() }}</span>
          <button class="pressable" (click)="snippetService.activeTagFilter.set(null)">✕</button>
        </div>
      }

      <button class="new-btn pressable" (click)="toggleCreateForm()">
        + New snippet
      </button>

      @if (showCreateForm()) {
        <div class="create-form appear">
          <input
            type="text"
            [(ngModel)]="newSnippetTitle"
            placeholder="Snippet title"
            class="form-input"
            (keyup.enter)="createSnippet()"
          />
          <select [(ngModel)]="newSnippetLanguage" class="form-select">
            @for (lang of availableLanguages; track lang.value) {
              <option [value]="lang.value">{{ lang.label }}</option>
            }
          </select>
          <div class="form-actions">
            <button class="form-btn primary pressable" (click)="createSnippet()">Create</button>
            <button class="form-btn secondary pressable" (click)="toggleCreateForm()">Cancel</button>
          </div>
        </div>
      }

      <ul
        class="snippet-list"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)">

        @for (snippet of snippetService.filteredSnippets(); track snippet.id; let i = $index) {
          <li
            class="snippet-item"
            [class.active]="snippetService.selectedSnippet()?.id === snippet.id"
            [class.selected]="snippetService.selectedIds().has(snippet.id)"
            [class.dragging]="draggingId() === snippet.id"
            [class.drag-over]="dragOverId() === snippet.id"
            [style.--accent-color]="langColor(snippet.language, snippet.colorLabel)"
            [style.animation-delay]="i * 25 + 'ms'"
            [attr.data-id]="snippet.id"
            draggable="true"
            (click)="onSnippetClick($event, snippet)"
            (dragstart)="onDragStart($event, snippet.id)"
            (dragend)="onDragEnd()"
            (dragenter)="onDragEnter($event, snippet.id)">

            <span class="drag-handle" title="Drag to reorder">⠿</span>

            <span class="accent-strip"></span>

            <div class="item-content">

              @if (renamingId() === snippet.id) {
                <input
                  class="rename-input"
                  [value]="renameValue"
                  (input)="renameValue = $any($event.target).value"
                  (keyup.enter)="commitRename(snippet.id)"
                  (keyup.escape)="cancelRename()"
                  (blur)="commitRename(snippet.id)"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <div class="item-title">{{ snippet.title }}</div>
              }

              <div class="item-meta">
                <span class="item-lang" [style.color]="langColor(snippet.language, snippet.colorLabel)">
                  {{ snippet.language }}
                </span>
                @for (tag of snippet.tags.slice(0, 2); track tag) {
                  <span class="item-tag pressable" (click)="filterByTag($event, tag)">
                    {{ tag }}
                  </span>
                }
              </div>

            </div>

            <div class="item-actions" (click)="$event.stopPropagation()">
              <button
                class="action-btn pressable"
                [class.starred]="snippet.favorite"
                (click)="toggleFavorite(snippet)"
                [title]="snippet.favorite ? 'Remove from favorites' : 'Add to favorites'">
                {{ snippet.favorite ? '★' : '☆' }}
              </button>
              <button class="action-btn pressable" (click)="startRename(snippet)" title="Rename">
                ✎
              </button>
              <button class="action-btn danger pressable" (click)="initiateDelete(snippet.id)" title="Delete">
                ✕
              </button>
            </div>

            @if (deletingId() === snippet.id) {
              <div class="delete-confirm appear" (click)="$event.stopPropagation()">
                <span>Delete?</span>
                <button class="confirm-btn yes pressable" (click)="confirmDelete(snippet.id)">Yes</button>
                <button class="confirm-btn no pressable" (click)="deletingId.set(null)">No</button>
              </div>
            }

          </li>
        } @empty {
          <li class="empty-state appear">
            @if (snippetService.searchQuery() || snippetService.activeLanguageFilter() || snippetService.showFavoritesOnly()) {
              No snippets match the current filters.
              <button class="link-btn" (click)="clearFilters()">Clear filters</button>
            } @else {
              No snippets yet.
            }
          </li>
        }
      </ul>

    </div>
  `,
  styles: [`
    .sidebar-container {
      height: 100%; display: flex; flex-direction: column; overflow: hidden;
      background: var(--bg-sidebar-left); backdrop-filter: var(--glass-blur);
      color: var(--text-primary);
    }

    .sidebar-search { padding: 8px 10px; border-bottom: 1px solid var(--border-light); flex-shrink: 0; }

    .search-input-wrap {
      display: flex; align-items: center; background: var(--bg-input);
      border: 1px solid var(--border-input); border-radius: 8px; padding: 0 10px; gap: 6px;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus-within { border-color: var(--accent-primary); box-shadow: var(--shadow-glow-primary); }
    }

    .search-icon { font-size: 14px; color: var(--text-muted); flex-shrink: 0; }

    .search-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--text-primary); font-size: 12px; padding: 7px 0; font-family: inherit;
      &::placeholder { color: var(--text-muted); }
    }

    .clear-btn {
      background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 10px;
      &:hover { color: var(--accent-secondary); }
    }

    .filter-bar {
      display: flex; align-items: center; gap: 6px; padding: 6px 10px;
      border-bottom: 1px solid var(--border-light); flex-shrink: 0;
    }

    .fav-filter {
      background: none; border: 1px solid var(--border-input); border-radius: 6px;
      color: var(--text-muted); cursor: pointer; width: 26px; height: 24px; font-size: 13px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: all var(--dur-fast); position: relative; z-index: 1;
      &.active {
        color: var(--status-warning); border-color: rgba(234,179,8,0.4);
        box-shadow: 0 0 8px rgba(234,179,8,0.2);
      }
      &:hover:not(.active) { border-color: var(--accent-primary); color: var(--accent-primary); }
    }

    .chip-scroll { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }

    .chip {
      font-size: 10px; padding: 2px 9px; border-radius: 99px; cursor: pointer;
      white-space: nowrap; flex-shrink: 0;
      background: transparent; color: var(--text-secondary); border: 1px solid var(--border-input);
      position: relative; z-index: 1; transition: color var(--dur-fast);

      &::before {
        content: ''; position: absolute; inset: -1px;
        background: var(--grad-hover); border-radius: 99px;
        z-index: -2; opacity: 0; filter: blur(3px); transition: opacity 0.3s;
      }
      &::after {
        content: ''; position: absolute; inset: 0;
        background: transparent; border-radius: 99px; z-index: -1; transition: background 0.3s;
      }

      &.active {
        color: var(--accent-primary);
        &::before { opacity: 0.7; }
        &::after  { background: var(--bg-btn-inner); }
      }
      &:hover:not(.active) { color: var(--text-primary); }
    }

    .tag-filter-active {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 10px; border-bottom: 1px solid var(--border-light);
      font-size: 11px; color: var(--accent-secondary); flex-shrink: 0;
      background: rgba(216,112,255,0.06);
      button { background: none; border: none; color: var(--accent-secondary); cursor: pointer;
        &:hover { color: var(--accent-primary); } }
    }

    .new-btn {
      margin: 8px 10px 4px; padding: 7px; flex-shrink: 0;
      border: 1px dashed var(--border-input); border-radius: 8px;
      background: transparent; color: var(--text-muted); font-size: 12px; cursor: pointer;
      position: relative; z-index: 1; transition: color var(--dur-fast);
      &::before {
        content: ''; position: absolute; inset: -1px; background: var(--grad-hover);
        border-radius: 9px; z-index: -2; opacity: 0; filter: blur(4px); transition: opacity 0.3s;
      }
      &::after {
        content: ''; position: absolute; inset: 0; background: transparent;
        border-radius: 8px; z-index: -1; transition: background 0.3s;
      }
      &:hover { color: var(--accent-primary); }
      &:hover::before { opacity: 0.5; }
      &:hover::after  { background: var(--bg-btn-inner); }
    }

    .create-form { margin: 0 10px 8px; display: flex; flex-direction: column; gap: 6px; }

    .form-input, .form-select {
      padding: 6px 9px; background: var(--bg-input); border: 1px solid var(--border-input);
      border-radius: 8px; color: var(--text-primary); font-size: 12px; outline: none;
      font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s;
      &:focus { border-color: var(--accent-primary); box-shadow: var(--shadow-glow-primary); }
      option { background: var(--bg-menu); }
    }

    .form-actions { display: flex; gap: 6px; justify-content: flex-end; }

    .form-btn {
      padding: 5px 13px; border-radius: 8px; font-size: 12px; cursor: pointer;
      position: relative; z-index: 1; font-weight: 600;
      &.primary {
        background: transparent; border: none; color: var(--accent-primary);
        &::before {
          content: ''; position: absolute; inset: -1px; background: var(--grad-hover);
          border-radius: 9px; z-index: -2; filter: blur(4px); opacity: 0.7;
        }
        &::after {
          content: ''; position: absolute; inset: 0; background: var(--bg-btn-inner);
          border-radius: 8px; z-index: -1;
        }
      }
      &.secondary {
        background: var(--bg-input); color: var(--text-secondary);
        border: 1px solid var(--border-input);
      }
    }

    .snippet-list {
      list-style: none; padding: 4px 0; margin: 0; flex: 1; overflow-y: auto; overflow-x: hidden;
    }

    .snippet-item {
      position: relative; display: flex; align-items: center; gap: 0;
      padding: 8px 8px 8px 0; cursor: pointer; border-left: 2px solid transparent;
      animation: appear var(--dur-standard) var(--ease-out-expo) both;
      transition: background var(--dur-fast), transform var(--dur-fast) var(--ease-out-expo),
                  border-left-color var(--dur-fast);

      &:hover {
        background: rgba(255,255,255,0.03);
        transform: translateX(2px);
        .item-actions { opacity: 1; }
        .drag-handle   { opacity: 1; }
      }

      &.active {
        background: rgba(102,252,241,0.05);
        border-left-color: var(--accent-color, var(--accent-primary));
        .item-title { color: var(--text-primary); }
      }

      &.selected {
        background: rgba(216,112,255,0.06);
        border-left-color: var(--accent-secondary);
      }

      &.dragging  { opacity: 0.3; pointer-events: none; }
      &.drag-over { border-top: 2px solid var(--accent-primary); background: rgba(102,252,241,0.04); }
    }

    .drag-handle {
      font-size: 14px; color: var(--text-muted); padding: 0 6px; cursor: grab;
      opacity: 0; flex-shrink: 0; transition: opacity var(--dur-fast); user-select: none;
    }

    .item-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }

    .item-title {
      font-size: 13px; font-weight: 500; color: var(--text-secondary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color var(--dur-fast);
    }

    .item-meta { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

    .item-lang { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }

    .item-tag {
      font-size: 10px; padding: 1px 6px; border-radius: 99px; cursor: pointer;
      background: rgba(216,112,255,0.08); color: var(--accent-secondary);
      border: 1px solid rgba(216,112,255,0.2); transition: all var(--dur-fast);
      &:hover { background: rgba(216,112,255,0.15); border-color: var(--accent-secondary); }
    }

    .item-actions {
      display: flex; align-items: center; gap: 2px; opacity: 0;
      transition: opacity var(--dur-fast); flex-shrink: 0; padding-right: 6px;
    }

    .snippet-item:not(:hover) .item-actions { .action-btn.starred { opacity: 1; } }

    .action-btn {
      background: none; border: none; color: var(--text-muted); cursor: pointer;
      width: 22px; height: 22px; border-radius: 4px; font-size: 12px;
      display: flex; align-items: center; justify-content: center; transition: all var(--dur-fast);
      &:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
      &.starred { color: var(--status-warning); }
      &.danger:hover { color: var(--status-danger); background: rgba(255,77,77,0.1); }
    }

    .rename-input {
      width: 100%; background: var(--bg-input); border: 1px solid var(--accent-primary);
      border-radius: 4px; color: var(--text-primary); padding: 2px 7px; font-size: 12px; outline: none;
      box-shadow: var(--shadow-glow-primary); font-family: inherit;
    }

    .delete-confirm {
      position: absolute; bottom: -34px; left: 10px; right: 10px;
      display: flex; align-items: center; gap: 6px; padding: 5px 9px;
      background: var(--bg-menu); border: 1px solid rgba(255,77,77,0.3); border-radius: 8px;
      font-size: 11px; color: var(--status-danger); z-index: 10;
      box-shadow: var(--shadow-panel);
    }

    .confirm-btn {
      font-size: 10px; padding: 2px 9px; border-radius: 4px; cursor: pointer; border: 1px solid;
      &.yes { background: rgba(255,77,77,0.12); color: var(--status-danger); border-color: rgba(255,77,77,0.3); }
      &.no  { background: var(--bg-input); color: var(--text-secondary); border-color: var(--border-input); }
    }

    .empty-state {
      padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }

    .link-btn { background: none; border: none; color: var(--accent-primary); cursor: pointer; font-size: 11px; text-decoration: underline; }
  `]
})
export class SidebarComponent {
  snippetService = inject(SnippetService);

  newSnippetRequested = input(false);

  showCreateForm = signal(false);
  newSnippetTitle: string = '';
  newSnippetLanguage: string = 'text';

  renamingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  renameValue: string = '';
  private isCommitting = false;

  availableLanguages = [
    { label: 'Code Fragment', value: 'text' },
    { label: 'Java Class', value: 'java' },
    { label: 'AI Prompt', value: 'prompt' },
    { label: 'Markdown', value: 'markdown' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    { label: 'SCSS', value: 'scss' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'JSON', value: 'json' },
    { label: 'XML', value: 'xml' },
    { label: 'YAML', value: 'yaml' },
    { label: 'SQL', value: 'sql' },
    { label: 'Kotlin', value: 'kotlin' },
    { label: 'Go', value: 'go' },
    { label: 'Rust', value: 'rust' },
    { label: 'C#', value: 'csharp' },
    { label: 'PHP', value: 'php' },
    { label: 'Ruby', value: 'ruby' },
    { label: 'Swift', value: 'swift' },
    { label: 'Bash', value: 'bash' },
    { label: 'Dockerfile', value: 'dockerfile' },
  ];

  constructor() {
    effect(() => {
      if (this.newSnippetRequested()) {
        this.toggleCreateForm();
      }
    });
  }

  onSnippetClick(event: MouseEvent, snippet: Snippet): void {
    if (event.shiftKey) {
      const list = this.snippetService.filteredSnippets();
      const currentIds = this.snippetService.selectedIds();
      const lastSelected = [...currentIds].pop();

      if (lastSelected) {
        const fromIdx = list.findIndex(s => s.id === lastSelected);
        const toIdx   = list.findIndex(s => s.id === snippet.id);
        const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        const rangeIds = list.slice(start, end + 1).map(s => s.id);
        this.snippetService.selectedIds.update(set => {
          const next = new Set(set);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
      } else {
        this.snippetService.toggleSelect(snippet.id);
      }
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      this.snippetService.toggleSelect(snippet.id);
      return;
    }

    this.snippetService.clearSelection();
    this.selectSnippet(snippet);
  }

  selectSnippet(snippet: Snippet): void {
    this.snippetService.selectSnippet(snippet);
  }

  toggleCreateForm(): void {
    this.showCreateForm.update(value => !value);
    if (!this.showCreateForm()) {
      this.newSnippetTitle = '';
      this.newSnippetLanguage = 'text';
    }
  }

  createSnippet(): void {
    if (this.newSnippetTitle.trim() && this.newSnippetLanguage) {
      this.snippetService.createSnippet(this.newSnippetTitle, this.newSnippetLanguage).subscribe({
        next: () => {
          console.log('Snippet creation initiated successfully.');
          this.toggleCreateForm();
        },
        error: (err) => {
          console.error('Error creating snippet:', err);
        }
      });
    } else {
      alert('Please provide a title and select a language for the new snippet.');
    }
  }

  startRename(snippet: Snippet): void {
    this.renameValue = snippet.title;
    this.renamingId.set(snippet.id);
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.renameValue = '';
  }

  commitRename(id: string): void {
    if (this.isCommitting) return;
    this.isCommitting = true;

    const trimmed = this.renameValue.trim();
    const original = this.snippetService.snippets().find(s => s.id === id)?.title;

    if (trimmed && trimmed !== original) {
      this.snippetService.renameSnippet(id, trimmed).subscribe({
        error: () => alert('Failed to rename snippet.')
      });
    }
    this.cancelRename();
    setTimeout(() => this.isCommitting = false, 100);
  }

  initiateDelete(id: string): void {
    this.deletingId.set(id);
  }

  confirmDelete(id: string): void {
    this.snippetService.deleteSnippet(id).subscribe({
      error: () => alert('Failed to delete snippet.')
    });
    this.deletingId.set(null);
  }

  draggingId  = signal<string | null>(null);
  dragOverId  = signal<string | null>(null);

  onDragStart(event: DragEvent, id: string): void {
    this.draggingId.set(id);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', id);
  }

  onDragEnter(event: DragEvent, id: string): void {
    event.preventDefault();
    if (id !== this.draggingId()) this.dragOverId.set(id);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const draggedId = this.draggingId();
    const targetId  = this.dragOverId();

    if (!draggedId || !targetId || draggedId === targetId) {
      this.onDragEnd();
      return;
    }

    const currentOrder = this.snippetService.filteredSnippets().map(s => s.id);
    const fromIdx = currentOrder.indexOf(draggedId);
    const toIdx   = currentOrder.indexOf(targetId);

    if (fromIdx === -1 || toIdx === -1) { this.onDragEnd(); return; }

    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);

    this.snippetService.snippets.update(list => {
      const orderMap = new Map(newOrder.map((id, i) => [id, i]));
      return list.map(s => ({
        ...s,
        sortOrder: orderMap.get(s.id) ?? s.sortOrder
      }));
    });

    this.snippetService.persistOrder(newOrder).subscribe({
      error: () => {
        console.error('Failed to persist sort order');
        this.snippetService.loadSnippets();
      }
    });

    this.onDragEnd();
  }

  onDragEnd(): void {
    this.draggingId.set(null);
    this.dragOverId.set(null);
  }

  toggleFavorite(snippet: Snippet): void {
    this.snippetService.toggleFavorite(snippet.id).subscribe({
      error: () => console.error('Failed to toggle favorite')
    });
  }

  filterByTag(event: MouseEvent, tag: string): void {
    event.stopPropagation();
    this.snippetService.activeTagFilter.set(
      this.snippetService.activeTagFilter() === tag ? null : tag
    );
  }

  toggleLanguageFilter(lang: string): void {
    this.snippetService.activeLanguageFilter.set(
      this.snippetService.activeLanguageFilter() === lang ? null : lang
    );
  }

  langColor(language: string, colorLabel?: string | null): string {
    return languageColor(language, colorLabel);
  }

  clearFilters(): void {
    this.snippetService.searchQuery.set('');
    this.snippetService.activeLanguageFilter.set(null);
    this.snippetService.activeTagFilter.set(null);
    this.snippetService.showFavoritesOnly.set(false);
  }
}
