import { useState, useMemo, useCallback } from 'react';
import { ProductComparison } from './types';
import { parsePriceText, findMinPrice, exportToCSV } from './parser';
import { useSuppliers } from './hooks/useSuppliers';
import { useLLM as useLLMHook } from './hooks/useLLM';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SuppliersTab } from './components/SuppliersTab';
import { ComparisonTab } from './components/ComparisonTab';
import { SettingsPanel } from './components/SettingsPanel';
import { Notification } from './components/Notification';

function App() {
  const {
    suppliers,
    selectedSupplier,
    selectedSupplierId,
    setSelectedSupplierId,
    addSupplier,
    removeSupplier,
    updatePriceText,
  } = useSuppliers();

  const {
    settings,
    saveSettings,
    isNormalizing,
    normalizationProgress,
    useLLM: llmEnabled,
    toggleLLM,
    normalizedMap,
    cacheSize,
    lastStats,
    hasAnyNormalization,
    handleNormalize,
    handleCancelNormalization,
    handleClearCache: clearCache,
    setLastStats,
  } = useLLMHook(suppliers);

  const [activeTab, setActiveTab] = useState<'suppliers' | 'comparison'>('suppliers');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
  }, []);

  // Сравнительная таблица
  const effectiveLLM = llmEnabled && hasAnyNormalization;

  const comparisonData = useMemo<ProductComparison[]>(() => {
    if (suppliers.length === 0) return [];
    const allProducts = new Map<string, ProductComparison>();

    for (const supplier of suppliers) {
      const entries = parsePriceText(supplier.priceText);
      for (const entry of entries) {
        const norm = normalizedMap[entry.productName];
        const useNorm = effectiveLLM && norm && norm.toLowerCase().trim() !== entry.productName.toLowerCase().trim();
        const key = useNorm ? norm.toLowerCase().trim() : entry.productName.toLowerCase().trim();
        const displayName = useNorm ? norm : entry.productName;
        if (!allProducts.has(key)) {
          allProducts.set(key, { productName: displayName, prices: {} });
        }
        allProducts.get(key)!.prices[supplier.id] = entry.price;
      }
    }
    return Array.from(allProducts.values()).sort((a, b) => a.productName.localeCompare(b.productName, 'ru'));
  }, [suppliers, effectiveLLM, normalizedMap]);

  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(comparisonData, suppliers);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'price_comparison.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [comparisonData, suppliers]);

  const handleNormalizeClick = useCallback(async () => {
    const result = await handleNormalize();
    showMessage(result.success ? 'success' : 'error', result.message);
    if (!result.success && result.message.includes('API ключ')) {
      setShowSettings(true);
    }
  }, [handleNormalize, showMessage]);

  const handleToggleLLM = useCallback(() => {
    const success = toggleLLM();
    if (!success) {
      showMessage('error', 'Сначала запустите нормализацию');
    }
  }, [toggleLLM, showMessage]);

  const handleSaveSettings = useCallback(async (newSettings: typeof settings) => {
    await saveSettings(newSettings);
    setShowSettings(false);
    showMessage('success', 'Настройки сохранены');
  }, [saveSettings, showMessage]);

  const onClearCache = useCallback(async () => {
    await clearCache();
    showMessage('success', 'Кэш очищен');
  }, [clearCache, showMessage]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        comparisonDataLength={comparisonData.length}
        useLLM={llmEnabled}
        hasAnyNormalization={hasAnyNormalization}
        onToggleLLM={handleToggleLLM}
        onNormalize={handleNormalizeClick}
        isNormalizing={isNormalizing}
        normalizationProgress={normalizationProgress}
        settings={settings}
        onSettingsClick={() => setShowSettings(!showSettings)}
        onExportCSV={handleExportCSV}
      />

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClearCache={onClearCache}
          cacheSize={cacheSize}
        />
      )}

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          text={notification.text}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Main Layout */}
      <div className={`flex-1 flex flex-col lg:flex-row ${activeTab === 'comparison' ? 'max-w-full' : 'max-w-7xl'} mx-auto w-full overflow-hidden`}>
        {/* Sidebar */}
        <Sidebar
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          collapsed={sidebarCollapsed}
          onSelectSupplier={setSelectedSupplierId}
          onAddSupplier={addSupplier}
          onRemoveSupplier={removeSupplier}
          normalizedCount={Object.keys(normalizedMap).length}
          effectiveLLM={effectiveLLM}
        />

        {/* Main Content */}
        <main className={`flex-1 min-h-0 overflow-hidden ${activeTab === 'comparison' ? 'p-2 lg:p-4' : 'p-4 lg:p-6'}`}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mb-4 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title={sidebarCollapsed ? 'Показать панель' : 'Скрыть панель'}
          >
            <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {sidebarCollapsed ? 'Показать панель' : 'Скрыть панель'}
          </button>

          {/* Normalization Progress */}
          {isNormalizing && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span className="text-sm font-medium text-purple-800">Нормализация через NordRouter...</span>
                </div>
                <button
                  onClick={handleCancelNormalization}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Отменить
                </button>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${normalizationProgress.total > 0 ? (normalizationProgress.current / normalizationProgress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-purple-600 mt-1">{normalizationProgress.current} из {normalizationProgress.total}</p>
            </div>
          )}

          {/* Stats */}
          {lastStats && !isNormalizing && (
            <div className={`rounded-xl p-4 mb-4 border ${lastStats.failed > 0 && lastStats.normalized === 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">Результат:</span>
                <span className="text-green-700">✓ {lastStats.normalized} нормализовано</span>
                {lastStats.fromCache > 0 && <span className="text-gray-500">({lastStats.fromCache} из кэша)</span>}
                {lastStats.failed > 0 && <span className="text-red-600">✗ {lastStats.failed} не удалось</span>}
                <button onClick={() => setLastStats(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">✕</button>
              </div>
            </div>
          )}

          {/* Tabs Content */}
          {activeTab === 'suppliers' && (
            <>
              {selectedSupplier ? (
                <SuppliersTab
                  supplier={selectedSupplier}
                  normalizedMap={normalizedMap}
                  hasAnyNormalization={hasAnyNormalization}
                  onFileUpload={(file) => {
                    // Обработка загрузки файла будет в SuppliersTab
                  }}
                  onPriceTextChange={(text) => updatePriceText(selectedSupplier.id, text)}
                  onUploadMessage={showMessage}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Начните работу</h3>
                  <p className="text-gray-500 max-w-md mb-6">
                    Добавьте поставщиков, загрузите прайс-листы. Используйте LLM-нормализацию для объединения одинаковых товаров.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'comparison' && (
            <ComparisonTab
              suppliers={suppliers}
              comparisonData={comparisonData}
              effectiveLLM={effectiveLLM}
              hasAnyNormalization={hasAnyNormalization}
              onToggleLLM={handleToggleLLM}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <p>Данные локально • LLM через <a href="https://nordrouter.net" target="_blank" rel="noopener" className="text-purple-600 hover:underline">NordRouter</a></p>
          <p>Excel • TXT • CSV</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
