import { app as e, BrowserWindow as t } from "electron";
import n from "path";
require("electron-squirrel-startup") && e.quit();
const i = () => {
  const o = new t({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: n.join(__dirname, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  process.env.VITE_DEV_SERVER_URL ? (o.loadURL(process.env.VITE_DEV_SERVER_URL), o.webContents.openDevTools()) : o.loadFile(n.join(__dirname, "../dist/index.html"));
};
e.whenReady().then(() => {
  i(), e.on("activate", () => {
    t.getAllWindows().length === 0 && i();
  });
});
e.on("window-all-closed", () => {
  process.platform !== "darwin" && e.quit();
});
