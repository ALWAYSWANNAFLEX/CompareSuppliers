/**
 * Простая обёртка над IndexedDB для хранения кэша нормализации
 * и карты нормализованных названий.
 * 
 * IndexedDB не имеет жёсткого лимита (обычно >50% диска),
 * в отличие от localStorage (~5MB).
 */

const DB_NAME = 'price_comparison_db';
const DB_VERSION = 1;

// Названия object stores
const STORE_CACHE = 'normalization_cache';
const STORE_MAP = 'normalized_map';

let dbInstance: IDBDatabase | null = null;

/**
 * Открывает/создаёт базу данных
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE);
      }
      if (!db.objectStoreNames.contains(STORE_MAP)) {
        db.createObjectStore(STORE_MAP);
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB: ' + request.error?.message));
    };
  });
}

/**
 * Универсальная транзакция на чтение
 */
async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Универсальная транзакция на запись
 */
async function dbSet(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Удалить ключ
 */
async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Очистить весь store
 */
async function dbClear(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Получить все ключи
 */
async function dbKeys(storeName: string): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Получить все записи как Record
 */
async function dbGetAll(storeName: string): Promise<Record<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    const keysRequest = store.getAllKeys();
    
    let values: string[] = [];
    let keys: string[] = [];
    
    request.onsuccess = () => { values = request.result as string[]; };
    keysRequest.onsuccess = () => { keys = keysRequest.result as string[]; };
    
    tx.oncomplete = () => {
      const result: Record<string, string> = {};
      for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = values[i];
      }
      resolve(result);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Массовая запись (batch put) — эффективнее чем по одной
 */
async function dbPutBatch(storeName: string, entries: Record<string, string>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    for (const [key, value] of Object.entries(entries)) {
      store.put(value, key);
    }
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Массовое чтение (batch get) — эффективнее чем по одному
 */
async function dbGetBatch(storeName: string, keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const result: Record<string, string> = {};
    let completed = 0;
    
    for (const key of keys) {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result !== undefined) {
          result[key] = request.result as string;
        }
        completed++;
        if (completed === keys.length) {
          resolve(result);
        }
      };
      request.onerror = () => {
        completed++;
        if (completed === keys.length) {
          resolve(result);
        }
      };
    }
    
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================
//  ПУБЛИЧНЫЙ API — КЭШ НОРМАЛИЗАЦИИ
// ============================================================

/**
 * Получить одну запись из кэша
 */
export async function cacheGet(key: string): Promise<string | undefined> {
  return dbGet<string>(STORE_CACHE, key);
}

/**
 * Записать одну запись в кэш
 */
export async function cacheSet(key: string, value: string): Promise<void> {
  return dbSet(STORE_CACHE, key, value);
}

/**
 * Массовая запись в кэш
 */
export async function cachePutBatch(entries: Record<string, string>): Promise<void> {
  return dbPutBatch(STORE_CACHE, entries);
}

/**
 * Массовое чтение из кэша
 */
export async function cacheGetBatch(keys: string[]): Promise<Record<string, string>> {
  return dbGetBatch(STORE_CACHE, keys);
}

/**
 * Количество записей в кэше
 */
export async function cacheSize(): Promise<number> {
  const keys = await dbKeys(STORE_CACHE);
  return keys.length;
}

/**
 * Очистить кэш
 */
export async function cacheClear(): Promise<void> {
  return dbClear(STORE_CACHE);
}

// ============================================================
//  ПУБЛИЧНЫЙ API — КАРТА НОРМАЛИЗАЦИИ (original → normalized)
// ============================================================

/**
 * Получить всю карту нормализации
 */
export async function mapGetAll(): Promise<Record<string, string>> {
  return dbGetAll(STORE_MAP);
}

/**
 * Записать всю карту (перезапись)
 */
export async function mapSetAll(entries: Record<string, string>): Promise<void> {
  await dbClear(STORE_MAP);
  return dbPutBatch(STORE_MAP, entries);
}

/**
 * Добавить записи к карте (merge)
 */
export async function mapMerge(entries: Record<string, string>): Promise<void> {
  return dbPutBatch(STORE_MAP, entries);
}

/**
 * Количество записей в карте
 */
export async function mapSize(): Promise<number> {
  const keys = await dbKeys(STORE_MAP);
  return keys.length;
}

/**
 * Очистить карту
 */
export async function mapClear(): Promise<void> {
  return dbClear(STORE_MAP);
}

// ============================================================
//  МИГРАЦИЯ из localStorage
// ============================================================

/**
 * При первом запуске переносит данные из localStorage в IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<void> {
  // Миграция кэша
  const oldCache = localStorage.getItem('normalization_cache');
  if (oldCache) {
    try {
      const parsed = JSON.parse(oldCache) as Record<string, string>;
      if (Object.keys(parsed).length > 0) {
        await cachePutBatch(parsed);
        console.log(`[Migration] Кэш: перенесено ${Object.keys(parsed).length} записей в IndexedDB`);
      }
      localStorage.removeItem('normalization_cache');
    } catch { /* ignore */ }
  }

  // Миграция карты нормализации
  const oldMap = localStorage.getItem('normalized_map');
  if (oldMap) {
    try {
      const parsed = JSON.parse(oldMap) as Record<string, string>;
      if (Object.keys(parsed).length > 0) {
        await mapSetAll(parsed);
        console.log(`[Migration] Карта: перенесено ${Object.keys(parsed).length} записей в IndexedDB`);
      }
      localStorage.removeItem('normalized_map');
    } catch { /* ignore */ }
  }
}
