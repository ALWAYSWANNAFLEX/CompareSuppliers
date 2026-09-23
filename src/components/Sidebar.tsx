import { useState, useRef, useEffect } from 'react';
import { Supplier } from '../types';
import { parsePriceText } from '../parser';

interface SidebarProps {
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  collapsed: boolean;
  onSelectSupplier: (id: string) => void;
  onAddSupplier: (name: string) => void;
  onRemoveSupplier: (id: string) => void;
  normalizedCount: number;
  effectiveLLM: boolean;
}

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

  // useOutsideClick для закрытия формы
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
    <aside className="w-full lg:w-80 lg:flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 overflow-y-auto sidebar-transition">
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
        <div ref={addFormRef} className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 relative">
          <button
            onClick={() => { setShowAddForm(false); setNewSupplierName(''); }}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 pr-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setShowAddForm(false); setNewSupplierName(''); }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
              Добавить
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewSupplierName(''); }}
              className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
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
                onClick={() => onSelectSupplier(supplier.id)}
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${entryCount > 0 ? 'bg-green-400' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{supplier.name}</p>
                  <p className="text-xs text-gray-500">{entryCount > 0 ? `${entryCount} товаров` : 'Прайс не загружен'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveSupplier(supplier.id); }}
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

      {normalizedCount > 0 && (
        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-xs font-medium text-purple-700">LLM нормализация</span>
          </div>
          <p className="text-xs text-purple-600">{normalizedCount} названий в кэше</p>
          {effectiveLLM && <p className="text-xs text-purple-500 mt-1">✓ Активна — товары группируются</p>}
        </div>
      )}
    </aside>
  );
}
