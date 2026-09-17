/**
 * Сервис для стандартизации названий товаров через LLM
 * Поддерживает несколько провайдеров: Groq, Google Gemini, OpenRouter, DeepSeek, OpenAI
 */

// ============================================================
//  ТИПЫ И КОНФИГУРАЦИЯ
// ============================================================

export type LLMProvider = 'groq' | 'gemini' | 'openrouter' | 'deepseek' | 'openai';

export interface ProviderConfig {
  id: LLMProvider;
  name: string;
  description: string;
  free: boolean;
  freeDetails: string;
  apiKeyUrl: string;
  baseUrl: string;
  models: { id: string; name: string; note?: string }[];
  defaultModel: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Бесплатные модели, без карты',
    free: true,
    freeDetails: 'Полностью бесплатно, без кредитной карты',
    apiKeyUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra 550B', note: 'Топ бесплатная' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B', note: 'Быстрая' },
      { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning', note: 'Самая быстрая' },
      { id: 'openrouter/free', name: 'Auto (любая бесплатная)', note: 'Роутер' },
      { id: 'cohere/north-mini-code:free', name: 'Cohere North Mini Code' },
      { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small' },
    ],
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Бесплатный, отличное качество',
    free: true,
    freeDetails: 'Бесплатно до 15 запросов/мин',
    apiKeyUrl: 'https://aistudio.google.com/apikey',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', note: 'Рекомендуется' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', note: 'Быстрее' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Сверхбыстрый inference',
    free: false,
    freeDetails: 'Платный: $0.075-0.80 за 1M токенов',
    apiKeyUrl: 'https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', note: 'Самый дешёвый' },
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', note: 'Мощный' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen3.8 27B' },
    ],
    defaultModel: 'openai/gpt-oss-20b',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Хорошее качество, бесплатные лимиты',
    free: true,
    freeDetails: 'Бесплатные лимиты при регистрации',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    baseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', note: 'Рекомендуется' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
    ],
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Платный, максимальное качество',
    free: false,
    freeDetails: 'Платный, ~$0.01-0.05 за 1000 названий',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', note: 'Дешевле' },
      { id: 'gpt-4o', name: 'GPT-4o', note: 'Точнее' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', note: 'Самый дешёвый' },
    ],
    defaultModel: 'gpt-4o-mini',
  },
];

// ============================================================
//  LOCALSTORAGE HELPERS
// ============================================================

const CACHE_KEY = 'normalization_cache';
const SETTINGS_KEY = 'llm_settings';

export interface LLMSettings {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

export function getSettings(): LLMSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as LLMSettings;
      // Валидация: если модель больше не существует у провайдера — сбрасываем
      const provider = PROVIDERS.find(p => p.id === parsed.provider);
      if (provider) {
        const modelExists = provider.models.some(m => m.id === parsed.model);
        if (modelExists) return parsed;
      }
      // Модель невалидна — сбрасываем к дефолтному провайдеру
      const defaultProvider = PROVIDERS[0];
      return { provider: defaultProvider.id, apiKey: parsed.apiKey || '', model: defaultProvider.defaultModel };
    }
  } catch { /* ignore */ }
  const defaultProvider = PROVIDERS[0];
  return { provider: defaultProvider.id, apiKey: '', model: defaultProvider.defaultModel };
}

export function saveSettings(settings: LLMSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

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

export function clearNormalizationCache() {
  localStorage.removeItem(CACHE_KEY);
}

export function getCacheSize(): number {
  return Object.keys(getCache()).length;
}

// ============================================================
//  SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `Ты — эксперт по стандартизации названий товаров (электроника, смартфоны, планшеты).
Твоя задача — привести название товара к единому стандартному формату.

Формат вывода:
[Бренд] [Модель] [ОЗУ]/[Встроенная память] [Цвет]

Правила:
1. Бренд — латиницей как официально (Samsung, Apple, Xiaomi, Realme, Poco и т.д.)
2. Модель — как в официальном каталоге (Galaxy A17, iPhone 15 Pro, Redmi Note 13 и т.д.)
3. ОЗУ и встроенная память — числом через слэш (4/128, 8/256). Если встроенная память не указана — пиши только ОЗУ.
4. Цвет — ОСТАВЬ КАК ЕСТЬ (латиницей), не переводи (Gray, Black, Natural Titanium и т.д.)
5. Разделитель: пробел между блоками, слэш только между ОЗУ и памятью
6. Убери мусор: внутренние артикулы (SM-A175F, M2101K7AI и т.п.), слова "новый", "оригинал", "global version" и т.п.

Примеры:
- "Samsung-A17-4/128-Gray" → "Samsung Galaxy A17 4/128 Gray"
- "Самсунг А 17 4+128 серый" → "Samsung Galaxy A17 4/128 Gray"
- "SM-A175F/DS 4+128 Black" → "Samsung Galaxy A17 4/128 Black"
- "IPHONE 15 PRO MAX 256GB NATURAL TITANIUM" → "Apple iPhone 15 Pro Max 8/256 Natural Titanium"
- "Xiaomi Redmi Note 13 8/256 Midnight Black" → "Xiaomi Redmi Note 13 8/256 Midnight Black"
- "Realme C55 6/128 Sunshower" → "Realme C55 6/128 Sunshower"
- "Poco X6 Pro 8/256" → "Poco X6 Pro 8/256"
- "Samsung A15 4/64 Blue" → "Samsung Galaxy A15 4/64 Blue"`;

// ============================================================
//  API CALLS
// ============================================================

/**
 * Задержка
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Вызов через OpenAI-совместимый API (Groq, OpenRouter, DeepSeek, OpenAI)
 * С retry при 429 ошибке
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): Promise<string> {
  const MAX_RETRIES = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
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
        // Rate limit — ждём и повторяем
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 2000;
        await sleep(Math.min(waitMs, 30000));
        continue;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
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

/**
 * Вызов через Google Gemini API с retry
 */
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const MAX_RETRIES = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${SYSTEM_PROMPT}\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          }
        }),
        signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 3000;
        await sleep(Math.min(waitMs, 30000));
        continue;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(Math.pow(2, attempt) * 3000);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Универсальный вызов LLM
 */
async function callLLM(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  userMessage: string,
  signal?: AbortSignal
): Promise<string> {
  const providerConfig = PROVIDERS.find(p => p.id === provider);
  if (!providerConfig) throw new Error(`Unknown provider: ${provider}`);

  if (provider === 'gemini') {
    return callGemini(apiKey, model, userMessage, signal);
  }

  // OpenAI-совместимые провайдеры
  return callOpenAICompatible(
    providerConfig.baseUrl,
    apiKey,
    model,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    signal
  );
}

// ============================================================
//  BATCH NORMALIZATION
// ============================================================

/**
 * Нормализует батч названий одним запросом
 */
async function normalizeBatch(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  names: string[],
  signal?: AbortSignal
): Promise<string[]> {
  const numbered = names.map((n, i) => `${i + 1}. ${n}`).join('\n');
  const userMessage = `Нормализуй следующие названия товаров. Верни ТОЛЬКО JSON массив нормализованных названий в том же порядке, без пояснений. Пример ответа: ["Samsung Galaxy A17 4/128 Gray", "Apple iPhone 15 8/128 Black"]\n\nНазвания:\n${numbered}`;

  const content = await callLLM(provider, apiKey, model, userMessage, signal);

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
    // Пробуем разбить по строкам
    const lines = content.split('\n').filter((l: string) => l.trim());
    if (lines.length === names.length) {
      return lines.map((l: string) => l.replace(/^[\d."'\-\s]+/, '').replace(/["']+$/, '').trim());
    }
  }

  return names; // Фолбэк
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
 */
export async function normalizeNamesBatch(
  names: string[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<NormalizationResult> {
  const settings = getSettings();
  const { provider, apiKey, model } = settings;

  const results = new Map<string, string>();
  const stats: NormalizationStats = { total: names.length, fromCache: 0, normalized: 0, failed: 0 };

  if (!apiKey) {
    // Без ключа — возвращаем оригиналы
    for (const name of names) results.set(name, name);
    stats.failed = names.length;
    return { map: results, stats };
  }

  const cache = getCache();

  // Проверяем кэш
  const toProcess: string[] = [];
  for (const name of names) {
    const cacheKey = name.toLowerCase().trim();
    if (cache[cacheKey]) {
      const cached = cache[cacheKey];
      results.set(name, cached);
      // Считаем "нормализованным" только если отличается от оригинала
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

  // Обрабатываем батчами (маленькими, чтобы не упираться в rate limit)
  const BATCH_SIZE = provider === 'gemini' ? 3 : 5;
  let consecutiveErrors = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    // Если 3 батча подряд упали — прекращаем, чтобы не тратить время
    if (consecutiveErrors >= 3) {
      // Остальные — как есть
      for (let k = i; k < toProcess.length; k++) {
        results.set(toProcess[k], toProcess[k]);
        stats.failed++;
      }
      break;
    }

    const batch = toProcess.slice(i, i + BATCH_SIZE);
    let batchOk = false;

    try {
      const batchResults = await normalizeBatch(provider, apiKey, model, batch, signal);

      for (let j = 0; j < batch.length; j++) {
        const original = batch[j];
        const normalized = batchResults[j] || original;
        results.set(original, normalized);
        cache[original.toLowerCase().trim()] = normalized;
        if (normalized.toLowerCase().trim() !== original.toLowerCase().trim()) {
          stats.normalized++;
        }
      }
      setCache(cache);
      batchOk = true;
      consecutiveErrors = 0;
    } catch {
      // При ошибке батча — пробуем по одному
      for (const name of batch) {
        try {
          const userMsg = `Нормализуй название товара. Верни ТОЛЬКО нормализованное название без пояснений и кавычек.\n\n"${name}"`;
          const result = await callLLM(provider, apiKey, model, userMsg, signal);
          const cleaned = result.replace(/^["']+|["']+$/g, '').trim();
          results.set(name, cleaned || name);
          cache[name.toLowerCase().trim()] = cleaned || name;
          if (cleaned && cleaned.toLowerCase().trim() !== name.toLowerCase().trim()) {
            stats.normalized++;
          }
          batchOk = true;
        } catch {
          results.set(name, name);
          stats.failed++;
        }
      }
      setCache(cache);
    }

    if (!batchOk) consecutiveErrors++;

    if (onProgress) {
      onProgress(
        Math.min(i + BATCH_SIZE, toProcess.length) + (names.length - toProcess.length),
        names.length
      );
    }

    // Пауза между батчами
    if (i + BATCH_SIZE < toProcess.length) {
      const pauseMs = provider === 'gemini' ? 5000 : provider === 'openrouter' ? 4000 : 2500;
      await sleep(pauseMs);
    }
  }

  return { map: results, stats };
}
