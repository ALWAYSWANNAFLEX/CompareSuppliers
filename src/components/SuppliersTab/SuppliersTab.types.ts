import { Supplier } from '../../types';

export interface SuppliersTabProps {
  supplier: Supplier;
  normalizedMap: Record<string, string>;
  hasAnyNormalization: boolean;
  onFileUpload: (file: File) => void;
  onPriceTextChange: (text: string) => void;
  onUploadMessage: (type: 'success' | 'error', text: string) => void;
}
