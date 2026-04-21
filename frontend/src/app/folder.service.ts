import {Injectable, inject, signal, computed} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, tap} from 'rxjs';
import {Folder} from './models/folder.model';

/**
 * ──────────────────────────────────────────────
 * <h2>FolderService</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Manages client-side state and coordinates API interactions for snippet folder organization.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Handles CRUD operations (Create, Read, Update, Delete) for folders via the backend API.</li>
 * <li>Maintains a reactive, centralized list of folders using Angular Signals for automatic UI synchronization.</li>
 * <li>Provides efficient computed signals for derived state, such as a quick-lookup folder map and lists of root-level folders.</li>
 * <li>Supports operations that impact the folder hierarchy, such as persisting the display order of folders and handling recursive deletion logic.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Injectable} service provided at the root level, utilizing {@code HttpClient} for network requests and Angular Signals for reactive state management across the application.</p>
 * ──────────────────────────────────────────────
 */
@Injectable({providedIn: 'root'})
export class FolderService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/folders';

  folders = signal<Folder[]>([]);

  folderMap = computed(() =>
    new Map(this.folders().map(f => [f.id, f]))
  );

  rootFolders = computed(() =>
    this.folders().filter(f => !f.parentId)
  );

  childFolders(parentId: string): Folder[] {
    return this.folders().filter(f => f.parentId === parentId);
  }

  loadFolders(): void {
    this.http.get<Folder[]>(this.apiUrl).subscribe({
      next: data => this.folders.set(data),
      error: err => console.error('Error loading folders', err)
    });
  }

  createFolder(name: string, parentId?: string | null, color?: string, icon?: string): Observable<Folder> {
    return this.http.post<Folder>(this.apiUrl, {name, parentId, color, icon}).pipe(
      tap(folder => this.folders.update(list => [...list, folder]))
    );
  }

  updateFolder(id: string, changes: Partial<Pick<Folder, 'name' | 'color' | 'icon' | 'expanded'>>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, changes).pipe(
      tap(() => {
        this.folders.update(list =>
          list.map(f => f.id === id ? {...f, ...changes} : f)
        );
      })
    );
  }

  deleteFolder(id: string, moveSnippetsToRoot = true): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}?moveSnippetsToRoot=${moveSnippetsToRoot}`
    ).pipe(
      tap(() => {
        const toRemove = this.collectDescendants(id);
        this.folders.update(list => list.filter(f => !toRemove.has(f.id)));
      })
    );
  }

  persistOrder(orderedIds: string[]): Observable<void> {
    const body = orderedIds.map((id, i) => ({id, sortOrder: i}));
    return this.http.put<void>(`${this.apiUrl}/order`, body);
  }

  private collectDescendants(id: string): Set<string> {
    const result = new Set<string>([id]);
    this.folders()
      .filter(f => f.parentId === id)
      .forEach(child => {
        this.collectDescendants(child.id).forEach(d => result.add(d));
      });
    return result;
  }
}
