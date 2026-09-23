# Сравнение прайсов - Electron приложение

Десктопное приложение для сравнения прайсов от разных поставщиков с поддержкой LLM-нормализации.

## 🚀 Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

```bash
npm run dev
```

Это запустит Vite dev server и автоматически откроет Electron окно с hot-reload.

### Сборка приложения

```bash
npm run build
```

После сборки файлы будут в папке `dist/` и `dist-electron/`.

### Запуск собранного приложения

```bash
npx electron .
```

## 📦 Создание дистрибутива

### Установка electron-builder

```bash
npm install --save-dev electron-builder
```

### Настройка package.json

Добавьте в `package.json`:

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
    "electron:build": "vite build && electron-builder",
    "electron:pack": "electron-builder --dir"
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

### Сборка установщика

```bash
npm run electron:build
```

Готовые установщики появятся в папке `release/`:
- **Windows**: `.exe` (NSIS installer) и портативная версия
- **macOS**: `.dmg` и `.zip`
- **Linux**: `.AppImage` и `.deb`

## 🏗️ Структура проекта

```
├── electron/
│   ├── main.ts          # Главный процесс Electron
│   └── preload.ts       # Preload скрипт
├── src/
│   ├── components/      # React компоненты
│   ├── hooks/          # Custom hooks
│   ├── styles/         # CSS модули
│   ├── App.tsx         # Главный компонент
│   ├── parser.ts       # Парсинг прайсов
│   ├── llmService.ts   # Сервис для LLM
│   └── db.ts           # IndexedDB обёртка
├── dist/               # Собранный frontend
├── dist-electron/      # Собранный Electron код
└── vite.config.js      # Конфигурация Vite + Electron
```

## 🔧 Возможности

- ✅ Парсинг прайсов из Excel (.xlsx, .xls) и текста
- ✅ LLM-нормализация названий товаров через NordRouter
- ✅ Сравнительная таблица с подсветкой лучших цен
- ✅ Поиск и фильтрация (только пересекающиеся позиции)
- ✅ Экспорт в CSV
- ✅ IndexedDB для хранения больших объёмов данных
- ✅ Drag & drop загрузка файлов

## 📝 Примечания

### Размер приложения

- Electron приложение: ~150-200 MB
- Tauri альтернатива: ~5-10 MB (если нужен меньший размер)

### Производительность

- Приложение использует IndexedDB для кэша нормализации
- LLM запросы обрабатываются асинхронно с retry логикой
- UI остаётся отзывчивым даже при больших прайсах

### Безопасность

- `contextIsolation: true` - изоляция контекста
- `nodeIntegration: false` - нет прямого доступа к Node.js из renderer
- API ключи хранятся в localStorage (можно улучшить через electron-store)

## 🐛 Troubleshooting

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

Проверьте, что `VITE_DEV_SERVER_URL` передаётся в `main.ts`:
```typescript
if (process.env.VITE_DEV_SERVER_URL) {
  mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
}
```

## 📄 Лицензия

MIT
