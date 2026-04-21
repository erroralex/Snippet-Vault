const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow:  () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow:  () => ipcRenderer.invoke('window:maximize'),
  closeWindow:     () => ipcRenderer.invoke('window:close'),
  isMaximized:     () => ipcRenderer.invoke('window:isMaximized'),

  // Listen for maximize state pushed from main process
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximized', (_event, value) => callback(value));
    // Return a cleanup function
    return () => ipcRenderer.removeAllListeners('window:maximized');
  },

  // Platform — needed for button order
  platform: process.platform,  // 'win32' | 'darwin' | 'linux'
});
