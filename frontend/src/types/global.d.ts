export {};

/**
 * ──────────────────────────────────────────────
 * <h2>Global Window Extension</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Extends the global TypeScript {@code Window} interface to provide type safety for custom Electron APIs exposed via the preload script.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Defines the contract for the {@code electronAPI} object available on the global window scope.</li>
 * <li>Provides type definitions for native window control methods (minimize, maximize, close).</li>
 * <li>Typifies the listener mechanism for reacting to window maximization state changes.</li>
 * <li>Exposes the underlying operating system platform identifier.</li>
 * <li>Includes a placeholder definition for securely injecting an API key.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A TypeScript declaration file ({@code .d.ts}) that ensures the Angular frontend compiles correctly and provides IDE autocompletion when interacting with the Node.js backend processes via Electron's context bridge.</p>
 * ──────────────────────────────────────────────
 */
declare global {
  interface Window {
    electronAPI: {
      minimizeWindow:   () => Promise<void>;
      maximizeWindow:   () => Promise<void>;
      closeWindow:      () => Promise<void>;
      isMaximized:      () => Promise<boolean>;
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
      platform:         'win32' | 'darwin' | 'linux';
      zoomIn:           () => Promise<number>;
      zoomOut:          () => Promise<number>;
      resetZoom:        () => Promise<number>;
      getZoom:          () => Promise<number>;
      openDataFolder:   () => Promise<void>;
    };
    __ANTHROPIC_KEY__: string;
  }
}
