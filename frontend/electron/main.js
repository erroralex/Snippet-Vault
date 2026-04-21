/**
 * ──────────────────────────────────────────────
 * <h2>Electron Main Process</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Orchestrates the Electron application lifecycle, window management, and backend synchronization.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Bootstraps the application, displaying a splash screen while the Spring Boot backend initializes.</li>
 * <li>Polls the backend health endpoint to verify readiness before revealing the main application window.</li>
 * <li>Manages the creation and configuration of both the splash and main browser windows, including security settings (context isolation, preloads).</li>
 * <li>Handles inter-process communication (IPC) for custom window controls (minimize, maximize, close).</li>
 * <li>Intercepts keyboard events for application-wide zooming and developer tools toggling.</li>
 * <li>Ensures a graceful shutdown of the local Spring Boot backend when the Electron application is closed.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> The entry point for the Electron main process, managing native OS interactions, window states, and ensuring the bundled Java backend is running and properly terminated.</p>
 * ──────────────────────────────────────────────
 */
const {app, BrowserWindow, ipcMain} = require('electron');
const http = require('http');
const path = require('path');

const BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health';
const BACKEND_POLL_INTERVAL_MS = 500;
const BACKEND_TIMEOUT_MS = 30000;
const ANGULAR_DEV_URL = 'http://localhost:4200';
const ANGULAR_PROD_PATH = path.join(__dirname, '..', 'dist', 'frontend', 'browser', 'index.html');
const SHUTDOWN_URL = 'http://localhost:8080/actuator/shutdown';

function requestShutdown() {
  return new Promise((resolve) => {
    const req = http.request(SHUTDOWN_URL, {method: 'POST', timeout: 2000}, (res) => {
      res.on('data', () => {
      });
      res.on('end', resolve);
    });
    req.on('error', resolve);
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });
    req.end();
  });
}

async function shutdownBackendAndClose(window) {
  if (!window || window.isDestroyed()) {
    return;
  }
  await requestShutdown();
  window.destroy();
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    }
  });

  splash.loadFile(path.join(__dirname, '..', 'splash.html'));

  splash.webContents.on('devtools-opened', () => {
    splash.webContents.closeDevTools();
  });

  return splash;
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    show: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    win.loadURL(ANGULAR_DEV_URL);
  } else {
    win.loadFile(ANGULAR_PROD_PATH);
  }

  win.webContents.on('before-input-event', (event, input) => {
    const isCtrlOrMeta = input.control || input.meta;

    if (isCtrlOrMeta && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools();
      return;
    }

    if (isCtrlOrMeta && input.type === 'keyDown') {
      const currentZoom = win.webContents.getZoomLevel();
      const zoomStep = 0.5;
      const minZoom = -3.0;
      const maxZoom = 3.0;

      if (input.key === '=' || input.key === '+') {
        win.webContents.setZoomLevel(Math.min(currentZoom + zoomStep, maxZoom));
        event.preventDefault();
      } else if (input.key === '-') {
        win.webContents.setZoomLevel(Math.max(currentZoom - zoomStep, minZoom));
        event.preventDefault();
      } else if (input.key === '0') {
        win.webContents.setZoomLevel(0);
        event.preventDefault();
      }
    }
  });

  win.on('maximize', () => win.webContents.send('window:maximized', true));
  win.on('unmaximize', () => win.webContents.send('window:maximized', false));
  win.on('enter-full-screen', () => win.webContents.send('window:maximized', true));
  win.on('leave-full-screen', () => win.webContents.send('window:maximized', false));

  win.on('close', async (event) => {
    event.preventDefault();
    await shutdownBackendAndClose(win);
  });

  return win;
}

function waitForBackend(timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    async function poll() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Backend did not start within ${timeoutMs}ms`));
        return;
      }

      try {
        const res = await fetch(BACKEND_HEALTH_URL, {
          signal: AbortSignal.timeout(1000),
        });
        if (res.ok) {
          resolve();
          return;
        }
      } catch (_) {
      }

      setTimeout(poll, BACKEND_POLL_INTERVAL_MS);
    }

    poll();
  });
}

app.whenReady().then(async () => {
  const splash = createSplashWindow();
  const mainWin = createMainWindow();

  ipcMain.handle('window:minimize', () => mainWin.minimize());
  ipcMain.handle('window:maximize', () => {
    mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize();
  });
  ipcMain.handle('window:close', () => shutdownBackendAndClose(mainWin));
  ipcMain.handle('window:isMaximized', () => mainWin.isMaximized());

  try {
    await waitForBackend(BACKEND_TIMEOUT_MS);

    await splash.webContents.executeJavaScript(`
      const container = document.querySelector(".splash-container");
      if (container) {
          container.style.transition = 'opacity 0.4s ease-out';
          container.style.opacity = '0';
      }
    `);

    await new Promise(resolve => setTimeout(resolve, 420));

    mainWin.show();
    splash.destroy();

  } catch (err) {
    await splash.webContents.executeJavaScript(`
      const statusElement = document.querySelector(".subtitle");
      if (statusElement) {
          statusElement.textContent = "Backend failed to start. Check IntelliJ.";
      }
      const loaderElement = document.querySelector(".loader");
      if (loaderElement) {
          loaderElement.style.display = "none";
      }
    `);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow().show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
