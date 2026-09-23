import { useState, useMemo } from 'react';
import { Supplier, ProductComparison } from '../types';
import { findMinPrice } from '../parser';

interface ComparisonTabProps {
  suppliers: Supplier[];
  comparisonData: ProductComparison[];
  effectiveLLM: boolean;
  hasAnyNormalization: boolean;
  onToggleLLM: () => void;
}

export function ComparisonTab({
  suppliers,
  comparisonData,
  effectiveLLM,
  hasAnyNormalization,
  onToggleLLM,
}: ComparisonTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return comparisonData;
    const query = searchQuery.toLowerCase().trim();
    return comparisonData.filter(item => item.productName.toLowerCase().includes(query));
  }, [comparisonData, searchQuery]);

  if (comparisonData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium mb-2">Нет данных для сравнения</p>
          <p className="text-sm">Добавьте минимум 2 поставщика и загрузите их прайсы</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search and controls */}
      <div className="mb-4 flex items-center gap-4 flex-wrap flex-shrink-0">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по наименованию..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-green-100 border border-green-300 rounded-sm"></span>
            Лучшая цена
          </span>
          {!effectiveLLM && hasAnyNormalization && (
            <button onClick={onToggleLLM} className="text-purple-600 hover:underline">💡 Включите LLM</button>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800 text-sm">
              {effectiveLLM ? 'Сравнительная таблица (LLM)' : 'Сравнительная таблица'}
            </h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {filteredData.length} из {comparisonData.length}
            </span>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap border-r border-b border-gray-200 bg-gray-50">
                  Наименование
                </th>
                {suppliers.map(s => (
                  <th key={s.id} className="text-right px-4 py-3 text-gray-600 font-medium whitespace-nowrap border-r border-b border-gray-200 last:border-r-0 bg-gray-50">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => {
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
                            isMin ? 'bg-green-50 text-green-800 font-bold' : price !== null ? 'text-gray-700' : 'text-gray-300'
                          }`}
                        >
                          {price !== null && price !== undefined ? `${price.toLocaleString('ru-RU')} ₽` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={suppliers.length + 1} className="px-4 py-8 text-center text-gray-400">
                    Ничего не найдено по запросу «{searchQuery}»
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
