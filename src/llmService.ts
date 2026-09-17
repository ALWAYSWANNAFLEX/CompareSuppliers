/**
 * Сервис для стандартизации названий товаров через LLM (OpenAI API)
 */

interface NormalizationRequest {
  originalName: string;
  supplierName: string;
}

interface NormalizationResult {
  originalName: string;
  normalized: string;
  confidence: number; // 0-1
}

// Кэш нормализации: оригинал -> нормализованное название
const CACHE_KEY = 'normalization_cache';

function getCache(): Record<string, string> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(cache: Record<string, string>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/**
 * Получает API ключ из localStorage
 */
export function getApiKey(): string {
  return localStorage.getItem('openai_api_key') || '';
}

export function setApiKey(key: string) {
  localStorage.setItem('openai_api_key', key);
}

/**
 * Получает выбранную модель
 */
export function getModel(): string {
  return localStorage.getItem('openai_model') || 'gpt-4o-mini';
}

export function setModel(model: string) {
  localStorage.setItem('openai_model', model);
}

/**
 * Нормализует одно название через LLM
 */
async function normalizeSingleName(
  name: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal
): Promise<string> {
  const cache = getCache();
  const cacheKey = name.toLowerCase().trim();
  
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  const systemPrompt = `Ты — эксперт по стандартизации названий товаров (электроника, бытовая техника, аксессуары). 
Твоя задача — привести название товара к единому стандартному формату.

Правила:
1. Формат: [Бренд] [Модель] [Ключевые характеристики] [Цвет/Вариант]
2. Бренд пиши латиницей как официально (Samsung, Apple, Xiaomi, LG, Sony и т.д.)
3. Модель — как в официальном каталоге
4. Характеристики: память (4/128, 8/256), диагональ (6.5"), и т.д.
5. Цвет — на русском, в скобках если нужно
6. Убери мусор: артикулы, коды, лишние символы, "новый", "оригинал" и т.п.
7. Если это не электроника — просто приведи к читаемому виду

Примеры:
- "Samsung-A17-4/128-Gray" → "Samsung Galaxy A17 4/128GB (Серый)"
- "Самсунг А 17 4+128 серый" → "Samsung Galaxy A17 4/128GB (Серый)"
- "SM-A175F 4+128 Black" → "Samsung Galaxy A17 4/128GB (Чёрный)"
- "IPHONE 15 PRO MAX 256GB NATURAL TITANIUM" → "Apple iPhone 15 Pro Max 256GB (Натуральный титан)"
- "яблоко гала 1кг" → "Яблоко Гала (1 кг)"

Верни ТОЛЬКО нормализованное название, без пояснений и кавычек.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Нормализуй название: "${name}"` },
      ],
      temperature: 0.1,
      max_tokens: 150,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim() || name;
  
  // Сохраняем в кэш
  cache[cacheKey] = result;
  setCache(cache);
  
  return result;
}

/**
 * Нормализует пакет названий (батчами для экономии токенов)
 */
export async function normalizeNamesBatch(
  names: string[],
  apiKey: string,
  model: string,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const cache = getCache();
  
  // Сначала проверяем кэш
  const toProcess: string[] = [];
  for (const name of names) {
    const cacheKey = name.toLowerCase().trim();
    if (cache[cacheKey]) {
      results.set(name, cache[cacheKey]);
    } else {
      toProcess.push(name);
    }
  }
  
  if (onProgress) {
    onProgress(names.length - toProcess.length, names.length);
  }
  
  // Обрабатываем батчами по 10 штук (экономия запросов)
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;
    
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    
    try {
      const batchResults = await normalizeBatch(batch, apiKey, model, signal);
      
      for (let j = 0; j < batch.length; j++) {
        const original = batch[j];
        const normalized = batchResults[j] || original;
        results.set(original, normalized);
        
        // Сохраняем в кэш
        const cacheKey = original.toLowerCase().trim();
        cache[cacheKey] = normalized;
      }
      
      setCache(cache);
    } catch (err) {
      // Если батч не удался — пробуем по одному
      for (const name of batch) {
        try {
          const normalized = await normalizeSingleName(name, apiKey, model, signal);
          results.set(name, normalized);
        } catch {
          results.set(name, name); // При ошибке оставляем как есть
        }
      }
    }
    
    if (onProgress) {
      onProgress(
        Math.min(i + BATCH_SIZE, toProcess.length) + (names.length - toProcess.length),
        names.length
      );
    }
  }
  
  return results;
}

/**
 * Нормализует батч названий одним запросом
 */
async function normalizeBatch(
  names: string[],
  apiKey: string,
  model: string,
  signal?: AbortSignal
): Promise<string[]> {
  const systemPrompt = `Ты — эксперт по стандартизации названий товаров. Приведи каждое название к единому формату: [Бренд] [Модель] [Характеристики] [Цвет].

Правила:
- Бренд латиницей (Samsung, Apple, Xiaomi...)
- Убери мусор: артикулы, коды, лишние слова
- Цвет на русском

Верни ТОЛЬКО JSON массив нормализованных названий в том же порядке, без пояснений. Пример: ["Samsung Galaxy A17 4/128GB (Серый)", "Apple iPhone 15 128GB (Чёрный)"]`;

  const userMessage = names.map((n, i) => `${i + 1}. ${n}`).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Нормализуй названия:\n${userMessage}` },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '[]';
  
  // Парсим JSON ответ
  try {
    // Пытаемся извлечь JSON массив из ответа
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length === names.length) {
        return parsed.map(String);
      }
    }
  } catch {
    // Если не удалось распарсить — разбиваем по строкам
    const lines = content.split('\n').filter((l: string) => l.trim());
    if (lines.length === names.length) {
      return lines.map((l: string) => l.replace(/^[\d."'\-\s]+/, '').replace(/["']+$/, '').trim());
    }
  }
  
  // Фолбэк — возвращаем оригиналы
  return names;
}

/**
 * Очищает кэш нормализации
 */
export function clearNormalizationCache() {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Получает размер кэша
 */
export function getCacheSize(): number {
  return Object.keys(getCache()).length;
}
