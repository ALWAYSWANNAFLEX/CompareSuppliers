import { contextBridge as e } from "electron";
e.exposeInMainWorld("electronAPI", {
  // Add your API methods here if needed
  // Example: saveFile: (data: string) => ipcRenderer.invoke('save-file', data),
});
