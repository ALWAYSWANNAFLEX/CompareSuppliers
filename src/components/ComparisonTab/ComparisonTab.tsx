import { useState, useMemo } from 'react';
import { ComparisonTabProps } from './ComparisonTab.types';
import { findMinPrice } from '../../parser';
import styles from './ComparisonTab.module.css';

export function ComparisonTab({
  suppliers,
  comparisonData,
  effectiveLLM,
  hasAnyNormalization,
  onToggleLLM,
}: ComparisonTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyIntersecting, setShowOnlyIntersecting] = useState(false);

  const filteredData = useMemo(() => {
    let result = comparisonData;
    
    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => item.productName.toLowerCase().includes(query));
    }
    
    // Фильтр только пересекающихся позиций (есть хотя бы у 2 поставщиков)
    if (showOnlyIntersecting) {
      result = result.filter(item => {
        const pricesWithValues = suppliers.filter(s => {
          const price = item.prices[s.id];
          return price !== null && price !== undefined;
        });
        return pricesWithValues.length >= 2;
      });
    }
    
    return result;
  }, [comparisonData, searchQuery, showOnlyIntersecting, suppliers]);

  if (comparisonData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyContent}>
          <svg className={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className={styles.emptyTitle}>Нет данных для сравнения</p>
          <p className={styles.emptyText}>Добавьте минимум 2 поставщика и загрузите их прайсы</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по наименованию..."
            className={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={styles.searchClear}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.legend}>
          <button
            onClick={() => setShowOnlyIntersecting(!showOnlyIntersecting)}
            className={`${styles.filterButton} ${showOnlyIntersecting ? styles.filterButtonActive : ''}`}
            title={showOnlyIntersecting ? 'Показать все позиции' : 'Показать только пересекающиеся'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showOnlyIntersecting ? 'Все позиции' : 'Только пересекающиеся'}
          </button>
          <span className={styles.legendItem}>
            <span className={styles.legendColor}></span>
            Лучшая цена
          </span>
          {!effectiveLLM && hasAnyNormalization && (
            <button onClick={onToggleLLM} className={styles.llmHint}>💡 Включите LLM</button>
          )}
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>
            <h3 className={styles.tableTitleText}>
              {effectiveLLM ? 'Сравнительная таблица (LLM)' : 'Сравнительная таблица'}
            </h3>
            <span className={styles.tableBadge}>{filteredData.length} из {comparisonData.length}</span>
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>Наименование</th>
                {suppliers.map(s => (
                  <th key={s.id} className={`${styles.tableHeadCell} ${styles.tableHeadCellRight}`}>
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
                  <tr key={idx} className={styles.tableRow}>
                    <td className={styles.tableCell}>{item.productName}</td>
                    {suppliers.map(s => {
                      const price = item.prices[s.id];
                      const isMin = price !== null && price === minPrice;
                      return (
                        <td
                          key={s.id}
                          className={`${styles.tableCell} ${styles.tableCellRight} ${
                            isMin ? styles.tableCellBest : price !== null ? '' : styles.tableCellEmpty
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
                  <td colSpan={suppliers.length + 1} className={styles.tableCellNotFound}>
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
