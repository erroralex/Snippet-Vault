// frontend/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const http = require('http');
const path = require('path');

const BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health';
const BACKEND_POLL_INTERVAL_MS = 500;   // how often to check if Spring Boot is up
const BACKEND_TIMEOUT_MS = 30000;       // give up after 30 seconds
const ANGULAR_DEV_URL = 'http://localhost:4200';
const ANGULAR_PROD_PATH = path.join(__dirname, '..', 'dist', 'frontend', 'browser', 'index.html');
const SHUTDOWN_URL = 'http://localhost:8080/actuator/shutdown';


/**
 * A robust function to make a POST request to the backend shutdown endpoint.
 * It's wrapped in a Promise to work well with async/await.
 */
function requestShutdown() {
    return new Promise((resolve) => {
        const req = http.request(SHUTDOWN_URL, { method: 'POST', timeout: 2000 }, (res) => {
            res.on('data', () => {}); // Consume the response
            res.on('end', resolve);   // Resolve the promise when the response ends
        });
        req.on('error', resolve);   // If backend is already down, resolve anyway
        req.on('timeout', () => {
            req.destroy();
            resolve();              // Resolve on timeout
        });
        req.end();
    });
}

/**
 * Gracefully shuts down the backend and then destroys the Electron window.
 */
async function shutdownBackendAndClose(window) {
    if (!window || window.isDestroyed()) {
        return;
    }
    await requestShutdown();
    window.destroy(); // Use destroy() to bypass the 'close' event and prevent loops
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
      devTools: false,           // no DevTools on the splash window, ever
    }
  });

  splash.loadFile(path.join(__dirname, '..', 'splash.html'));

  // Never open DevTools on splash
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
    show: false,               // hidden until Spring Boot is ready
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,         // disabled by default — enabled only via shortcut below
    }
  });

  // Load Angular — dev server or production build
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    win.loadURL(ANGULAR_DEV_URL);
  } else {
    win.loadFile(ANGULAR_PROD_PATH);
  }

  // Allow DevTools only via explicit shortcut (Ctrl+Shift+I / Cmd+Option+I)
  // This overrides the devTools: false restriction intentionally
  win.webContents.on('before-input-event', (event, input) => {
    const isDevShortcut =
      (input.control || input.meta) &&
      input.shift &&
      input.key === 'I';
    if (isDevShortcut) {
      win.webContents.toggleDevTools();
    }
  });

  // Push maximize/unmaximize state to renderer (existing behaviour)
  win.on('maximize',            () => win.webContents.send('window:maximized', true));
  win.on('unmaximize',          () => win.webContents.send('window:maximized', false));
  win.on('enter-full-screen',   () => win.webContents.send('window:maximized', true));
  win.on('leave-full-screen',   () => win.webContents.send('window:maximized', false));

  // Intercept OS-level close (Alt+F4, taskbar) — same as existing behaviour
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
      // Give up if we've exceeded the timeout
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Backend did not start within ${timeoutMs}ms`));
        return;
      }

      try {
        const res = await fetch(BACKEND_HEALTH_URL, {
          signal: AbortSignal.timeout(1000),  // each individual request times out in 1s
        });
        if (res.ok) {
          resolve();           // Spring Boot is up
          return;
        }
      } catch (_) {
        // Connection refused or timeout — keep polling
      }

      setTimeout(poll, BACKEND_POLL_INTERVAL_MS);
    }

    poll();
  });
}

app.whenReady().then(async () => {
  const splash = createSplashWindow();
  const mainWin = createMainWindow();

  // Register IPC handlers (your existing handlers — keep them here)
  ipcMain.handle('window:minimize',   () => mainWin.minimize());
  ipcMain.handle('window:maximize',   () => {
    mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize();
  });
  ipcMain.handle('window:close',      () => shutdownBackendAndClose(mainWin));
  ipcMain.handle('window:isMaximized',() => mainWin.isMaximized());

  try {
    await waitForBackend(BACKEND_TIMEOUT_MS);

    // Trigger the CSS fade-out on the splash
    await splash.webContents.executeJavaScript(
      'document.getElementById("container").classList.add("fade-out")'
    );

    // Wait for the fade transition to finish (matches the 0.4s CSS transition)
    await new Promise(resolve => setTimeout(resolve, 420));

    // Show the main window and destroy the splash
    mainWin.show();
    splash.destroy();

  } catch (err) {
    // Backend never came up — show an error in the splash then quit
    await splash.webContents.executeJavaScript(`
      document.getElementById("status").textContent = "Backend failed to start. Check IntelliJ.";
      document.querySelector(".dots").style.display = "none";
      document.querySelector(".progress-fill").style.animation = "none";
      document.querySelector(".progress-fill").style.background = "#e85d24";
      document.querySelector(".progress-fill").style.width = "100%";
    `);
    // Leave the splash visible so the user can read the message
    // They can close manually or wait — do not force quit
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // Recreate on macOS dock click if all windows were closed
      createMainWindow().show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
