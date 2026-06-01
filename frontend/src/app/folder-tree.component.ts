import {Component, inject, signal, output, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FolderService} from './folder.service';
import {SnippetService} from '../core/service/snippet.service';
import {Folder} from './models/folder.model';

/**
 * ──────────────────────────────────────────────
 * <h2>FolderTreeComponent</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Renders and manages the hierarchical folder structure in the application's sidebar, enabling navigation and organization.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Displays the complete folder tree using a recursive template.</li>
 * <li>Includes special root-level navigational items like "All Snippets" and "Snippet Vault" (inbox).</li>
 * <li>Supports drag-and-drop functionality for moving snippets between folders.</li>
 * <li>Provides inline form controls for creating new folders and sub-folders directly within the tree.</li>
 * <li>Implements a custom context menu for folder-specific actions including renaming, changing colors, and deletion.</li>
 * <li>Manages local UI state for folder expansion, creation modes, drag-over effects, and renaming.</li>
 * <li>Efficiently calculates and displays the current snippet count for each folder using computed signals.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Component} that acts as the primary navigational interface for the folder hierarchy, interacting heavily with {@code FolderService} and {@code SnippetService} to read state and trigger organizational changes.</p>
 * ──────────────────────────────────────────────
 */
@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="folder-tree">

      <div
        class="folder-item pressable"
        [class.active]="snippetService.activeFolderId() === null"
        (click)="snippetService.activeFolderId.set(null)"
        (dragover)="$event.preventDefault()"
        (drop)="onDropToRoot($event)">
        <i class="pi pi-bookmark mr-2 folder-icon"></i>
        <span class="folder-name">All snippets</span>
        <span class="folder-count">{{ allCount() }}</span>
      </div>

      <div
        class="folder-item pressable"
        [class.active]="snippetService.activeFolderId() === 'root'"
        (click)="snippetService.activeFolderId.set('root')"
        (dragover)="$event.preventDefault()"
        (drop)="onDropToRoot($event)">
        <i class="pi pi-file mr-2 folder-icon"></i>
        <span class="folder-name">Snippet Vault</span>
        <span class="folder-count">{{ inboxCount() }}</span>
      </div>

      @for (folder of folderService.rootFolders(); track folder.id) {
        <ng-container
          *ngTemplateOutlet="folderNode; context: { folder: folder, depth: 0 }">
        </ng-container>
      }

      <button class="new-folder-btn pressable" (click)="startCreating(null)">
        + New folder
      </button>

      @if (creatingUnder() !== undefined) {
        <div class="create-folder-form appear">
          <input
            #nameInput
            class="folder-name-input"
            [(ngModel)]="newFolderName"
            placeholder="Folder name"
            (keyup.enter)="commitCreate()"
            (keyup.escape)="cancelCreate()"
            (blur)="commitCreate()"
          />
        </div>
      }
    </div>

    <ng-template #folderNode let-folder="folder" let-depth="depth">
      <div
        class="folder-item pressable"
        [class.active]="snippetService.activeFolderId() === folder.id"
        [class.drag-over]="dragOverFolderId() === folder.id"
        [style.padding-left.px]="16 + depth * 14"
        [style.--folder-color]="folder.color || 'var(--lang-default)'"
        [attr.data-folder-id]="folder.id"
        (click)="selectFolder(folder)"
        (dblclick)="toggleExpand($event, folder)"
        (dragover)="onFolderDragOver($event, folder.id)"
        (dragleave)="onFolderDragLeave(folder.id)"
        (drop)="onDropToFolder($event, folder.id)"
        (contextmenu)="openContextMenu($event, folder)">

        <button
          class="expand-btn pressable"
          (click)="toggleExpand($event, folder)">
          {{ folder.expanded ? '▾' : '▸' }}
        </button>

        <i class="pi mr-2 folder-icon-colored"
           [class.pi-folder-open]="folder.expanded"
           [class.pi-folder]="!folder.expanded"
           [style.color]="folder.color || 'inherit'">
        </i>

        @if (renamingFolderId() === folder.id) {
          <input
            class="folder-rename-input"
            [value]="folderRenameValue"
            (input)="folderRenameValue = $any($event.target).value"
            (keyup.enter)="commitFolderRename(folder.id)"
            (keyup.escape)="cancelFolderRename()"
            (blur)="commitFolderRename(folder.id)"
            (click)="$event.stopPropagation()"
          />
        } @else {
          <span class="folder-name">{{ folder.name }}</span>
        }

        <span class="folder-count">{{ snippetCountFor(folder.id) }}</span>

        <button
          class="folder-action-btn pressable"
          (click)="startCreating(folder.id); $event.stopPropagation()"
          title="Add sub-folder">+
        </button>
      </div>

      @if (folder.expanded) {
        @for (child of folderService.childFolders(folder.id); track child.id) {
          <ng-container
            *ngTemplateOutlet="folderNode; context: { folder: child, depth: depth + 1 }">
          </ng-container>
        }
        @if (creatingUnder() === folder.id) {
          <div class="create-folder-form appear"
               [style.padding-left.px]="16 + (depth + 1) * 14">
            <input
              class="folder-name-input"
              [(ngModel)]="newFolderName"
              placeholder="Sub-folder name"
              (keyup.enter)="commitCreate()"
              (keyup.escape)="cancelCreate()"
            />
          </div>
        }
      }
    </ng-template>

    @if (contextMenu()) {
      <div
        class="context-menu appear"
        [style.top.px]="contextMenuY()"
        [style.left.px]="contextMenuX()">
        <button class="ctx-item pressable" (click)="startFolderRename(contextMenu()!)"><i class="pi pi-pencil"></i> Rename</button>
        <div class="ctx-sep"></div>
        <div class="ctx-color-picker-title">Folder Color</div>
        <div class="ctx-color-picker" (click)="$event.stopPropagation()">
          <button
            class="color-dot reset-color pressable"
            [class.active]="!contextMenu()?.color"
            (click)="selectFolderColor(contextMenu()!, null)"
            title="Reset color">
            ✕
          </button>
          @for (c of folderColors; track c) {
            <button
              class="color-dot pressable"
              [style.background-color]="c"
              [class.active]="contextMenu()?.color === c"
              (click)="selectFolderColor(contextMenu()!, c)"
              title="Change color">
            </button>
          }
          <label class="color-dot custom-color pressable" [style.background]="'conic-gradient(red, yellow, green, cyan, blue, magenta, red)'" title="Custom color">
            <input type="color" [value]="contextMenu()?.color || '#a259ff'" (change)="selectFolderColor(contextMenu()!, $any($event.target).value)" style="display: none;" />
          </label>
        </div>
        <div class="ctx-sep"></div>
        <button class="ctx-item pressable" (click)="startCreating(contextMenu()!.id)">
          <i class="pi pi-plus"></i> Sub-folder
        </button>
        <div class="ctx-sep"></div>
        <button class="ctx-item danger pressable" (click)="deleteFolder(false)">
          <i class="pi pi-trash"></i> Delete (keep snippets)
        </button>
        <button class="ctx-item danger pressable" (click)="deleteFolder(true)">
          <i class="pi pi-trash"></i> Delete with snippets
        </button>
      </div>
    }
  `,
  styles: [`
    .folder-tree {
      padding: 4px 0;
      border-bottom: 1px solid var(--border-light);
      flex-shrink: 0;
    }

    .folder-item {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px 5px 16px;
      cursor: pointer;
      font-size: 12px;
      color: var(--text-secondary);
      border-left: 2px solid transparent;
      transition: all var(--dur-fast) var(--ease-standard);

      &:hover {
        background: rgba(255, 255, 255, 0.03);
        color: var(--text-primary);
        transform: translateX(2px);

        .folder-action-btn {
          opacity: 1;
        }
      }

      &.active {
        background: rgba(230, 157, 103, 0.05);
        color: var(--text-primary);
        border-left-color: var(--folder-color, var(--accent-primary));
      }

      &.drag-over {
        background: rgba(230, 157, 103, 0.05);
        border-left-color: var(--accent-primary);
      }
    }

    .expand-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 9px;
      padding: 0 2px;
      width: 14px;
      flex-shrink: 0;

      &:hover {
        color: var(--accent-primary);
      }
    }

    .folder-icon {
      font-size: 13px;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: color 0.2s;
    }

    .folder-icon-colored {
      font-size: 13px;
      flex-shrink: 0;
      transition: color 0.2s;
    }

    .mr-2 {
      margin-right: 0.5rem;
    }

    .folder-item.active .folder-icon,
    .folder-item.active .folder-icon-colored {
      color: inherit !important;
    }

    .folder-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .folder-count {
      font-size: 10px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      padding: 0 5px;
      border-radius: 99px;
      min-width: 18px;
      text-align: center;
      border: 1px solid var(--border-light);
    }

    .folder-action-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      padding: 0 3px;
      opacity: 0;
      transition: opacity var(--dur-fast), color var(--dur-fast);

      &:hover {
        color: var(--accent-primary);
      }
    }

    .new-folder-btn {
      width: 100%;
      padding: 5px 16px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 11px;
      text-align: left;
      cursor: pointer;
      transition: color var(--dur-fast);

      &:hover {
        color: var(--accent-secondary);
      }
    }

    .create-folder-form {
      padding: 4px 10px;
    }

    .folder-name-input, .folder-rename-input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--accent-primary);
      border-radius: 4px;
      color: var(--text-primary);
      padding: 3px 8px;
      font-size: 12px;
      outline: none;
      box-shadow: var(--shadow-glow-primary);
      font-family: inherit;
    }

    .folder-rename-input {
      flex: 1;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--accent-primary);
      border-radius: 0;
      padding: 0 2px;
      box-shadow: none;
    }

    .context-menu {
      position: fixed;
      background: var(--bg-menu);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--border-light);
      border-radius: 10px;
      padding: 5px;
      z-index: var(--z-context-menu);
      min-width: 190px;
      box-shadow: var(--shadow-panel);
    }

    .ctx-item {
      display: block;
      width: 100%;
      padding: 7px 10px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 12px;
      text-align: left;
      cursor: pointer;
      border-radius: 6px;
      font-family: inherit;
      transition: background var(--dur-fast), color var(--dur-fast);

      i {
        margin-right: 6px;
        font-size: 11px;
        vertical-align: middle;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
      }

      &.danger {
        color: var(--status-danger);
      }

      &.danger:hover {
        background: rgba(255, 77, 77, 0.08);
      }
    }

    .ctx-sep {
      height: 1px;
      background: var(--border-light);
      margin: 4px 0;
    }

    .ctx-color-picker-title {
      font-size: 10px;
      color: var(--text-muted);
      padding: 2px 10px;
      font-weight: 500;
    }

    .ctx-color-picker {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      padding: 6px 10px;
    }

    .color-dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid var(--border-light);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--text-muted);
      transition: transform var(--dur-fast), border-color var(--dur-fast);
      background: none;

      &:hover {
        transform: scale(1.15);
        border-color: var(--text-primary);
      }

      &.active {
        border-color: var(--text-primary);
        box-shadow: 0 0 8px currentColor;
      }

      &.reset-color {
        background: rgba(255, 255, 255, 0.05);
        &:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      }

      &.custom-color {
        position: relative;
        overflow: hidden;
      }
    }
  `]
})
export class FolderTreeComponent {
  folderService = inject(FolderService);
  snippetService = inject(SnippetService);

  creatingUnder = signal<string | null | undefined>(undefined);
  newFolderName = '';
  dragOverFolderId = signal<string | null>(null);

  contextMenu = signal<Folder | null>(null);
  contextMenuX = signal(0);
  contextMenuY = signal(0);

  renamingFolderId = signal<string | null>(null);
  folderRenameValue = '';
  private isFolderCommitting = false;

  allCount = computed(() => this.snippetService.snippets().filter(s => !s.template).length);
  inboxCount = computed(() => this.snippetService.snippets().filter(s => !s.template && !s.folderId).length);

  snippetCountFor(folderId: string): number {
    return this.snippetService.snippets().filter(s => s.folderId === folderId).length;
  }

  selectFolder(folder: Folder): void {
    this.snippetService.activeFolderId.set(folder.id);
  }

  toggleExpand(event: MouseEvent, folder: Folder): void {
    event.stopPropagation();
    this.folderService.updateFolder(folder.id, {expanded: !folder.expanded}).subscribe();
  }

  startCreating(parentId: string | null): void {
    this.creatingUnder.set(parentId);
    this.newFolderName = '';
  }

  cancelCreate(): void {
    this.creatingUnder.set(undefined);
    this.newFolderName = '';
  }

  commitCreate(): void {
    const name = this.newFolderName.trim();
    const parentId = this.creatingUnder() ?? null;
    if (name) {
      this.folderService.createFolder(name, parentId).subscribe();
    }
    this.cancelCreate();
  }

  onFolderDragOver(event: DragEvent, folderId: string): void {
    event.preventDefault();
    this.dragOverFolderId.set(folderId);
  }

  onFolderDragLeave(folderId: string): void {
    if (this.dragOverFolderId() === folderId) {
      this.dragOverFolderId.set(null);
    }
  }

  onDropToFolder(event: DragEvent, folderId: string): void {
    event.preventDefault();
    this.dragOverFolderId.set(null);
    const snippetId = event.dataTransfer?.getData('text/plain');
    if (!snippetId) return;

    const toMove = this.snippetService.selectedIds().size > 0
      ? [...this.snippetService.selectedIds()]
      : [snippetId];

    this.snippetService.moveSnippets(toMove, folderId).subscribe();
    this.snippetService.clearSelection();
  }

  onDropToRoot(event: DragEvent): void {
    event.preventDefault();
    const snippetId = event.dataTransfer?.getData('text/plain');
    if (!snippetId) return;
    const toMove = this.snippetService.selectedIds().size > 0
      ? [...this.snippetService.selectedIds()]
      : [snippetId];
    this.snippetService.moveSnippets(toMove, null).subscribe();
    this.snippetService.clearSelection();
  }

  private activeCloseHandler: ((e: MouseEvent | KeyboardEvent) => void) | null = null;

  closeContextMenu(): void {
    this.contextMenu.set(null);
    if (this.activeCloseHandler) {
      document.removeEventListener('click', this.activeCloseHandler);
      document.removeEventListener('keydown', this.activeCloseHandler);
      this.activeCloseHandler = null;
    }
  }

  openContextMenu(event: MouseEvent, folder: Folder): void {
    event.preventDefault();
    this.contextMenu.set(folder);
    this.contextMenuX.set(event.clientX);
    this.contextMenuY.set(event.clientY);

    if (this.activeCloseHandler) {
      document.removeEventListener('click', this.activeCloseHandler);
      document.removeEventListener('keydown', this.activeCloseHandler);
      this.activeCloseHandler = null;
    }

    setTimeout(() => {
      const close = (e: MouseEvent | KeyboardEvent) => {
        if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
        this.closeContextMenu();
      };
      this.activeCloseHandler = close;
      document.addEventListener('click', close);
      document.addEventListener('keydown', close);
    });
  }

  startFolderRename(folder: Folder): void {
    this.folderRenameValue = folder.name;
    this.renamingFolderId.set(folder.id);
    this.closeContextMenu();
    setTimeout(() => {
      const input = document.querySelector('.folder-rename-input') as HTMLInputElement;
      input?.focus();
      input?.select();
    }, 30);
  }

  cancelFolderRename(): void {
    this.renamingFolderId.set(null);
    this.folderRenameValue = '';
  }

  commitFolderRename(id: string): void {
    if (this.isFolderCommitting) return;
    this.isFolderCommitting = true;

    const trimmed = this.folderRenameValue.trim();
    const original = this.folderService.folders().find(f => f.id === id)?.name;

    if (trimmed && trimmed !== original) {
      this.folderService.updateFolder(id, {name: trimmed}).subscribe({
        error: () => alert('Failed to rename folder.')
      });
    }
    this.cancelFolderRename();
    setTimeout(() => this.isFolderCommitting = false, 100);
  }

  folderColors = [
    '#a259ff', // Lavender
    '#3b82f6', // Sky Blue
    '#06b6d4', // Cyan
    '#10b981', // Teal
    '#22c55e', // Emerald
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
    '#ec4899'  // Pink
  ];

  selectFolderColor(folder: Folder, color: string | null): void {
    this.folderService.updateFolder(folder.id, {color}).subscribe();
    this.closeContextMenu();
  }

  deleteFolder(withSnippets: boolean): void {
    const f = this.contextMenu();
    if (!f) return;
    const msg = withSnippets
      ? `Delete "${f.name}" and all its snippets?`
      : `Delete "${f.name}"? Snippets will be moved to Inbox.`;
    if (confirm(msg)) {
      this.folderService.deleteFolder(f.id, !withSnippets).subscribe();
    }
    this.closeContextMenu();
  }
}
