# Настройка Electron

## Что уже сделано:
✅ Установлены зависимости: `electron`, `electron-builder`, `vite-plugin-electron`, `vite-plugin-electron-renderer`
✅ Созданы файлы:
- `electron/main.ts` - главный процесс Electron
- `electron/preload.ts` - preload скрипт
- `electron-builder.json` - конфигурация сборки
- `vite.electron.config.ts` - конфигурация Vite для Electron

## Что нужно сделать вручную:

### 1. Обновите `package.json`

Добавьте следующие поля и скрипты:

```json
{
  "name": "price-comparison-app",
  "version": "1.0.0",
  "description": "Сравнение прайсов поставщиков",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "vite --config vite.electron.config.ts",
    "electron:build": "vite build --config vite.electron.config.ts && electron-builder",
    "electron:preview": "vite build --config vite.electron.config.ts && electron ."
  }
}
```

### 2. Установите дополнительную зависимость (опционально)

```bash
npm install --save-dev electron-squirrel-startup
```

Эта зависимость нужна для корректной работы ярлыков на Windows.

## Запуск

### Режим разработки:
```bash
npm run electron:dev
```

Это запустит Vite dev server и откроет Electron окно с hot-reload.

### Сборка приложения:
```bash
npm run electron:build
```

Готовые установщики появятся в папке `release/`:
- **Windows**: `.exe` (NSIS installer) и portable версия
- **macOS**: `.dmg` и `.zip`
- **Linux**: `.AppImage` и `.deb`

### Предпросмотр сборки:
```bash
npm run electron:preview
```

## Структура проекта

```
your-project/
├── electron/
│   ├── main.ts          # Главный процесс Electron
│   └── preload.ts       # Preload скрипт
├── src/                 # Ваш React код
├── dist/                # Собранный React код
├── dist-electron/       # Собранный Electron код
├── release/             # Готовые установщики
├── electron-builder.json
├── vite.electron.config.ts
└── package.json
```

## Настройка electron-builder.json

Вы можете настроить:
- `appId` - уникальный идентификатор приложения
- `productName` - название приложения
- Целевые платформы (mac, win, linux)
- Форматы установщиков

## Дополнительные возможности

### Сохранение файлов через Electron API

Если хотите добавить нативное сохранение файлов:

1. В `electron/main.ts` добавьте:
```typescript
import { ipcMain, dialog } from 'electron';
import fs from 'fs';

ipcMain.handle('save-file', async (event, data: string) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });
  
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data);
    return { success: true };
  }
  return { success: false };
});
```

2. В `electron/preload.ts` добавьте:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data: string) => ipcRenderer.invoke('save-file', data),
});
```

3. В `src/App.tsx` используйте:
```typescript
const handleExportCSV = useCallback(async () => {
  const csv = exportToCSV(comparisonData, suppliers);
  
  if (window.electronAPI) {
    await window.electronAPI.saveFile(csv);
  } else {
    // Fallback для браузера
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'price_comparison.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}, [comparisonData, suppliers]);
```

## Альтернатива: Tauri

Если хотите более легковесное решение (~5MB vs ~150MB), рассмотрите Tauri:

```bash
npm install --save-dev @tauri-apps/cli @tauri-apps/api
npx tauri init
npm run tauri dev
npm run tauri build
```

## Troubleshooting

### Ошибка: "Cannot find module 'electron'"
```bash
npm install
```

### Electron не запускается
Убедитесь, что вы добавили `"main": "dist-electron/main.js"` в `package.json`

### Белый экран в Electron
Проверьте пути в `electron/main.ts`:
- В dev режиме: `mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)`
- В production: `mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))`
