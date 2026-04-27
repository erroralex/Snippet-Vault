/**
 * ──────────────────────────────────────────────
 * Electron Main Process
 * ──────────────────────────────────────────────
 * Responsibility: Orchestrates the Electron application lifecycle, window management, and backend synchronization.
 * Functions:
 *
 * Bootstraps the application, displaying a splash screen while the Spring Boot backend initializes.
 * Polls the backend health endpoint to verify readiness before revealing the main application window.
 * Manages the creation and configuration of both the splash and main browser windows, including security
 * settings (context isolation, preloads).
 * Handles inter-process communication (IPC) for custom window controls (minimize, maximize, close).
 * Intercepts keyboard events for application-wide zooming and developer tools toggling.
 * Ensures a graceful shutdown of the local Spring Boot backend when the Electron application is closed.
 *
 * Technical Role: The entry point for the Electron main process, managing native OS interactions, window states,
 * and ensuring the bundled Java backend is running and properly terminated.
 * ──────────────────────────────────────────────
 */
const {app, BrowserWindow, ipcMain} = require('electron');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');

let BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health';
const BACKEND_POLL_INTERVAL_MS = 500;
const BACKEND_TIMEOUT_MS = 30000;
const ANGULAR_DEV_URL = 'http://localhost:4200';
const ANGULAR_PROD_PATH = path.join(__dirname, '..', 'dist', 'frontend', 'browser', 'index.html');
let SHUTDOWN_URL = 'http://localhost:8080/actuator/shutdown';

let javaProcess = null;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

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
  if (window && !window.isDestroyed()) {
    window.destroy();
  }

  if (javaProcess) {
    await requestShutdown();
    try {
      javaProcess.kill();
    } catch (e) {
      console.error('Error killing java process:', e);
    }
  }
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
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  let targetDataDir;
  if (isDev) {
    targetDataDir = path.join(__dirname, '..', '..', 'data');
  } else {
    targetDataDir = path.join(path.dirname(process.execPath), 'data');
  }

  if (!fs.existsSync(targetDataDir)) {
    fs.mkdirSync(targetDataDir, { recursive: true });
  }

  const basePath = isDev ? path.join(__dirname, '..', '..') : process.resourcesPath;
  const javaExeName = process.platform === 'win32' ? 'java.exe' : 'java';
  const javaExePath = path.join(basePath, 'runtime', 'bin', javaExeName);
  const jarPath = path.join(basePath, 'runtime', 'app', 'backend.jar');

  if (isDev && !fs.existsSync(javaExePath)) {
    console.log('No bundled Java runtime found. Assuming "Ghost Backend" on port 8080.');
    BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health';
    SHUTDOWN_URL = 'http://localhost:8080/actuator/shutdown';
  } else {
    const dynamicPort = await getFreePort();
    BACKEND_HEALTH_URL = `http://localhost:${dynamicPort}/actuator/health`;
    SHUTDOWN_URL = `http://localhost:${dynamicPort}/actuator/shutdown`;

    const dataDirArg = `--snippetvault.data-dir="${targetDataDir}"`;

    javaProcess = spawn(javaExePath, [
      '-jar', jarPath,
      `--server.port=${dynamicPort}`,
      dataDirArg
    ]);

    javaProcess.stdout.on('data', (data) => {
      console.log(`[Spring Boot]: ${data.toString()}`);
    });

    javaProcess.stderr.on('data', (data) => {
      console.error(`[Spring Boot Error]: ${data.toString()}`);
    });

    javaProcess.on('close', (code) => {
      console.log(`Spring Boot backend process exited with code ${code}`);
    });
  }

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
    console.error("Backend startup error:", err);
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

app.on('will-quit', () => {
  if (javaProcess) {
    try {
      javaProcess.kill();
    } catch (e) {
      console.error('Error killing java process on quit:', e);
    }
  }
});
