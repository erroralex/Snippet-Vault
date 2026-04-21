import {Component, inject, OnInit, HostListener, signal, effect, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {Title} from '@angular/platform-browser';
import {SidebarComponent} from '../features/sidebar/sidebar.component';
import {MonacoEditorComponent} from '../features/editor/monaco-editor.component';
import {SnippetService} from '../core/service/snippet.service';
import {AiPanelComponent} from '../features/editor/ai-panel.component';
import {TitlebarComponent} from '../features/titlebar/titlebar.component';
import {DescriptionPaneComponent} from './description-pane.component';
import {FolderTreeComponent} from './folder-tree.component';
import {BulkActionBarComponent} from './bulk-action-bar.component';
import {CommandPaletteComponent} from './command-palette.component';
import {FolderService} from './folder.service';

/**
 * ──────────────────────────────────────────────
 * <h2>AppComponent</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> The root component that orchestrates the primary layout and global state of the Snippet Vault application.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Serves as the main container for the user interface, including title bar, sidebar, and editor areas.</li>
 * <li>Initializes global services and configuration, such as the Monaco Editor's web worker paths.</li>
 * <li>Manages the dynamic resizing of the sidebar and persists its width to local storage.</li>
 * <li>Handles global keyboard shortcuts, like initiating the creation of a new snippet.</li>
 * <li>Dynamically updates the application window title based on the currently selected snippet.</li>
 * <li>Triggers the initial loading of snippets and folders upon application startup.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Component} that acts as the entry point for the component tree, integrating various feature modules and managing high-level application interactions and state.</p>
 * ──────────────────────────────────────────────
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TitlebarComponent,
    FolderTreeComponent,
    SidebarComponent,
    BulkActionBarComponent,
    CommandPaletteComponent,
    DescriptionPaneComponent,
    MonacoEditorComponent,
    AiPanelComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit {
  snippetService = inject(SnippetService);
  private folderService = inject(FolderService);
  private titleService = inject(Title);
  private platformId = inject(PLATFORM_ID);

  newSnippetRequested = signal(false);

  sidebarWidth = signal(240);
  isResizing = signal(false);
  private startX = 0;
  private startW = 0;

  readonly MIN_SIDEBAR = 160;
  readonly MAX_SIDEBAR = 400;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: any, label: string) {
          if (label === 'json') {
            return './assets/monaco/vs/language/json/json.worker.js';
          }
          if (label === 'css' || label === 'scss' || label === 'less') {
            return './assets/monaco/vs/language/css/css.worker.js';
          }
          if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './assets/monaco/vs/language/html/html.worker.js';
          }
          if (label === 'typescript' || label === 'javascript') {
            return './assets/monaco/vs/language/typescript/ts.worker.js';
          }
          return './assets/monaco/vs/editor/editor.worker.js';
        }
      };
    }

    effect(() => {
      const s = this.snippetService.selectedSnippet();
      this.titleService.setTitle(s ? `${s.title} — Snippet Vault` : 'Snippet Vault');
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      this.newSnippetRequested.set(true);
    }
  }

  ngOnInit(): void {
    this.snippetService.loadSnippets();
    this.folderService.loadFolders();
    const saved = localStorage.getItem('sidebarWidth');
    if (saved) this.sidebarWidth.set(Number(saved));
  }

  startResize(event: MouseEvent): void {
    this.isResizing.set(true);
    this.startX = event.clientX;
    this.startW = this.sidebarWidth();
    event.preventDefault();
    document.body.classList.add('resizing');
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing()) return;
    const delta = event.clientX - this.startX;
    const newWidth = Math.min(this.MAX_SIDEBAR,
      Math.max(this.MIN_SIDEBAR, this.startW + delta));
    this.sidebarWidth.set(newWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizing.set(false);
    localStorage.setItem('sidebarWidth', String(this.sidebarWidth()));
    document.body.classList.remove('resizing');
  }
}
