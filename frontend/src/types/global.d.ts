export {};

/**
 * Extends the global `Window` interface to include custom APIs exposed by the Electron
 * main process via the preload script. This provides type safety and autocompletion
 * for Electron-specific functionality within the Angular application.
 *
 * The `electronAPI` object defines the contract for interacting with the desktop
 * window itself, allowing the frontend to trigger actions like minimizing, maximizing,
 * and closing the window. It also provides a mechanism to listen for window state
 * changes (e.g., when the window is maximized by the user) and to identify the
 * current operating system.
 *
 * The `__ANTHROPIC_KEY__` is a placeholder for securely injecting an API key,
 * although its direct use on the window object is generally discouraged in production
 * for security reasons.
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
    };
    __ANTHROPIC_KEY__: string;
  }
}
