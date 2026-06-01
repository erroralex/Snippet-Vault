import {Component, inject, signal, input, effect, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SnippetService, Snippet} from '../../core/service/snippet.service';
import {FormsModule} from '@angular/forms';
import {languageColor} from '../../app/language-color';
import {FolderService} from '../../app/folder.service';

/**
 * ──────────────────────────────────────────────
 * <h2>SidebarComponent</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> The main sidebar component responsible for navigating, filtering, and managing the collection of code snippets.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Provides a comprehensive interface for finding and organizing snippets via a search bar and toggleable filters (favorites, programming languages, tags).</li>
 * <li>Dynamically renders the snippet list based on active filters and the currently selected folder.</li>
 * <li>Supports drag-and-drop reordering of snippets within the list view.</li>
 * <li>Enables dragging snippets into folders in conjunction with the folder tree.</li>
 * <li>Provides inline actions for creating, renaming, deleting, and favoriting snippets directly from the list view.</li>
 * <li>Manages local UI states such as dragging, renaming, deleting confirmations, and the display of the new snippet creation form.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Component} acting as a primary user interface for snippet management, tightly coupled with {@code SnippetService} to read application state and trigger data mutations.</p>
 * ──────────────────────────────────────────────
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sidebar-container">

      <div class="sidebar-search">
        <div class="search-input-wrap">
          <span class="search-icon"><i class="pi pi-search"></i></span>
          <input
            type="text"
            placeholder="Search…"
            class="search-input"
            [ngModel]="snippetService.searchQuery()"
            (ngModelChange)="snippetService.searchQuery.set($event)"
          />
          @if (snippetService.searchQuery()) {
            <button class="clear-btn pressable" (click)="snippetService.searchQuery.set('')"><i class="pi pi-times"></i></button>
          }
        </div>
      </div>

      <div class="filter-bar">

        <button
          class="fav-filter pressable"
          [class.active]="snippetService.showFavoritesOnly()"
          (click)="snippetService.showFavoritesOnly.update(v => !v)"
          title="Show favorites only">
          <i class="pi" [class.pi-star-fill]="snippetService.showFavoritesOnly()" [class.pi-star]="!snippetService.showFavoritesOnly()"></i>
        </button>

        <div class="tag-filter-container">
          <button
            class="tag-filter-btn pressable"
            [class.active]="!!snippetService.activeTagFilter()"
            (click)="toggleTagDropdown($event)"
            title="Filter by tag">
            <span class="icon"><i class="pi pi-tag"></i></span>
            @if (snippetService.activeTagFilter()) {
              <span class="active-tag-name">{{ snippetService.activeTagFilter() }}</span>
            }
          </button>

          @if (tagDropdownOpen()) {
            <div class="tag-dropdown-menu appear" (click)="$event.stopPropagation()">
              <button
                class="tag-dropdown-item pressable"
                [class.active]="snippetService.activeTagFilter() === null"
                (click)="selectTagFilter(null)">
                All Tags
              </button>
              <div class="dropdown-divider"></div>
              @if (allTags().length === 0) {
                <div class="dropdown-empty">No tags found</div>
              } @else {
                @for (tag of allTags(); track tag) {
                  <button
                    class="tag-dropdown-item pressable"
                    [class.active]="snippetService.activeTagFilter() === tag"
                    (click)="selectTagFilter(tag)">
                    <span class="tag-dot" [style.background-color]="tagColor(tag)"></span>
                    {{ tag }}
                  </button>
                }
              }
            </div>
          }
        </div>

        <div class="lang-filter-container">
          <button
            class="lang-filter-btn pressable"
            [class.active]="snippetService.activeLanguageFilter() !== null"
            (click)="toggleLangDropdown($event)"
            title="Filter by language">
            <span class="icon"><i class="pi pi-code"></i></span>
            @if (snippetService.activeLanguageFilter()) {
              <span class="btn-text">{{ getLanguageLabel(snippetService.activeLanguageFilter()) }}</span>
            }
          </button>

          @if (langDropdownOpen()) {
            <div class="lang-dropdown-menu appear" (click)="$event.stopPropagation()">
              <button
                class="lang-dropdown-item pressable"
                [class.active]="snippetService.activeLanguageFilter() === null"
                (click)="selectLanguageFilter(null)">
                All Languages
              </button>
              <div class="dropdown-divider"></div>
              @if (snippetService.availableLanguages().length === 0) {
                <div class="dropdown-empty">No languages found</div>
              } @else {
                @for (lang of snippetService.availableLanguages(); track lang) {
                  <button
                    class="lang-dropdown-item pressable"
                    [class.active]="snippetService.activeLanguageFilter() === lang"
                    (click)="selectLanguageFilter(lang)">
                    <span class="lang-dot" [style.background-color]="langColor(lang)"></span>
                    {{ getLanguageLabel(lang) }}
                  </button>
                }
              }
            </div>
          }
        </div>
      </div>

      <div class="sidebar-action-bar">
        <button class="new-btn pressable" (click)="toggleCreateForm()">
          + New snippet
        </button>
        <button class="backup-btn pressable" (click)="exportVault()" title="Backup entire vault to ZIP">
          <i class="pi pi-box"></i> Backup
        </button>
      </div>

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
            (contextmenu)="onRightClick($event, snippet)"
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
                <i class="pi" [class.pi-star-fill]="snippet.favorite" [class.pi-star]="!snippet.favorite"></i>
              </button>
              <button class="action-btn pressable" (click)="startRename(snippet)" title="Rename">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="action-btn danger pressable" (click)="initiateDelete(snippet.id)" title="Delete">
                <i class="pi pi-times"></i>
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
      <div class="sidebar-footer">
        <span class="version-label">v1.1.0</span>
        <button class="settings-btn pressable" (click)="openSettings()" title="Application Settings">
          <i class="pi pi-cog"></i> Settings
        </button>
      </div>
    </div>

    <!-- Context Menu -->
    @if (contextMenuVisible()) {
      <div class="context-menu" [style.left.px]="contextMenuPosition().x" [style.top.px]="contextMenuPosition().y" (click)="$event.stopPropagation()">
        <button class="context-menu-item pressable" (click)="openEditModal()">
          <span class="icon"><i class="pi pi-pencil"></i></span> Edit Metadata
        </button>
      </div>
    }

    <!-- Edit Modal -->
    @if (editModalVisible()) {
      <div class="modal-backdrop" (click)="closeEditModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Edit Snippet Metadata</h3>

          <div class="form-group">
            <label>Title</label>
            <input type="text" class="form-input" [(ngModel)]="editData.title" />
          </div>

          <div class="form-group">
            <label>Language</label>
            <select class="form-select" [(ngModel)]="editData.language">
              @for (lang of availableLanguages; track lang.value) {
                <option [value]="lang.value">{{ lang.label }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea class="form-input" [(ngModel)]="editData.description" rows="3"></textarea>
          </div>

          <div class="modal-actions">
            <button class="form-btn secondary pressable" (click)="closeEditModal()" [disabled]="isSavingMetadata()">Cancel</button>
            <button class="form-btn primary pressable" (click)="saveEditModal()" [disabled]="isSavingMetadata()">
              {{ isSavingMetadata() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Settings Modal -->
    @if (settingsModalVisible()) {
      <div class="modal-backdrop" (click)="closeSettings()">
        <div class="modal-content settings-modal" (click)="$event.stopPropagation()">
          <h3>Application Settings</h3>
          <p class="settings-desc">Configure your Snippet Vault workspace preferences.</p>

          <div class="settings-section">
            <span class="settings-sec-title">Appearance & Scale</span>
            <div class="setting-row">
              <span class="setting-label">UI Scaling (Zoom)</span>
              <div class="zoom-controls">
                <button class="zoom-btn pressable" (click)="zoomOut()" title="Zoom Out">-</button>
                <span class="zoom-value">{{ currentZoomPercent() }}%</span>
                <button class="zoom-btn pressable" (click)="zoomIn()" title="Zoom In">+</button>
                <button class="zoom-reset-btn pressable" (click)="resetZoom()">Reset</button>
              </div>
            </div>
            <div class="setting-row" style="margin-top: 8px;">
              <span class="setting-label">Application Theme</span>
              <select
                class="form-select"
                style="max-width: 180px; padding: 4px 8px; font-size: 11px; height: 26px; border-bottom: 1px solid var(--border-input); border-radius: 4px; background: var(--bg-input); color: var(--text-primary);"
                [ngModel]="snippetService.activeTheme()"
                (ngModelChange)="snippetService.activeTheme.set($event)">
                <option value="dark">Coder Dark (WCAG AA+)</option>
                <option value="light">Coder Light (WCAG AA+)</option>
              </select>
            </div>
            <div class="setting-row" style="margin-top: 8px;">
              <span class="setting-label">Editor Theme</span>
              <select
                class="form-select"
                style="max-width: 180px; padding: 4px 8px; font-size: 11px; height: 26px; border-bottom: 1px solid var(--border-input); border-radius: 4px; background: var(--bg-input); color: var(--text-primary);"
                [ngModel]="snippetService.activeEditorTheme()"
                (ngModelChange)="snippetService.activeEditorTheme.set($event)">
                <option value="intellij-dark">IntelliJ Islands Dark</option>
                <option value="intellij-light">IntelliJ Classic Light</option>
              </select>
            </div>
          </div>

          <div class="settings-section">
            <span class="settings-sec-title">Workspace Data</span>
            <div class="setting-row flex-col">
              <span class="setting-label-sub">Snippet Vault stores database records and physical snippet files locally on your system.</span>
              <button class="action-btn-settings pressable" (click)="openDataFolder()">
                <i class="pi pi-folder-open"></i> Open Storage Folder
              </button>
            </div>
          </div>

          <div class="settings-section">
            <span class="settings-sec-title">System Stats & Info</span>
            <div class="stats-grid">
              <div class="stats-item">
                <span class="stat-val">{{ snippetService.snippets().length }}</span>
                <span class="stat-lbl">Snippets</span>
              </div>
              <div class="stats-item">
                <span class="stat-val">{{ folderService.folders().length }}</span>
                <span class="stat-lbl">Folders</span>
              </div>
            </div>
            <div class="info-row" style="margin-top: 4px;">
              <span class="info-lbl">App Theme:</span>
              <span class="info-val text-success">
                {{ snippetService.activeTheme() === 'dark' ? 'Coder Dark' : 'Coder Light' }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-lbl">Editor Theme:</span>
              <span class="info-val text-success">
                {{ snippetService.activeEditorTheme() === 'intellij-dark' ? 'IntelliJ Islands Dark' : 'IntelliJ Classic Light' }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-lbl">Database:</span>
              <span class="info-val filepath" title="SQLite database & code fragments directory">data/snippet-vault.db</span>
            </div>
          </div>

          <div class="modal-actions" style="margin-top: 8px;">
            <button class="form-btn primary pressable" (click)="closeSettings()">Done</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .sidebar-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg-sidebar-left);
      backdrop-filter: var(--glass-blur);
      color: var(--text-primary);
    }

    .sidebar-search {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border-light);
      flex-shrink: 0;
    }

    .search-input-wrap {
      display: flex;
      align-items: center;
      background: var(--bg-input);
      border: 1px solid var(--border-input);
      border-radius: 8px;
      padding: 0 10px;
      gap: 6px;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus-within {
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow-primary);
      }
    }

    .search-icon {
      font-size: 14px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 12px;
      padding: 7px 0;
      font-family: inherit;

      &::placeholder {
        color: var(--text-muted);
      }
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 10px;

      &:hover {
        color: var(--accent-secondary);
      }
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-bottom: 1px solid var(--border-light);
      flex-shrink: 0;
    }

    .fav-filter {
      background: none;
      border: 1px solid var(--border-input);
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      width: 26px;
      height: 24px;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all var(--dur-fast);
      position: relative;
      z-index: 1;

      &.active {
        color: var(--status-warning);
        border-color: rgba(234, 179, 8, 0.4);
        box-shadow: 0 0 8px rgba(234, 179, 8, 0.2);
      }

      &:hover:not(.active) {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }
    }

    .tag-filter-container {
      position: relative;
      display: inline-block;
      flex-shrink: 0;
    }

    .tag-filter-btn {
      background: none;
      border: 1px solid var(--border-input);
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      height: 24px;
      padding: 0 8px;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all var(--dur-fast);
      position: relative;
      z-index: 1;

      &:hover:not(.active) {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }

      &.active {
        color: var(--accent-secondary);
        border-color: rgba(230, 157, 103, 0.4);
        box-shadow: 0 0 8px rgba(230, 157, 103, 0.2);
        background: rgba(230, 157, 103, 0.05);
      }

      .active-tag-name {
        max-width: 80px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
    }

    .tag-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: var(--bg-menu);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 4px;
      min-width: 140px;
      max-width: 200px;
      max-height: 250px;
      overflow-y: auto;
      z-index: 999;
      box-shadow: var(--shadow-panel);
    }

    .tag-dropdown-item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 6px 8px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 11px;
      text-align: left;
      cursor: pointer;
      border-radius: 4px;
      font-family: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background var(--dur-fast), color var(--dur-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
      }

      &.active {
        background: rgba(230, 157, 103, 0.08);
        color: var(--accent-secondary);
        font-weight: 500;
      }
    }

    .tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-secondary);
      flex-shrink: 0;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-light);
      margin: 4px 0;
    }

    .dropdown-empty {
      padding: 8px;
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
    }

    .lang-filter-container {
      position: relative;
      display: inline-block;
      flex-shrink: 0;
    }

    .lang-filter-btn {
      background: none;
      border: 1px solid var(--border-input);
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      height: 24px;
      padding: 0 8px;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all var(--dur-fast);
      position: relative;
      z-index: 1;

      &:hover:not(.active) {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }

      &.active {
        color: var(--accent-primary);
        border-color: rgba(230, 157, 103, 0.4);
        box-shadow: 0 0 8px rgba(230, 157, 103, 0.2);
        background: rgba(230, 157, 103, 0.05);
      }

      .btn-text {
        max-width: 90px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
    }

    .lang-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: var(--bg-menu);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 4px;
      min-width: 140px;
      max-width: 200px;
      max-height: 250px;
      overflow-y: auto;
      z-index: 999;
      box-shadow: var(--shadow-panel);
    }

    .lang-dropdown-item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 6px 8px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 11px;
      text-align: left;
      cursor: pointer;
      border-radius: 4px;
      font-family: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background var(--dur-fast), color var(--dur-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
      }

      &.active {
        background: rgba(230, 157, 103, 0.08);
        color: var(--accent-primary);
        font-weight: 500;
      }
    }

    .lang-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .sidebar-action-bar {
      display: flex;
      gap: 6px;
      margin: 8px 10px 4px;
      flex-shrink: 0;
    }

    .new-btn {
      flex: 1;
      padding: 7px;
      border: 1px dashed var(--border-input);
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      position: relative;
      z-index: 1;
      transition: color var(--dur-fast);

      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        background: var(--grad-hover);
        border-radius: 9px;
        z-index: -2;
        opacity: 0;
        filter: blur(4px);
        transition: opacity 0.3s;
      }

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: transparent;
        border-radius: 8px;
        z-index: -1;
        transition: background 0.3s;
      }

      &:hover {
        color: var(--accent-primary);
      }

      &:hover::before {
        opacity: 0.5;
      }

      &:hover::after {
        background: var(--bg-btn-inner);
      }
    }

    .backup-btn {
      flex: 0.8;
      padding: 7px;
      border: 1px dashed var(--border-input);
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      position: relative;
      z-index: 1;
      transition: color var(--dur-fast);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;

      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        background: var(--grad-hover);
        border-radius: 9px;
        z-index: -2;
        opacity: 0;
        filter: blur(4px);
        transition: opacity 0.3s;
      }

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: transparent;
        border-radius: 8px;
        z-index: -1;
        transition: background 0.3s;
      }

      &:hover {
        color: var(--accent-primary);
      }

      &:hover::before {
        opacity: 0.5;
      }

      &:hover::after {
        background: var(--bg-btn-inner);
      }
    }

    .create-form {
      margin: 0 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-input, .form-select {
      padding: 6px 9px;
      background: var(--bg-input);
      border: 1px solid var(--border-input);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 12px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow-primary);
      }

      option {
        background: var(--bg-menu);
      }
    }

    .form-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .form-btn {
      padding: 5px 13px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      position: relative;
      z-index: 1;
      font-weight: 600;

      &.primary {
        background: transparent;
        border: none;
        color: var(--accent-primary);
        transition: color var(--dur-fast);

        &::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: var(--grad-hover);
          border-radius: 9px;
          z-index: -2;
          opacity: 0;
          filter: blur(4px);
          transition: opacity var(--dur-fast);
        }

        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--bg-btn-inner);
          border: 1px solid var(--border-input);
          border-radius: 8px;
          z-index: -1;
          transition: background var(--dur-fast), border-color var(--dur-fast);
        }

        &:hover {
          color: #ffffff;
        }

        &:hover::before {
          opacity: 0.5;
        }

        &:hover::after {
          background: var(--accent-primary);
          border-color: transparent;
        }
      }

      &.secondary {
        background: var(--bg-input);
        color: var(--text-secondary);
        border: 1px solid var(--border-input);
      }
    }

    .snippet-list {
      list-style: none;
      padding: 4px 0;
      margin: 0;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .snippet-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0;
      padding: 8px 8px 8px 0;
      cursor: pointer;
      border-left: 2px solid transparent;
      animation: appear var(--dur-standard) var(--ease-out-expo) both;
      transition: background var(--dur-fast), transform var(--dur-fast) var(--ease-out-expo),
      border-left-color var(--dur-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.03);
        transform: translateX(2px);

        .item-actions {
          opacity: 1;
        }

        .drag-handle {
          opacity: 1;
        }
      }

      &.active {
        background: rgba(230, 157, 103, 0.05);
        border-left-color: var(--accent-color, var(--accent-primary));

        .item-title {
          color: var(--text-primary);
        }
      }

      &.selected {
        background: rgba(212, 175, 55, 0.06);
        border-left-color: var(--accent-secondary);
      }

      &.dragging {
        opacity: 0.3;
        pointer-events: none;
      }

      &.drag-over {
        border-top: 2px solid var(--accent-primary);
        background: rgba(230, 157, 103, 0.04);
      }
    }

    .drag-handle {
      font-size: 14px;
      color: var(--text-muted);
      padding: 0 6px;
      cursor: grab;
      opacity: 0;
      flex-shrink: 0;
      transition: opacity var(--dur-fast);
      user-select: none;
    }

    .item-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .item-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color var(--dur-fast);
    }

    .item-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .item-lang {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
    }

    .item-tag {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 99px;
      cursor: pointer;
      background: rgba(212, 175, 55, 0.08);
      color: var(--accent-secondary);
      border: 1px solid rgba(212, 175, 55, 0.2);
      transition: all var(--dur-fast);

      &:hover {
        background: rgba(212, 175, 55, 0.15);
        border-color: var(--accent-secondary);
      }
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      opacity: 0;
      transition: opacity var(--dur-fast);
      flex-shrink: 0;
      padding-right: 6px;
    }

    .snippet-item:not(:hover) .item-actions {
      .action-btn.starred {
        opacity: 1;
      }
    }

    .action-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--dur-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
      }

      &.starred {
        color: var(--status-warning);
      }

      &.danger:hover {
        color: var(--status-danger);
        background: rgba(255, 77, 77, 0.1);
      }
    }

    .rename-input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--accent-primary);
      border-radius: 4px;
      color: var(--text-primary);
      padding: 2px 7px;
      font-size: 12px;
      outline: none;
      box-shadow: var(--shadow-glow-primary);
      font-family: inherit;
    }

    .delete-confirm {
      position: absolute;
      bottom: -34px;
      left: 10px;
      right: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      background: var(--bg-menu);
      border: 1px solid rgba(255, 77, 77, 0.3);
      border-radius: 8px;
      font-size: 11px;
      color: var(--status-danger);
      z-index: 10;
      box-shadow: var(--shadow-panel);
    }

    .confirm-btn {
      font-size: 10px;
      padding: 2px 9px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid;

      &.yes {
        background: rgba(255, 77, 77, 0.12);
        color: var(--status-danger);
        border-color: rgba(255, 77, 77, 0.3);
      }

      &.no {
        background: var(--bg-input);
        color: var(--text-secondary);
        border-color: var(--border-input);
      }
    }

    .empty-state {
      padding: 24px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .link-btn {
      background: none;
      border: none;
      color: var(--accent-primary);
      cursor: pointer;
      font-size: 11px;
      text-decoration: underline;
    }

    /* Context Menu */
    .context-menu {
      position: fixed;
      background: var(--bg-menu, #2a2a2a);
      border: 1px solid var(--border-light, #444);
      border-radius: 6px;
      padding: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      min-width: 140px;
    }

    .context-menu-item {
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      color: var(--text-primary, #eee);
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .context-menu-item:hover {
      background: var(--accent-primary, #d4af37);
      color: #000;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .modal-content {
      background: var(--bg-sidebar-left, #1e1e1e);
      border: 1px solid var(--border-light, #333);
      border-radius: 12px;
      padding: 20px;
      width: 320px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-content h3 {
      margin: 0;
      font-size: 16px;
      color: var(--text-primary);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    .sidebar-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid var(--border-light);
      background: rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }

    .version-label {
      font-size: 10px;
      color: var(--text-muted);
      font-family: monospace;
    }

    .settings-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color var(--dur-fast);

      &:hover {
        color: var(--accent-primary);
      }
    }

    .settings-modal {
      width: 440px !important;
    }

    .settings-desc {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 0;
      border-top: 1px solid var(--border-light);
    }

    .settings-sec-title {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-primary);
      font-weight: 700;
      margin-bottom: 2px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;

      &.flex-col {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
    }

    .setting-label {
      color: var(--text-secondary);
    }

    .setting-label-sub {
      font-size: 10px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .zoom-btn {
      width: 26px;
      height: 24px;
      background: var(--bg-input);
      border: 1px solid var(--border-input);
      border-radius: 6px;
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      transition: all var(--dur-fast);

      &:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }
    }

    .zoom-value {
      min-width: 38px;
      text-align: center;
      font-size: 12px;
      font-family: monospace;
      color: var(--text-primary);
      font-weight: 600;
    }

    .zoom-reset-btn {
      padding: 3px 8px;
      font-size: 10px;
      background: transparent;
      border: 1px solid var(--border-input);
      border-radius: 6px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--dur-fast);

      &:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }
    }

    .action-btn-settings {
      width: 100%;
      padding: 7px 10px;
      font-size: 11px;
      background: transparent;
      border: 1px dashed var(--border-input);
      border-radius: 8px;
      color: var(--accent-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 600;
      position: relative;
      z-index: 1;
      transition: color var(--dur-fast), border-color var(--dur-fast);

      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        background: var(--grad-hover);
        border-radius: 9px;
        z-index: -2;
        opacity: 0;
        filter: blur(4px);
        transition: opacity var(--dur-fast);
      }

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: transparent;
        border-radius: 8px;
        z-index: -1;
        transition: background var(--dur-fast);
      }

      &:hover {
        color: var(--text-primary);
        border-color: transparent;
      }

      &:hover::before {
        opacity: 0.5;
      }

      &:hover::after {
        background: var(--bg-btn-inner);
      }
    }

    .stats-grid {
      display: flex;
      gap: 10px;
      margin-bottom: 4px;
    }

    .stats-item {
      flex: 1;
      background: var(--bg-input);
      border: 1px solid var(--border-input);
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .stat-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-primary);
      font-family: monospace;
    }

    .stat-lbl {
      font-size: 9px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      line-height: 1.4;
    }

    .info-lbl {
      color: var(--text-muted);
    }

    .info-val {
      color: var(--text-secondary);

      &.text-success {
        color: var(--status-success);
        font-weight: 600;
      }

      &.filepath {
        font-family: monospace;
        background: var(--bg-input);
        padding: 1px 4px;
        border-radius: 4px;
        font-size: 10px;
      }
    }
  `]
})
export class SidebarComponent {
  snippetService = inject(SnippetService);
  folderService = inject(FolderService);

  // Settings Modal State
  settingsModalVisible = signal(false);
  currentZoomPercent = signal(100);

  // Tag Dropdown State
  tagDropdownOpen = signal(false);

  // Language Dropdown State
  langDropdownOpen = signal(false);

  allTags = computed(() => {
    const set = new Set<string>();
    for (const s of this.snippetService.snippets()) {
      if (s.tags) {
        for (const t of s.tags) {
          if (t.trim()) set.add(t.trim());
        }
      }
    }
    return Array.from(set).sort();
  });

  private get electronAPI(): any {
    return (window as any).electronAPI;
  }

  newSnippetRequested = input(false);

  showCreateForm = signal(false);
  newSnippetTitle: string = '';
  newSnippetLanguage: string = 'text';

  renamingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  renameValue: string = '';
  private isCommitting = false;

  // Context Menu State
  contextMenuVisible = signal(false);
  contextMenuPosition = signal({ x: 0, y: 0 });
  contextMenuSnippet = signal<Snippet | null>(null);

  // Edit Modal State
  editModalVisible = signal(false);
  editData = { id: '', title: '', language: '', description: '' };
  isSavingMetadata = signal(false);

  availableLanguages = [
    {label: 'Code Fragment', value: 'text'},
    {label: 'Java Class', value: 'java'},
    {label: 'AI Prompt', value: 'prompt'},
    {label: 'Markdown', value: 'markdown'},
    {label: 'TypeScript', value: 'typescript'},
    {label: 'Python', value: 'python'},
    {label: 'HTML', value: 'html'},
    {label: 'CSS', value: 'css'},
    {label: 'SCSS', value: 'scss'},
    {label: 'JavaScript', value: 'javascript'},
    {label: 'JSON', value: 'json'},
    {label: 'XML', value: 'xml'},
    {label: 'YAML', value: 'yaml'},
    {label: 'SQL', value: 'sql'},
    {label: 'Kotlin', value: 'kotlin'},
    {label: 'Go', value: 'go'},
    {label: 'Rust', value: 'rust'},
    {label: 'C#', value: 'csharp'},
    {label: 'PHP', value: 'php'},
    {label: 'Ruby', value: 'ruby'},
    {label: 'Swift', value: 'swift'},
    {label: 'Bash', value: 'bash'},
    {label: 'Dockerfile', value: 'dockerfile'},
  ];

  constructor() {
    effect(() => {
      if (this.newSnippetRequested()) {
        this.toggleCreateForm();
      }
    });

    if (this.electronAPI) {
      this.electronAPI.getZoom().then((level: number) => {
        this.updateZoomPercent(level);
      });
    }
  }

  openSettings(): void {
    this.settingsModalVisible.set(true);
    if (this.electronAPI) {
      this.electronAPI.getZoom().then((level: number) => {
        this.updateZoomPercent(level);
      });
    }
  }

  closeSettings(): void {
    this.settingsModalVisible.set(false);
  }

  zoomIn(): void {
    if (this.electronAPI) {
      this.electronAPI.zoomIn().then((level: number) => this.updateZoomPercent(level));
    } else {
      const current = this.currentZoomPercent();
      const next = Math.min(current + 10, 150);
      this.currentZoomPercent.set(next);
      document.body.style.zoom = String(next / 100);
    }
  }

  zoomOut(): void {
    if (this.electronAPI) {
      this.electronAPI.zoomOut().then((level: number) => this.updateZoomPercent(level));
    } else {
      const current = this.currentZoomPercent();
      const next = Math.max(current - 10, 70);
      this.currentZoomPercent.set(next);
      document.body.style.zoom = String(next / 100);
    }
  }

  resetZoom(): void {
    if (this.electronAPI) {
      this.electronAPI.resetZoom().then((level: number) => this.updateZoomPercent(level));
    } else {
      this.currentZoomPercent.set(100);
      document.body.style.zoom = '1';
    }
  }

  private updateZoomPercent(level: number): void {
    const pct = Math.round(Math.pow(1.2, level) * 100);
    this.currentZoomPercent.set(pct);
  }

  openDataFolder(): void {
    if (this.electronAPI) {
      this.electronAPI.openDataFolder();
    } else {
      alert('Local storage directory can only be opened when running inside the desktop app.');
    }
  }

  onRightClick(event: MouseEvent, snippet: Snippet) {
    event.preventDefault();
    this.contextMenuSnippet.set(snippet);
    this.contextMenuPosition.set({ x: event.clientX, y: event.clientY });
    this.contextMenuVisible.set(true);

    setTimeout(() => {
      const close = () => {
        this.contextMenuVisible.set(false);
        document.removeEventListener('click', close);
        document.removeEventListener('contextmenu', close);
      };
      document.addEventListener('click', close);
      document.addEventListener('contextmenu', close);
    });
  }

  openEditModal() {
    this.contextMenuVisible.set(false);
    const snippet = this.contextMenuSnippet();
    if (snippet) {
      this.editData = {
        id: snippet.id,
        title: snippet.title,
        language: snippet.language,
        description: snippet.description || ''
      };
      this.editModalVisible.set(true);
    }
  }

  closeEditModal() {
    this.editModalVisible.set(false);
  }

  exportVault(): void {
    window.location.href = 'http://localhost:8080/api/vault/export';
  }

  saveEditModal() {
    if (!this.editData.title.trim() || !this.editData.language) {
      alert('Title and Language are required.');
      return;
    }
    this.isSavingMetadata.set(true);
    this.snippetService.updateSnippetMetadata(this.editData.id, {
      title: this.editData.title,
      language: this.editData.language,
      description: this.editData.description
    }).subscribe({
      next: () => {
        this.isSavingMetadata.set(false);
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Failed to update metadata', err);
        alert('Failed to update snippet metadata');
        this.isSavingMetadata.set(false);
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
        const toIdx = list.findIndex(s => s.id === snippet.id);
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

  draggingId = signal<string | null>(null);
  dragOverId = signal<string | null>(null);

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
    const targetId = this.dragOverId();

    if (!draggedId || !targetId || draggedId === targetId) {
      this.onDragEnd();
      return;
    }

    const currentOrder = this.snippetService.filteredSnippets().map(s => s.id);
    const fromIdx = currentOrder.indexOf(draggedId);
    const toIdx = currentOrder.indexOf(targetId);

    if (fromIdx === -1 || toIdx === -1) {
      this.onDragEnd();
      return;
    }

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

  private activeTagCloseHandler: ((e: MouseEvent | KeyboardEvent) => void) | null = null;
  private activeLangCloseHandler: ((e: MouseEvent | KeyboardEvent) => void) | null = null;

  closeTagDropdown(): void {
    this.tagDropdownOpen.set(false);
    if (this.activeTagCloseHandler) {
      document.removeEventListener('click', this.activeTagCloseHandler);
      document.removeEventListener('keydown', this.activeTagCloseHandler);
      this.activeTagCloseHandler = null;
    }
  }

  closeLangDropdown(): void {
    this.langDropdownOpen.set(false);
    if (this.activeLangCloseHandler) {
      document.removeEventListener('click', this.activeLangCloseHandler);
      document.removeEventListener('keydown', this.activeLangCloseHandler);
      this.activeLangCloseHandler = null;
    }
  }

  toggleTagDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const open = !this.tagDropdownOpen();
    if (!open) {
      this.closeTagDropdown();
      return;
    }

    this.tagDropdownOpen.set(true);

    if (this.activeTagCloseHandler) {
      document.removeEventListener('click', this.activeTagCloseHandler);
      document.removeEventListener('keydown', this.activeTagCloseHandler);
      this.activeTagCloseHandler = null;
    }

    setTimeout(() => {
      const close = (e: MouseEvent | KeyboardEvent) => {
        if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
        this.closeTagDropdown();
      };
      this.activeTagCloseHandler = close;
      document.addEventListener('click', close);
      document.addEventListener('keydown', close);
    });
  }

  selectTagFilter(tag: string | null): void {
    this.snippetService.activeTagFilter.set(tag);
    this.closeTagDropdown();
  }

  toggleLangDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const open = !this.langDropdownOpen();
    if (!open) {
      this.closeLangDropdown();
      return;
    }

    this.langDropdownOpen.set(true);

    if (this.activeLangCloseHandler) {
      document.removeEventListener('click', this.activeLangCloseHandler);
      document.removeEventListener('keydown', this.activeLangCloseHandler);
      this.activeLangCloseHandler = null;
    }

    setTimeout(() => {
      const close = (e: MouseEvent | KeyboardEvent) => {
        if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
        this.closeLangDropdown();
      };
      this.activeLangCloseHandler = close;
      document.addEventListener('click', close);
      document.addEventListener('keydown', close);
    });
  }

  selectLanguageFilter(lang: string | null): void {
    this.snippetService.activeLanguageFilter.set(lang);
    this.closeLangDropdown();
  }

  getLanguageLabel(langValue: string | null): string | null {
    if (!langValue) return null;
    const found = this.availableLanguages.find(l => l.value === langValue);
    return found ? found.label : langValue;
  }

  tagColor(tag: string): string {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hues = [25, 45, 140, 195, 220, 270, 310, 340];
    const hue = hues[Math.abs(hash) % hues.length];
    return `hsl(${hue}, 80%, 65%)`;
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
