import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Folder } from './models/folder.model';

/**
 * Manages all folder-related operations and state for the Snippet Vault application.
 *
 * This service acts as the central hub for interacting with the folder API, handling
 * CRUD operations (Create, Read, Update, Delete) and managing the client-side state
 * of folders. It uses Angular Signals to maintain a reactive list of folders, ensuring
 * that the UI automatically updates when folder data changes. The service provides
 * methods to load, create, update, and delete folders, as well as to persist their
 * display order. It also includes computed signals for efficient data derivation,
 * such as creating a quick-lookup map and filtering for root-level folders.
 */
@Injectable({ providedIn: 'root' })
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
    return this.http.post<Folder>(this.apiUrl, { name, parentId, color, icon }).pipe(
      tap(folder => this.folders.update(list => [...list, folder]))
    );
  }

  updateFolder(id: string, changes: Partial<Pick<Folder, 'name' | 'color' | 'icon' | 'expanded'>>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, changes).pipe(
      tap(() => {
        this.folders.update(list =>
          list.map(f => f.id === id ? { ...f, ...changes } : f)
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
    const body = orderedIds.map((id, i) => ({ id, sortOrder: i }));
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
