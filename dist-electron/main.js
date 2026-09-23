import { app as e, BrowserWindow as t } from "electron";
import i from "path";
require("electron-squirrel-startup") && e.quit();
const n = () => {
  const o = new t({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: i.join(__dirname, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0
    },
    title: "Сравнение прайсов"
  });
  process.env.VITE_DEV_SERVER_URL ? (o.loadURL(process.env.VITE_DEV_SERVER_URL), o.webContents.openDevTools()) : o.loadFile(i.join(__dirname, "../dist/index.html"));
};
e.whenReady().then(() => {
  n(), e.on("activate", () => {
    t.getAllWindows().length === 0 && n();
  });
});
e.on("window-all-closed", () => {
  process.platform !== "darwin" && e.quit();
});
