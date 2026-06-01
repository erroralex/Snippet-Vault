import {
  Component, OnInit, OnDestroy, inject, signal, PLATFORM_ID, HostListener
} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {SnippetService} from '../../core/service/snippet.service';

/**
 * ──────────────────────────────────────────────
 * <h2>TitlebarComponent</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Renders a custom, frameless window title bar integrating seamlessly with the Electron desktop environment.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Provides a draggable area for moving the application window across the screen.</li>
 * <li>Implements OS-specific window controls (minimize, maximize/restore, close) adapting layout for macOS vs. Windows/Linux.</li>
 * <li>Communicates directly with the Electron main process via a secure {@code electronAPI} bridge to execute window actions.</li>
 * <li>Listens for and synchronizes with native window state changes (e.g., updating the maximize icon when snapped to a screen edge).</li>
 * <li>Dynamically displays the title of the currently selected snippet for contextual awareness.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Component} that serves as the top-level application header, bridging web UI with native OS window management capabilities via Electron IPC.</p>
 * ──────────────────────────────────────────────
 */
@Component({
  selector: 'app-titlebar',
  standalone: true,
  template: `
    <div class="titlebar" [class.maximized]="isMaximized()">

      @if (isMac) {
        <div class="controls mac">
          <button class="ctrl close" (click)="close()" title="Close"></button>
          <button class="ctrl minimize" (click)="minimize()" title="Minimize"></button>
          <button class="ctrl maximize" (click)="toggleMaximize()" title="Maximize"></button>
        </div>
        <div class="title-area">
          <span class="app-name">Snippet Vault</span>
          @if (snippetService.selectedSnippet(); as s) {
            <span class="separator">—</span>
            <span class="snippet-title">{{ s.title }}</span>
          }
        </div>
      }

      @if (!isMac) {
        <div class="app-identity">
          <span class="app-icon">❰❱</span>
          <span class="app-name">Snippet Vault</span>
        </div>
        <div class="title-area">
          @if (snippetService.selectedSnippet(); as s) {
            <span class="snippet-title">{{ s.title }}</span>
          }
        </div>
        <div class="controls win">
          <button class="ctrl-win minimize" (click)="minimize()" title="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1">
              <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" stroke-width="1"/>
            </svg>
          </button>
          <button class="ctrl-win maximize" (click)="toggleMaximize()" [title]="isMaximized() ? 'Restore' : 'Maximize'">
            @if (isMaximized()) {
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="2" y="0" width="8" height="8" stroke="currentColor" stroke-width="1"/>
                <rect x="0" y="2" width="8" height="8" stroke="currentColor" stroke-width="1" fill="var(--bg-header)"/>
              </svg>
            } @else {
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" stroke-width="1"/>
              </svg>
            }
          </button>
          <button class="ctrl-win close" (click)="close()" title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/>
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </button>
        </div>
      }

    </div>
  `,
  styles: [`
    :host {
      display: block;
      -webkit-app-region: drag;
      user-select: none;
    }

    .titlebar {
      height: 40px;
      background: var(--bg-header);
      backdrop-filter: var(--glass-blur);
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      width: 100%;
      flex-shrink: 0;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--grad-hover);
        opacity: 0.25;
        pointer-events: none;
      }
    }

    .app-identity {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 14px;
      flex-shrink: 0;
    }

    .app-icon {
      font-size: 14px;
      font-family: monospace;
      font-weight: 700;
      background: var(--grad-text);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .app-name {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .title-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      overflow: hidden;
      padding: 0 8px;
    }

    .separator {
      font-size: 12px;
      color: var(--text-muted);
    }

    .snippet-title {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300px;
    }

    // macOS
    .controls.mac {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px;
      -webkit-app-region: no-drag;
      flex-shrink: 0;
    }

    .ctrl {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: filter var(--dur-fast);

      &.close {
        background: #ff5f57;
      }

      &.minimize {
        background: #febc2e;
      }

      &.maximize {
        background: #28c840;
      }

      &:hover {
        filter: brightness(1.3);
      }
    }

    // Windows/Linux
    .controls.win {
      display: flex;
      height: 40px;
      margin-left: auto;
      flex-shrink: 0;
      -webkit-app-region: no-drag;
    }

    .ctrl-win {
      width: 46px;
      height: 40px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-app-region: no-drag;
      position: relative;
      z-index: 1;
      transition: color var(--dur-fast), background-color var(--dur-fast);

      &:hover {
        background-color: var(--border-light);
        color: var(--text-primary);
      }

      &.close:hover {
        background-color: var(--status-danger);
        color: #ffffff;
      }
    }
  `]
})
export class TitlebarComponent implements OnInit, OnDestroy {
  snippetService = inject(SnippetService);
  private platformId = inject(PLATFORM_ID);

  isMaximized = signal(false);
  isMac = false;

  private cleanupMaximizeListener?: () => void;

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('button')) return;
    this.toggleMaximize();
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isMac = window.electronAPI?.platform === 'darwin';

    window.electronAPI?.isMaximized().then(v => this.isMaximized.set(v));

    this.cleanupMaximizeListener = window.electronAPI?.onMaximizeChange(
      (value) => this.isMaximized.set(value)
    );
  }

  ngOnDestroy(): void {
    this.cleanupMaximizeListener?.();
  }

  minimize(): void {
    window.electronAPI?.minimizeWindow();
  }

  close(): void {
    window.electronAPI?.closeWindow();
  }

  toggleMaximize(): void {
    window.electronAPI?.maximizeWindow();
  }
}
