import { Supplier } from '../../types';

export interface SidebarProps {
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  collapsed: boolean;
  onSelectSupplier: (id: string) => void;
  onAddSupplier: (name: string) => void;
  onRemoveSupplier: (id: string) => void;
  normalizedCount: number;
  effectiveLLM: boolean;
}
