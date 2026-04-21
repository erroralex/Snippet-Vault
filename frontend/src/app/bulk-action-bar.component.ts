import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnippetService } from '../core/service/snippet.service';
import { FolderService } from './folder.service';

/**
 * A contextual action bar that appears at the bottom of the snippet list when one or
 * more snippets are selected.
 *
 * This component provides users with bulk actions that can be performed on the entire
 * set of selected snippets. It displays the number of selected items and offers
 * operations such as moving all selected snippets to a different folder or deleting
 * them simultaneously. The bar automatically appears and disappears based on whether
 * any snippets are selected, providing a clean and context-aware user interface.
 */
@Component({
  selector: 'app-bulk-action-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (count() > 0) {
      <div class="bulk-bar fade-up">
        <span class="bulk-count">{{ count() }} selected</span>

        <div class="bulk-actions">
          <!-- Move to folder -->
          <select class="bulk-select pressable" (change)="moveToFolder($event)">
            <option value="">Move to…</option>
            <option value="__root__">Inbox (no folder)</option>
            @for (folder of folderService.folders(); track folder.id) {
              <option [value]="folder.id">{{ folder.icon }} {{ folder.name }}</option>
            }
          </select>

          <!-- Delete -->
          <button class="bulk-btn danger pressable" (click)="deleteSelected()">
            ✕ Delete
          </button>

          <!-- Clear selection -->
          <button class="bulk-btn pressable" (click)="snippetService.clearSelection()">
            ✕ Clear
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .bulk-bar {
      position: sticky; bottom: 0; left: 0; right: 0;
      background: linear-gradient(135deg, rgba(102,252,241,0.08), rgba(216,112,255,0.08));
      border-top: 1px solid rgba(102,252,241,0.2);
      backdrop-filter: var(--glass-blur);
      padding: 8px 10px;
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      z-index: var(--z-bulk-bar); flex-shrink: 0;
    }

    .bulk-count { font-size: 11px; color: var(--accent-primary); white-space: nowrap; }

    .bulk-actions { display: flex; gap: 6px; align-items: center; }

    .bulk-select {
      font-size: 11px; padding: 3px 6px;
      background: var(--bg-menu); border: 1px solid var(--border-light);
      border-radius: 5px; color: var(--text-secondary); cursor: pointer;
      &:focus { border-color: var(--accent-primary); outline: none; }
    }

    .bulk-btn {
      font-size: 11px; padding: 3px 9px; border-radius: 5px;
      border: 1px solid var(--border-light); background: transparent;
      color: var(--text-secondary); cursor: pointer; white-space: nowrap;
      transition: all var(--dur-fast);
      &:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); border-color: rgba(255,255,255,0.15); }
      &.danger { border-color: rgba(255,77,77,0.3); color: var(--accent-secondary); }
      &.danger:hover { background: rgba(255,77,77,0.1); box-shadow: 0 0 8px rgba(255,77,77,0.2); }
    }
  `]
})
export class BulkActionBarComponent {
  snippetService = inject(SnippetService);
  folderService  = inject(FolderService);

  count = computed(() => this.snippetService.selectedIds().size);

  moveToFolder(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
    const folderId = value === '__root__' ? null : value;
    this.snippetService
      .moveSnippets([...this.snippetService.selectedIds()], folderId)
      .subscribe(() => this.snippetService.clearSelection());
    (event.target as HTMLSelectElement).value = '';
  }

  deleteSelected(): void {
    const ids = [...this.snippetService.selectedIds()];
    if (!confirm(`Delete ${ids.length} snippet(s)?`)) return;
    const deletes = ids.map(id => this.snippetService.deleteSnippet(id));
    Promise.all(deletes.map(obs => obs.toPromise()))
      .then(() => this.snippetService.clearSelection());
  }
}
