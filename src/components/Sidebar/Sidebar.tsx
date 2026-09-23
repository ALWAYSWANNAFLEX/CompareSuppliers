import { useState, useRef, useEffect } from 'react';
import { SidebarProps } from './Sidebar.types';
import { parsePriceText } from '../../parser';
import styles from './Sidebar.module.css';

export function Sidebar({
  suppliers,
  selectedSupplierId,
  collapsed,
  onSelectSupplier,
  onAddSupplier,
  onRemoveSupplier,
  normalizedCount,
  effectiveLLM,
}: SidebarProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const addFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addFormRef.current && !addFormRef.current.contains(event.target as Node)) {
        setShowAddForm(false);
        setNewSupplierName('');
      }
    }
    if (showAddForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddForm]);

  const handleAdd = () => {
    if (!newSupplierName.trim()) return;
    onAddSupplier(newSupplierName.trim());
    setNewSupplierName('');
    setShowAddForm(false);
  };

  if (collapsed) return null;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Поставщики</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className={styles.addButton}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {showAddForm && (
        <div ref={addFormRef} className={styles.addForm}>
          <button
            onClick={() => { setShowAddForm(false); setNewSupplierName(''); }}
            className={styles.closeButton}
            title="Закрыть"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <input
            type="text"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            placeholder="Название поставщика"
            className={styles.input}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setShowAddForm(false); setNewSupplierName(''); }
            }}
            autoFocus
          />
          <div className={styles.formActions}>
            <button onClick={handleAdd} className={styles.buttonAdd}>Добавить</button>
            <button onClick={() => { setShowAddForm(false); setNewSupplierName(''); }} className={styles.buttonCancel}>Отмена</button>
          </div>
        </div>
      )}

      {suppliers.length === 0 ? (
        <div className={styles.empty}>
          <svg className={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className={styles.emptyText}>Добавьте поставщиков<br/>для начала работы</p>
        </div>
      ) : (
        <div className={styles.list}>
          {suppliers.map(supplier => {
            const entryCount = parsePriceText(supplier.priceText).length;
            return (
              <div
                key={supplier.id}
                className={`${styles.item} ${selectedSupplierId === supplier.id ? styles.itemSelected : ''}`}
                onClick={() => onSelectSupplier(supplier.id)}
              >
                <div className={`${styles.indicator} ${entryCount > 0 ? styles.indicatorActive : styles.indicatorInactive}`} />
                <div className={styles.itemContent}>
                  <p className={styles.itemName}>{supplier.name}</p>
                  <p className={styles.itemCount}>{entryCount > 0 ? `${entryCount} товаров` : 'Прайс не загружен'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveSupplier(supplier.id); }}
                  className={styles.removeButton}
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

      {normalizedCount > 0 && (
        <div className={styles.llmStatus}>
          <div className={styles.llmHeader}>
            <svg className={styles.llmIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className={styles.llmTitle}>LLM нормализация</span>
          </div>
          <p className={styles.llmCount}>{normalizedCount} названий в кэше</p>
          {effectiveLLM && <p className={styles.llmActive}>✓ Активна — товары группируются</p>}
        </div>
      )}
    </aside>
  );
}
