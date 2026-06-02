import {Injectable, signal, inject, PLATFORM_ID, computed, effect} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Client, IFrame, IMessage} from '@stomp/stompjs';
import {tap} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {FolderService} from '../../app/folder.service';

export interface Snippet {
  id: string;
  title: string;
  language: string;
  content: string;
  filePath: string;
  lastModified?: string;
  tags: string[];
  aiSummary?: string;
  description: string | null;
  favorite: boolean;
  sortOrder: number;
  colorLabel?: string | null;
  folderId: string | null;
  template: boolean;
}

/**
 * ──────────────────────────────────────────────
 * <h2>SnippetService</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Serves as the core data layer and state manager for code snippets within the application.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Acts as the single source of truth for snippet data, exposing state via Angular Signals.</li>
 * <li>Manages all CRUD operations (Create, Read, Update, Delete) via HTTP requests to the backend API.</li>
 * <li>Handles complex filtering and sorting logic (search query, language, tags, folders, favorites) through derived computed signals.</li>
 * <li>Establishes and maintains a STOMP WebSocket connection to receive real-time updates from the server, ensuring cross-client synchronization.</li>
 * <li>Maintains user interaction states, such as the currently selected snippet, multiple selection sets for bulk actions, and recently viewed snippets.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Injectable} service provided at the root level, integrating {@code HttpClient} for REST communication, {@code @stomp/stompjs} for WebSockets, and Angular Signals for reactive state management.</p>
 * ──────────────────────────────────────────────
 */
@Injectable({
  providedIn: 'root'
})
export class SnippetService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private folderService = inject(FolderService);

  snippets = signal<Snippet[]>([]);
  selectedSnippet = signal<Snippet | null>(null);

  searchQuery = signal('');
  activeLanguageFilter = signal<string | null>(null);
  showFavoritesOnly = signal(false);
  activeTagFilter = signal<string | null>(null);
  activeFolderId = signal<string | null | 'root'>('root');
  selectedIds = signal<Set<string>>(new Set());
  recentlyViewed = signal<string[]>([]);
  activeTheme = signal<'dark' | 'light'>('dark');
  activeEditorTheme = signal<'intellij-dark' | 'intellij-light'>('intellij-dark');

  availableLanguages = computed(() =>
    [...new Set(this.snippets().map(s => s.language))].sort()
  );

  filteredSnippets = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const lang = this.activeLanguageFilter();
    const tag = this.activeTagFilter();
    const favOnly = this.showFavoritesOnly();
    const folder = this.activeFolderId();

    return this.snippets()
      .filter(s => {
        if (s.template) return false;
        if (folder === 'root' && s.folderId !== null) return false;
        if (folder && folder !== 'root' && s.folderId !== folder) return false;
        if (favOnly && !s.favorite) return false;
        if (lang && s.language !== lang) return false;
        if (tag && !s.tags.includes(tag)) return false;
        if (q) {
          const haystack = [s.title, s.language, ...(s.tags ?? []),
            s.description ?? ''].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  });

  recentSnippets = computed(() =>
    this.recentlyViewed()
      .map(id => this.snippets().find(s => s.id === id))
      .filter((s): s is Snippet => !!s)
  );

  private stompClient!: Client;
  private readonly apiUrl = (() => {
    const electron = (window as any).electronAPI;
    if (electron && typeof electron.getBackendPort === 'function') {
      return `http://localhost:${electron.getBackendPort()}/api/snippets`;
    }
    return 'http://localhost:8080/api/snippets';
  })();
  private readonly wsUrl = (() => {
    const electron = (window as any).electronAPI;
    if (electron && typeof electron.getBackendPort === 'function') {
      return `ws://localhost:${electron.getBackendPort()}/ws`;
    }
    return 'ws://localhost:8080/ws';
  })();
  private justCreated = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initStompClient();

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        this.activeTheme.set(savedTheme);
      } else if (savedTheme === 'gold-dark') {
        this.activeTheme.set('dark');
      } else if (savedTheme === 'dark-tie') {
        this.activeTheme.set('light');
      }

      const savedEditorTheme = localStorage.getItem('editorTheme') as 'intellij-dark' | 'intellij-light';
      if (savedEditorTheme === 'intellij-dark' || savedEditorTheme === 'intellij-light') {
        this.activeEditorTheme.set(savedEditorTheme);
      }

      effect(() => {
        const theme = this.activeTheme();
        localStorage.setItem('theme', theme);

        const body = document.body;
        body.classList.remove('theme-gold-dark', 'theme-dark-tie', 'theme-dark', 'theme-light');
        body.classList.add(`theme-${theme}`);
      });

      effect(() => {
        localStorage.setItem('editorTheme', this.activeEditorTheme());
      });
    }
    this.loadSnippets();
  }

  loadSnippets(): void {
    this.http.get<Snippet[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.snippets.set(data);
        const currentSelected = this.selectedSnippet();
        if (currentSelected) {
          const updated = data.find(s => s.id === currentSelected.id);
          this.selectedSnippet.set(updated ?? null);
        } else if (data.length > 0 && this.justCreated) {
          const newest = [...data].sort((a, b) =>
            new Date(b.lastModified ?? 0).getTime() - new Date(a.lastModified ?? 0).getTime()
          )[0];
          this.selectedSnippet.set(newest);
          this.justCreated = false;
        }
      },
      error: (err) => console.error('Error loading snippets', err)
    });
  }

  selectSnippet(snippet: Snippet): void {
    this.selectedSnippet.set(snippet);
    this.recordView(snippet.id);
  }

  updateSnippet(id: string, content: string) {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put(url, {content}).pipe(
      tap(() => {
        console.log(`Request to save snippet ${id} sent.`);
      })
    );
  }

  createSnippet(title: string, language: string): Observable<Snippet> {
    this.justCreated = true;
    return this.http.post<Snippet>(this.apiUrl, {title, language}).pipe(
      tap((saved: Snippet) => {
        console.log(`Request to create snippet with title '${title}' sent.`);
        this.snippets.update(list => [...list, saved]);
      })
    );
  }

  renameSnippet(id: string, title: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/rename`, {title}).pipe(
      tap(() => {
        this.snippets.update(list =>
          list.map(s => s.id === id ? {...s, title} : s)
        );
        const sel = this.selectedSnippet();
        if (sel?.id === id) this.selectedSnippet.set({...sel, title});
      })
    );
  }

  updateSnippetMetadata(id: string, payload: { title: string, language: string, description: string }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/metadata`, payload).pipe(
      tap(() => {
        this.snippets.update(list =>
          list.map(s => s.id === id ? { ...s, title: payload.title, language: payload.language, description: payload.description } : s)
        );
        const sel = this.selectedSnippet();
        if (sel?.id === id) {
          this.selectedSnippet.set({ ...sel, title: payload.title, language: payload.language, description: payload.description });
        }
      })
    );
  }

  deleteSnippet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.snippets.update(list => list.filter(s => s.id !== id));
        if (this.selectedSnippet()?.id === id) this.selectedSnippet.set(null);
      })
    );
  }

  updateTags(id: string, tags: string[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/tags`, {tags}).pipe(
      tap(() => {
        this.snippets.update(list =>
          list.map(s => s.id === id ? {...s, tags} : s)
        );
      })
    );
  }

  updateDescription(id: string, description: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/description`, {description}).pipe(
      tap(() => {
        this.snippets.update(list =>
          list.map(s => s.id === id ? {...s, description} : s)
        );
        const sel = this.selectedSnippet();
        if (sel?.id === id) this.selectedSnippet.set({...sel, description});
      })
    );
  }

  toggleFavorite(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/favorite`, {}).pipe(
      tap(() => {
        this.snippets.update(list =>
          list.map(s => s.id === id ? {...s, favorite: !s.favorite} : s)
        );
      })
    );
  }

  persistOrder(orderedIds: string[]): Observable<void> {
    const body = orderedIds.map((id, index) => ({id, sortOrder: index}));
    return this.http.put<void>(`${this.apiUrl}/order`, body);
  }

  moveSnippets(ids: string[], folderId: string | null): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/move`, {snippetIds: ids, folderId}).pipe(
      tap(() => {
        this.snippets.update(list =>
          list.map(s => ids.includes(s.id) ? {...s, folderId} : s)
        );
      })
    );
  }

  recordView(id: string): void {
    this.recentlyViewed.update(ids => {
      const filtered = ids.filter(i => i !== id);
      return [id, ...filtered].slice(0, 5);
    });
  }

  toggleSelect(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  private initStompClient(): void {
    this.stompClient = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame: IFrame) => {
      console.log('Connected to WebSocket broker: ' + frame);
      this.stompClient.subscribe('/topic/snippets', (message: IMessage) => {
        if (message.body) {
          console.log('Received real-time update:', message.body);
          this.loadSnippets();
        }
      });
      this.stompClient.subscribe('/topic/folders', (message: IMessage) => {
        if (message.body) {
          console.log('Received real-time folder update:', message.body);
          this.folderService.loadFolders();
        }
      });
    };

    this.stompClient.onStompError = (frame: IFrame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.stompClient.activate();
  }
}
