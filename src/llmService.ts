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
    id: 'groq',
    name: 'Groq',
    description: 'Сверхбыстрый, полностью бесплатный',
    free: true,
    freeDetails: 'Бесплатно, есть лимиты на запросы в минуту',
    apiKeyUrl: 'https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', note: 'Рекомендуется' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', note: 'Самый быстрый' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
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
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Агрегатор моделей, есть бесплатные',
    free: true,
    freeDetails: 'Многие модели бесплатны (с пометкой :free)',
    apiKeyUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (Free)', note: 'Рекомендуется' },
      { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B (Free)', note: 'Мощный' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
      { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick (Free)' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', note: 'Рассуждение' },
    ],
    defaultModel: 'deepseek/deepseek-chat-v3-0324:free',
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
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { provider: 'groq', apiKey: '', model: 'llama-3.3-70b-versatile' };
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

const SYSTEM_PROMPT = `Ты — эксперт по стандартизации названий товаров (электроника, бытовая техника, аксессуары). 
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
- "яблоко гала 1кг" → "Яблоко Гала (1 кг)"`;

// ============================================================
//  API CALLS
// ============================================================

/**
 * Вызов через OpenAI-совместимый API (Groq, OpenRouter, DeepSeek, OpenAI)
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): Promise<string> {
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Вызов через Google Gemini API
 */
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
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
  const userMessage = `Нормализуй следующие названия товаров. Верни ТОЛЬКО JSON массив нормализованных названий в том же порядке, без пояснений. Пример ответа: ["Samsung Galaxy A17 4/128GB (Серый)", "Apple iPhone 15 128GB (Чёрный)"]\n\nНазвания:\n${numbered}`;

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

/**
 * Главная функция: нормализует все названия
 */
export async function normalizeNamesBatch(
  names: string[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const settings = getSettings();
  const { provider, apiKey, model } = settings;

  if (!apiKey) {
    throw new Error('API ключ не указан. Откройте настройки и укажите ключ.');
  }

  const results = new Map<string, string>();
  const cache = getCache();

  // Проверяем кэш
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

  // Обрабатываем батчами
  const BATCH_SIZE = provider === 'gemini' ? 5 : 10;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = toProcess.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await normalizeBatch(provider, apiKey, model, batch, signal);

      for (let j = 0; j < batch.length; j++) {
        const original = batch[j];
        const normalized = batchResults[j] || original;
        results.set(original, normalized);

        // Кэш
        cache[original.toLowerCase().trim()] = normalized;
      }

      setCache(cache);
    } catch (err) {
      // При ошибке батча — пробуем по одному
      for (const name of batch) {
        try {
          const userMsg = `Нормализуй название товара. Верни ТОЛЬКО нормализованное название без пояснений и кавычек.\n\n"${name}"`;
          const result = await callLLM(provider, apiKey, model, userMsg, signal);
          const cleaned = result.replace(/^["']+|["']+$/g, '').trim();
          results.set(name, cleaned || name);
          cache[name.toLowerCase().trim()] = cleaned || name;
        } catch {
          results.set(name, name);
        }
      }
      setCache(cache);
    }

    if (onProgress) {
      onProgress(
        Math.min(i + BATCH_SIZE, toProcess.length) + (names.length - toProcess.length),
        names.length
      );
    }

    // Пауза между батчами чтобы не превысить rate limit
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(resolve => setTimeout(resolve, provider === 'gemini' ? 1000 : 300));
    }
  }

  return results;
}
