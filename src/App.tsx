import { useState, useCallback, useMemo } from 'react';
import { Supplier, ProductComparison } from './types';
import { parsePriceText, findMinPrice, exportToCSV } from './parser';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function App() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('suppliers');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Сохраняем в localStorage
  const saveSuppliers = useCallback((newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    localStorage.setItem('suppliers', JSON.stringify(newSuppliers));
  }, []);

  const addSupplier = useCallback(() => {
    if (!newSupplierName.trim()) return;
    const newSupplier: Supplier = {
      id: generateId(),
      name: newSupplierName.trim(),
      priceText: '',
    };
    saveSuppliers([...suppliers, newSupplier]);
    setNewSupplierName('');
    setShowAddForm(false);
    setSelectedSupplierId(newSupplier.id);
  }, [newSupplierName, suppliers, saveSuppliers]);

  const removeSupplier = useCallback((id: string) => {
    if (confirm('Удалить поставщика?')) {
      const filtered = suppliers.filter(s => s.id !== id);
      saveSuppliers(filtered);
      if (selectedSupplierId === id) {
        setSelectedSupplierId(filtered.length > 0 ? filtered[0].id : null);
      }
    }
  }, [suppliers, selectedSupplierId, saveSuppliers]);

  const updatePriceText = useCallback((id: string, text: string) => {
    const updated = suppliers.map(s => s.id === id ? { ...s, priceText: text } : s);
    saveSuppliers(updated);
  }, [suppliers, saveSuppliers]);

  const selectedSupplier = useMemo(() => 
    suppliers.find(s => s.id === selectedSupplierId), 
    [suppliers, selectedSupplierId]
  );

  // Формируем сводную таблицу
  const comparisonData = useMemo<ProductComparison[]>(() => {
    if (suppliers.length === 0) return [];

    // Собираем все уникальные наименования товаров
    const allProducts = new Map<string, ProductComparison>();

    for (const supplier of suppliers) {
      const entries = parsePriceText(supplier.priceText);
      for (const entry of entries) {
        const key = entry.productName.toLowerCase().trim();
        if (!allProducts.has(key)) {
          allProducts.set(key, {
            productName: entry.productName,
            prices: {},
          });
        }
        allProducts.get(key)!.prices[supplier.id] = entry.price;
      }
    }

    return Array.from(allProducts.values()).sort((a, b) => 
      a.productName.localeCompare(b.productName, 'ru')
    );
  }, [suppliers]);

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

  const selectedSupplierEntries = useMemo(() => {
    if (!selectedSupplier) return [];
    return parsePriceText(selectedSupplier.priceText);
  }, [selectedSupplier]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Сравнение прайсов</h1>
                <p className="text-sm text-gray-500">Анализ цен от нескольких поставщиков</p>
              </div>
            </div>
            {comparisonData.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Экспорт в CSV
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Sidebar - Suppliers */}
        <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Поставщики</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {showAddForm && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Название поставщика"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                onKeyDown={(e) => e.key === 'Enter' && addSupplier()}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={addSupplier}
                  className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                >
                  Добавить
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewSupplierName(''); }}
                  className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">Добавьте поставщиков<br/>для начала работы</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suppliers.map(supplier => {
                const entryCount = parsePriceText(supplier.priceText).length;
                return (
                  <div
                    key={supplier.id}
                    className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedSupplierId === supplier.id
                        ? 'bg-blue-50 border border-blue-200 shadow-sm'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => setSelectedSupplierId(supplier.id)}
                  >
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      entryCount > 0 ? 'bg-green-400' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{supplier.name}</p>
                      <p className="text-xs text-gray-500">
                        {entryCount > 0 ? `${entryCount} товаров` : 'Прайс не загружен'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSupplier(supplier.id); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {!selectedSupplier && suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Начните работу</h3>
              <p className="text-gray-500 max-w-md">
                Добавьте поставщиков в левой панели, затем вставьте их прайс-листы в текстовом формате.
                Система автоматически сравнит цены и выделит лучшие предложения.
              </p>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left max-w-md">
                <p className="text-xs font-semibold text-gray-600 mb-2">Пример формата прайса:</p>
                <code className="text-xs text-gray-700 leading-relaxed block">
                  Товар А - 1500<br/>
                  Товар Б - 2300<br/>
                  Товар В - 890
                </code>
              </div>
            </div>
          ) : selectedSupplier ? (
            <div className="space-y-6">
              {/* Price input area */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{selectedSupplier.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {selectedSupplierEntries.length} позиций
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Формат: Наименование - Цена
                  </span>
                </div>
                <textarea
                  value={selectedSupplier.priceText}
                  onChange={(e) => updatePriceText(selectedSupplier.id, e.target.value)}
                  placeholder={"Вставьте прайс-лист поставщика...\n\nПример:\nЯблоко Гала 1кг - 150\nБанан Эквадор 1кг - 89\nАпельсин Марокко 1кг - 120"}
                  className="w-full h-64 px-5 py-4 text-sm font-mono text-gray-800 resize-none focus:outline-none placeholder:text-gray-400"
                />
              </div>

              {/* Parsed preview */}
              {selectedSupplierEntries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Распознанные позиции</h3>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-5 py-2 text-gray-600 font-medium">№</th>
                          <th className="text-left px-5 py-2 text-gray-600 font-medium">Наименование</th>
                          <th className="text-right px-5 py-2 text-gray-600 font-medium">Цена</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSupplierEntries.map((entry, idx) => (
                          <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-5 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-5 py-2 text-gray-800">{entry.productName}</td>
                            <td className="px-5 py-2 text-right font-medium text-gray-800">
                              {entry.price !== null ? entry.price.toLocaleString('ru-RU') + ' ₽' : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Comparison Table */}
              {suppliers.length > 1 && comparisonData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">Сравнительная таблица</h3>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {comparisonData.length} товаров
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded-sm mr-1 align-middle"></span>
                      Лучшая цена
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap border-r border-gray-200">
                            Наименование
                          </th>
                          {suppliers.map(s => (
                            <th key={s.id} className="text-right px-4 py-3 text-gray-600 font-medium whitespace-nowrap border-r border-gray-200 last:border-r-0">
                              {s.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((item, idx) => {
                          const allPrices = suppliers.map(s => item.prices[s.id] ?? null);
                          const minPrice = findMinPrice(allPrices);
                          
                          return (
                            <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-gray-800 font-medium border-r border-gray-200 whitespace-nowrap">
                                {item.productName}
                              </td>
                              {suppliers.map(s => {
                                const price = item.prices[s.id];
                                const isMin = price !== null && price === minPrice;
                                
                                return (
                                  <td
                                    key={s.id}
                                    className={`px-4 py-2.5 text-right border-r border-gray-200 last:border-r-0 whitespace-nowrap ${
                                      isMin
                                        ? 'bg-green-50 text-green-800 font-bold'
                                        : price !== null
                                        ? 'text-gray-700'
                                        : 'text-gray-300'
                                    }`}
                                  >
                                    {price !== null && price !== undefined
                                      ? `${price.toLocaleString('ru-RU')} ₽`
                                      : '—'
                                    }
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Info about single supplier */}
              {suppliers.length === 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Добавьте ещё поставщиков</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Сравнительная таблица с подсветкой лучших цен появится, когда вы добавите минимум 2 поставщиков и загрузите их прайс-листы.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <p>Данные сохраняются локально в браузере</p>
          <p>Формат прайса: <code className="bg-gray-100 px-1.5 py-0.5 rounded">Наименование - Цена</code></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
