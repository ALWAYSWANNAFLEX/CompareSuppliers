import { useState, useCallback, useEffect } from 'react';
import { Supplier } from '../types';
import { parsePriceText } from '../parser';
import {
  getSettings, saveSettings,
  normalizeNamesBatch, clearNormalizationCache, getCacheSize,
  NormalizationStats, LLMSettings
} from '../llmService';
import { mapGetAll, mapSetAll, mapClear, migrateFromLocalStorage } from '../db';

export function useLLM(suppliers: Supplier[]) {
  const [settings, setSettingsState] = useState<LLMSettings>(getSettings());
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizationProgress, setNormalizationProgress] = useState({ current: 0, total: 0 });
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [useLLM, setUseLLM] = useState(false);
  const [normalizedMap, setNormalizedMap] = useState<Record<string, string>>({});
  const [cacheSize, setCacheSize] = useState(0);
  const [lastStats, setLastStats] = useState<NormalizationStats | null>(null);

  // Инициализация из IndexedDB
  useEffect(() => {
    (async () => {
      await migrateFromLocalStorage();
      const map = await mapGetAll();
      if (Object.keys(map).length > 0) {
        setNormalizedMap(map);
        setUseLLM(true);
      }
      const size = await getCacheSize();
      setCacheSize(size);
    })();
  }, []);

  const saveSettingsHandler = useCallback(async (newSettings: LLMSettings) => {
    saveSettings(newSettings);
    setSettingsState(newSettings);
    setCacheSize(await getCacheSize());
  }, []);

  const handleNormalize = useCallback(async () => {
    if (!settings.apiKey) {
      return { success: false, message: 'Укажите API ключ NordRouter в настройках' };
    }
    if (suppliers.length === 0) {
      return { success: false, message: 'Добавьте поставщиков с прайсами' };
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsNormalizing(true);
    setNormalizationProgress({ current: 0, total: 0 });

    const allNames = new Set<string>();
    for (const supplier of suppliers) {
      const entries = parsePriceText(supplier.priceText);
      for (const entry of entries) allNames.add(entry.productName);
    }

    const namesArray = Array.from(allNames);
    setNormalizationProgress({ current: 0, total: namesArray.length });

    const { map, stats } = await normalizeNamesBatch(
      namesArray,
      (current: number, total: number) => setNormalizationProgress({ current, total }),
      controller.signal
    );

    const newMap: Record<string, string> = {};
    map.forEach((normalized: string, original: string) => { newMap[original] = normalized; });
    
    const mergedMap = { ...normalizedMap, ...newMap };
    setNormalizedMap(mergedMap);
    await mapSetAll(mergedMap);
    setUseLLM(true);
    setCacheSize(await getCacheSize());
    setLastStats(stats);

    setIsNormalizing(false);
    setAbortController(null);

    if (controller.signal.aborted) {
      return { success: true, message: `⏹ Отменено. Нормализовано ${stats.normalized} из ${stats.total}` };
    } else if (stats.failed > 0 && stats.normalized === 0) {
      return { success: false, message: 'Не удалось нормализовать. Проверьте API ключ и баланс.' };
    } else if (stats.failed > 0) {
      return { success: true, message: `✓ ${stats.normalized} нормализовано, ${stats.failed} не удалось` };
    } else {
      return { success: true, message: `✓ Нормализовано ${stats.normalized} названий (${stats.fromCache} из кэша)` };
    }
  }, [settings.apiKey, suppliers, normalizedMap]);

  const handleCancelNormalization = useCallback(() => {
    if (abortController) abortController.abort();
  }, [abortController]);

  const handleClearCache = useCallback(async () => {
    if (!confirm('Очистить кэш нормализации и карту нормализации?')) return;
    await clearNormalizationCache();
    await mapClear();
    setNormalizedMap({});
    setCacheSize(await getCacheSize());
    setUseLLM(false);
  }, []);

  const toggleLLM = useCallback(() => {
    if (!useLLM && Object.keys(normalizedMap).length === 0) {
      return false;
    }
    setUseLLM(!useLLM);
    return true;
  }, [useLLM, normalizedMap]);

  const hasAnyNormalization = Object.keys(normalizedMap).length > 0;

  return {
    settings,
    saveSettings: saveSettingsHandler,
    isNormalizing,
    normalizationProgress,
    useLLM,
    toggleLLM,
    normalizedMap,
    cacheSize,
    lastStats,
    hasAnyNormalization,
    handleNormalize,
    handleCancelNormalization,
    handleClearCache,
    setLastStats,
  };
}
