import { useState, useCallback } from 'react';
import { Supplier } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const saveSuppliers = useCallback((newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    localStorage.setItem('suppliers', JSON.stringify(newSuppliers));
  }, []);

  const addSupplier = useCallback((name: string) => {
    if (!name.trim()) return null;
    const newSupplier: Supplier = {
      id: generateId(),
      name: name.trim(),
      priceText: '',
    };
    const updated = [...suppliers, newSupplier];
    saveSuppliers(updated);
    setSelectedSupplierId(newSupplier.id);
    return newSupplier;
  }, [suppliers, saveSuppliers]);

  const removeSupplier = useCallback((id: string) => {
    if (!confirm('Удалить поставщика?')) return;
    const filtered = suppliers.filter(s => s.id !== id);
    saveSuppliers(filtered);
    if (selectedSupplierId === id) {
      setSelectedSupplierId(filtered.length > 0 ? filtered[0].id : null);
    }
  }, [suppliers, selectedSupplierId, saveSuppliers]);

  const updatePriceText = useCallback((id: string, text: string) => {
    const updated = suppliers.map(s => s.id === id ? { ...s, priceText: text } : s);
    saveSuppliers(updated);
  }, [suppliers, saveSuppliers]);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || null;

  return {
    suppliers,
    selectedSupplier,
    selectedSupplierId,
    setSelectedSupplierId,
    addSupplier,
    removeSupplier,
    updatePriceText,
  };
}
