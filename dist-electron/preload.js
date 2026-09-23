import { contextBridge as o } from "electron";
o.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: !0
});
