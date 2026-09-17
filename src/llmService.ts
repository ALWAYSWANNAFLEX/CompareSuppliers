/**
 * Сервис для стандартизации названий товаров через NordRouter API
 * NordRouter — OpenAI-совместимый API роутер (nordrouter.net)
 */

import { cacheGetBatch, cachePutBatch, cacheSize, cacheClear } from './db';

// ============================================================
//  КОНФИГУРАЦИЯ NORDROUTER
// ============================================================

export interface ModelOption {
  id: string;
  name: string;
  note?: string;
  priceNote?: string;
}

export const MODELS: ModelOption[] = [
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', note: 'Самая дешёвая', priceNote: '~2₽/1M' },
  { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B', note: 'Быстрая', priceNote: '~3₽/1M' },
  { id: 'openai/gpt-5.4-nano', name: 'GPT-5.4 Nano', note: 'Компактная', priceNote: '~5₽/1M' },
  { id: 'deepseek/deepseek-v4-pro', name: 'DeepSeek V4 Pro', note: 'Рекомендуется', priceNote: '~10₽/1M' },
  { id: 'qwen/qwen3.7-max', name: 'Qwen 3.7 Max', note: 'Мощная', priceNote: '~17₽/1M' },
  { id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash', note: 'Качественная', priceNote: '~21₽/1M' },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', note: 'Топ качество', priceNote: '~41₽/1M' },
];

export const DEFAULT_MODEL = 'deepseek/deepseek-v4-pro';

// ============================================================
//  НАСТРОЙКИ (localStorage — маленькие данные)
// ============================================================

const SETTINGS_KEY = 'llm_settings';

export interface LLMSettings {
  apiKey: string;
  model: string;
}

export function getSettings(): LLMSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const apiKey = parsed.apiKey || '';
      const model = parsed.model || DEFAULT_MODEL;
      
      // Валидация модели — если сохранена старая/невалидная, сбрасываем
      const modelExists = MODELS.some(m => m.id === model);
      if (modelExists) {
        return { apiKey, model };
      }
      // Модель невалидна — сбрасываем на дефолтную
      return { apiKey, model: DEFAULT_MODEL };
    }
  } catch { /* ignore */ }
  return { apiKey: '', model: DEFAULT_MODEL };
}

export function saveSettings(settings: LLMSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ============================================================
//  КЭШ (IndexedDB — большие данные)
// ============================================================

export async function clearNormalizationCache(): Promise<void> {
  return cacheClear();
}

export async function getCacheSize(): Promise<number> {
  return cacheSize();
}

// ============================================================
//  SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `Ты — эксперт по стандартизации названий товаров (электроника, смартфоны, планшеты).
Твоя задача — привести название товара к единому стандартному формату.

Формат вывода:
[Бренд] [Модель] [ОЗУ]/[Встроенная память] [Цвет] [Код региона]

Правила:
1. Бренд — латиницей как официально (Samsung, Apple, Xiaomi, Realme, Poco, Google и т.д.)
2. Модель — как в официальном каталоге (Galaxy A17, iPhone 15 Pro, Pixel 11 Pro XL и т.д.)
3. ОЗУ и встроенная память — числом через слэш (4/128, 8/256, 12/256). Если встроенная память не указана — пиши только ОЗУ.
4. Цвет — ОСТАВЬ КАК ЕСТЬ (латиницей), не переводи (Gray, Black, Canyon, Natural Titanium и т.д.)
5. Код региона — ОБЯЗАТЕЛЬНО последний параметр, если регион указан в исходном названии. Формат: 2 буквы латиницей (CA, EU, RU, US, SEA, EAC, IN и т.д.).
6. Конвертация эмодзи флагов в коды регионов: 🇨🇦→CA, 🇺🇸→US, 🇷🇺→RU, 🇪🇺→EU, 🇮🇳→IN, 🇩🇪→DE, 🇬🇧→GB, 🇯🇵→JP, 🇰🇷→KR, 🇨🇳→CN и т.д.
7. Разделитель: пробел между блоками, слэш только между ОЗУ и памятью.
8. Убери мусор: внутренние артикулы (SM-A175F, M2101K7AI и т.п.), слова "новый", "оригинал", "global version" и т.п.
9. ВАЖНО для смартфонов/телефонов: ОЗУ должно быть указано ОБЯЗАТЕЛЬНО. Если в исходном названии ОЗУ не указано, определи его по официальным характеристикам этой модели (ты знаешь спецификации популярных смартфонов). Например: Google Pixel 11 Pro XL всегда имеет 12 ГБ ОЗУ, iPhone 15 Pro Max — 8 ГБ, Samsung Galaxy S24 Ultra — 12 ГБ и т.д.
10. Если регион не указан в исходном названии — не добавляй его.

Примеры:
- "Samsung-A17-4/128-Gray" → "Samsung Galaxy A17 4/128 Gray"
- "Самсунг А 17 4+128 серый" → "Samsung Galaxy A17 4/128 Gray"
- "SM-A175F/DS 4+128 Black" → "Samsung Galaxy A17 4/128 Black"
- "IPHONE 15 PRO MAX 256GB NATURAL TITANIUM" → "Apple iPhone 15 Pro Max 8/256 Natural Titanium"
- "Xiaomi Redmi Note 13 8/256 Midnight Black" → "Xiaomi Redmi Note 13 8/256 Midnight Black"
- "Realme C55 6/128 Sunshower" → "Realme C55 6/128 Sunshower"
- "Poco X6 Pro 8/256" → "Poco X6 Pro 8/256"
- "Samsung A15 4/64 Blue" → "Samsung Galaxy A15 4/64 Blue"
- "Google Pixel 11 Pro XL 256 Fog🇨🇦" → "Google Pixel 11 Pro XL 12/256 Fog CA"
- "Pixel-11-Pro-XL-12/256-Canyon-ca" → "Google Pixel 11 Pro XL 12/256 Canyon CA"
- "Samsung Galaxy S24 Ultra 512 Titanium Black EU" → "Samsung Galaxy S24 Ultra 12/512 Titanium Black EU"
- "iPhone 16 Pro 256 Desert🇷🇺" → "Apple iPhone 16 Pro 8/256 Desert Titanium RU"`;

// ============================================================
//  API CALLS
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Вызов NordRouter API (OpenAI-совместимый)
 * Base URL: https://nordrouter.net/v1
 * С retry при 429 ошибке
 */
async function callNordRouter(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): Promise<string> {
  const MAX_RETRIES = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://nordrouter.net/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
          max_tokens: 1000,
        }),
        signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 2000;
        await sleep(Math.min(waitMs, 30000));
        continue;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `NordRouter API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < MAX_RETRIES - 1) {
        await sleep(Math.pow(2, attempt) * 2000);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// ============================================================
//  BATCH NORMALIZATION
// ============================================================

async function normalizeBatch(
  apiKey: string,
  model: string,
  names: string[],
  signal?: AbortSignal
): Promise<string[]> {
  const numbered = names.map((n, i) => `${i + 1}. ${n}`).join('\n');
  const userMessage = `Нормализуй следующие названия товаров. Верни ТОЛЬКО JSON массив нормализованных названий в том же порядке, без пояснений. Пример ответа: ["Samsung Galaxy A17 4/128 Gray", "Google Pixel 11 Pro XL 12/256 Fog CA"]\n\nНазвания:\n${numbered}`;

  const content = await callNordRouter(
    apiKey,
    model,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    signal
  );

  // Парсим JSON ответ
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length === names.length) {
        return parsed.map(String);
      }
    }
  } catch {
    const lines = content.split('\n').filter((l: string) => l.trim());
    if (lines.length === names.length) {
      return lines.map((l: string) => l.replace(/^[\d."'\-\s]+/, '').replace(/["']+$/, '').trim());
    }
  }

  return names;
}

export interface NormalizationStats {
  total: number;
  fromCache: number;
  normalized: number;
  failed: number;
}

export interface NormalizationResult {
  map: Map<string, string>;
  stats: NormalizationStats;
}

/**
 * Главная функция: нормализует все названия.
 * НИКОГДА не выбрасывает ошибку — всегда возвращает частичный результат.
 * Кэш хранится в IndexedDB.
 */
export async function normalizeNamesBatch(
  names: string[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<NormalizationResult> {
  const settings = getSettings();
  const { apiKey, model } = settings;

  const results = new Map<string, string>();
  const stats: NormalizationStats = { total: names.length, fromCache: 0, normalized: 0, failed: 0 };

  if (!apiKey) {
    for (const name of names) results.set(name, name);
    stats.failed = names.length;
    return { map: results, stats };
  }

  // Загружаем кэш из IndexedDB (массово — эффективно)
  const cacheKeys = names.map(n => n.toLowerCase().trim());
  const cache = await cacheGetBatch(cacheKeys);

  // Проверяем кэш
  const toProcess: string[] = [];
  for (const name of names) {
    const cacheKey = name.toLowerCase().trim();
    if (cache[cacheKey]) {
      const cached = cache[cacheKey];
      results.set(name, cached);
      if (cached.toLowerCase().trim() !== name.toLowerCase().trim()) {
        stats.fromCache++;
        stats.normalized++;
      }
    } else {
      toProcess.push(name);
    }
  }

  if (onProgress) {
    onProgress(names.length - toProcess.length, names.length);
  }

  const BATCH_SIZE = 5;
  let consecutiveErrors = 0;
  // Буфер для массовой записи в кэш
  let cacheBuffer: Record<string, string> = {};

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    if (consecutiveErrors >= 3) {
      for (let k = i; k < toProcess.length; k++) {
        results.set(toProcess[k], toProcess[k]);
        stats.failed++;
      }
      break;
    }

    const batch = toProcess.slice(i, i + BATCH_SIZE);
    let batchOk = false;

    try {
      const batchResults = await normalizeBatch(apiKey, model, batch, signal);

      for (let j = 0; j < batch.length; j++) {
        const original = batch[j];
        const normalized = batchResults[j] || original;
        results.set(original, normalized);
        cacheBuffer[original.toLowerCase().trim()] = normalized;
        if (normalized.toLowerCase().trim() !== original.toLowerCase().trim()) {
          stats.normalized++;
        }
      }
      batchOk = true;
      consecutiveErrors = 0;
    } catch {
      for (const name of batch) {
        try {
          const userMsg = `Нормализуй название товара. Верни ТОЛЬКО нормализованное название без пояснений и кавычек.\n\n"${name}"`;
          const result = await callNordRouter(
            apiKey, model,
            [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMsg },
            ],
            signal
          );
          const cleaned = result.replace(/^["']+|["']+$/g, '').trim();
          results.set(name, cleaned || name);
          cacheBuffer[name.toLowerCase().trim()] = cleaned || name;
          if (cleaned && cleaned.toLowerCase().trim() !== name.toLowerCase().trim()) {
            stats.normalized++;
          }
          batchOk = true;
        } catch {
          results.set(name, name);
          stats.failed++;
        }
      }
    }

    // Записываем буфер в IndexedDB после каждого батча
    if (Object.keys(cacheBuffer).length > 0) {
      await cachePutBatch(cacheBuffer);
      cacheBuffer = {};
    }

    if (!batchOk) consecutiveErrors++;

    if (onProgress) {
      onProgress(
        Math.min(i + BATCH_SIZE, toProcess.length) + (names.length - toProcess.length),
        names.length
      );
    }

    if (i + BATCH_SIZE < toProcess.length) {
      await sleep(3000);
    }
  }

  return { map: results, stats };
}
