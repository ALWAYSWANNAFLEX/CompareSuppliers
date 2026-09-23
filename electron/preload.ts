import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here if needed
  // Example: saveFile: (data: string) => ipcRenderer.invoke('save-file', data),
});
