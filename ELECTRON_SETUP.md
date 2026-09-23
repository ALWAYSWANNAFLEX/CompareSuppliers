# Инструкции по настройке Electron

## Что уже сделано:

✅ Установлены зависимости:
- electron
- electron-builder
- vite-plugin-electron
- vite-plugin-electron-renderer
- electron-squirrel-startup

✅ Созданы файлы:
- `electron/main.ts` - главный процесс
- `electron/preload.ts` - preload скрипт
- `vite.config.js` - обновлён для поддержки Electron

✅ Проект успешно собирается

## Что нужно сделать вручную:

### 1. Обновите package.json

Откройте `package.json` и добавьте/обновите следующие поля:

```json
{
  "name": "price-comparison-app",
  "version": "1.0.0",
  "description": "Сравнение прайсов поставщиков",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "vite",
    "electron:build": "vite build && electron-builder",
    "electron:pack": "electron-builder --dir",
    "electron:preview": "vite build && electron ."
  },
  "build": {
    "appId": "com.yourcompany.pricecomparison",
    "productName": "Сравнение прайсов",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.business",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb"]
    }
  }
}
```

### 2. Запуск в режиме разработки

```bash
npm run dev
```

Это запустит Vite dev server и автоматически откроет Electron окно.

### 3. Сборка приложения

```bash
npm run build
```

### 4. Запуск собранного приложения

```bash
npx electron .
```

### 5. Создание установщика

```bash
npm run electron:build
```

Готовые установщики появятся в папке `release/`.

## Альтернатива: Tauri (рекомендую для меньшего размера)

Если вам нужно более легковесное приложение (~5MB вместо ~150MB), рассмотрите Tauri:

```bash
npm install --save-dev @tauri-apps/cli @tauri-apps/api
npx tauri init
npm run tauri dev
npm run tauri build
```

## Дополнительные возможности

### Сохранение файлов через Electron API

Если хотите добавить нативное сохранение файлов, обновите `electron/main.ts`:

```typescript
import { ipcMain, dialog } from 'electron';
import fs from 'fs';

ipcMain.handle('save-file', async (event,  string) => {
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

Обновите `electron/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  saveFile: (data: string) => ipcRenderer.invoke('save-file', data),
});
```

Добавьте типы в `src/vite-env.d.ts`:

```typescript
export {};

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      isElectron: boolean;
      saveFile: (data: string) => Promise<{ success: boolean }>;
    };
  }
}
```

Используйте в `src/App.tsx`:

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

## Troubleshooting

### Ошибка: Cannot find module 'electron'
```bash
npm install
```

### Приложение не запускается после сборки
Убедитесь, что в `package.json` указан правильный `main`:
```json
"main": "dist-electron/main.js"
```

### Hot reload не работает
Проверьте, что `VITE_DEV_SERVER_URL` передаётся в `main.ts`.
