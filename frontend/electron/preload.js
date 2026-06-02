/**
 * ──────────────────────────────────────────────
 * <h2>Electron Preload Script</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Bridges the secure gap between the Node.js environment of the main process and the web environment of the renderer process (Angular application).</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Exposes a secure, limited API ({@code electronAPI}) to the global {@code window} object in the renderer.</li>
 * <li>Provides methods for the UI to invoke native window controls (minimize, maximize, close) via Inter-Process Communication (IPC).</li>
 * <li>Exposes a listener mechanism for the UI to react to window maximization state changes triggered by the OS.</li>
 * <li>Supplies the underlying operating system platform identifier (e.g., 'win32', 'darwin') to allow the UI to adapt its layout (like window control button order).</li>
 * </ul>
 * <p><strong>Technical Role:</strong> Utilizes Electron's {@code contextBridge} to safely expose specific IPC capabilities and system information without enabling full Node.js integration in the renderer, maintaining a strong security posture.</p>
 * ──────────────────────────────────────────────
 */
const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  zoomIn: () => ipcRenderer.invoke('window:zoomIn'),
  zoomOut: () => ipcRenderer.invoke('window:zoomOut'),
  resetZoom: () => ipcRenderer.invoke('window:resetZoom'),
  getZoom: () => ipcRenderer.invoke('window:getZoom'),
  openDataFolder: () => ipcRenderer.invoke('vault:openFolder'),
  getBackendPort: () => ipcRenderer.sendSync('get-backend-port'),

  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximized', (_event, value) => callback(value));
    return () => ipcRenderer.removeAllListeners('window:maximized');
  },

  platform: process.platform,
  backendPort: (() => {
    const portArg = process.argv.find(arg => arg.startsWith('--backend-port='));
    return portArg ? portArg.split('=')[1] : '8080';
  })(),
});
