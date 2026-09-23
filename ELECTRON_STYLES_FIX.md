# Исправление проблем со стилями в Electron

## Что было исправлено:

### 1. Удалён Font Awesome с CDN
**Проблема:** Font Awesome загружался с `https://cdnjs.cloudflare.com/...`, что в Electron может не работать из-за:
- Отсутствия интернета
- CSP (Content Security Policy) блокировки
- Медленной загрузки

**Решение:** Удалён из `index.html`, так как проект использует SVG иконки вместо Font Awesome.

### 2. Добавлен `base: './'` в конфигурацию Vite
**Проблема:** Vite по умолчанию генерирует абсолютные пути (`/assets/...`), которые не работают в Electron через `file://` протокол.

**Решение:** Добавлено в оба конфигурационных файла:
- `vite.config.ts`
- `vite.electron.config.ts`

```typescript
export default defineConfig({
  base: './', // Относительные пути
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  // ...
});
```

### 3. Настроена поддержка CSS Modules
Добавлена явная настройка для CSS Modules в конфигурации Vite.

## Как проверить:

1. **Пересоберите проект:**
   ```bash
   npm run build
   ```

2. **Проверьте `dist/index.html`:**
   - Не должно быть подключения Font Awesome с CDN
   - Пути к ассетам должны быть относительными: `./assets/...`

3. **Запустите Electron:**
   ```bash
   npm run electron:preview
   ```

## Если стили всё ещё не работают:

### Проверка 1: Откройте DevTools в Electron
В `electron/main.ts` раскомментируйте строку:
```typescript
mainWindow.webContents.openDevTools();
```

Затем проверьте:
- Вкладка **Console** - есть ли ошибки
- Вкладка **Network** - все ли файлы загружаются (статус 200)
- Вкладка **Elements** - применяются ли стили к элементам

### Проверка 2: Проверьте пути к файлам
Убедитесь, что в `dist/index.html` пути относительные:
```html
<!-- Правильно: -->
<script type="module" crossorigin src="./assets/index-XXX.js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-XXX.css">

<!-- Неправильно: -->
<script type="module" crossorigin src="/assets/index-XXX.js"></script>
```

### Проверка 3: Очистите кэш Electron
Удалите папку `dist` и `dist-electron`, затем пересоберите:
```bash
rm -rf dist dist-electron
npm run build
```

### Проверка 4: Проверьте CSP в Electron
Если стили блокируются CSP, добавьте в `electron/main.ts`:
```typescript
const mainWindow = new BrowserWindow({
  // ...
  webPreferences: {
    // ...
    webSecurity: false, // Только для разработки!
  },
});
```

⚠️ **Важно:** `webSecurity: false` используйте только для разработки. В production лучше настроить правильный CSP.

## Альтернативное решение: Использовать dev mode

Если в production режиме стили не работают, попробуйте dev mode:
```bash
npm run electron:dev
```

В dev mode Vite запускает dev server с hot-reload, и стили должны работать корректно.

## Структура файлов после сборки:

```
dist/
├── index.html          # Относительные пути к ассетам
└── assets/
    ├── index-XXX.js    # JavaScript bundle
    └── index-XXX.css   # CSS bundle (включая Tailwind и CSS Modules)

dist-electron/
├── main.js             # Electron main process
└── preload.js          # Electron preload script
```

## Дополнительные настройки для production:

Если нужно улучшить загрузку стилей, можно добавить в `electron/main.ts`:

```typescript
mainWindow.webContents.session.webRequest.onHeadersReceived(
  (details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        ],
      },
    });
  }
);
```

Это разрешит inline стили и скрипты, что может помочь с CSS Modules.
