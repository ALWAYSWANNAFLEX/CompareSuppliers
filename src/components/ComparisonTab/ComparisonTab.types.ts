import { Supplier, ProductComparison } from '../../types';

export interface ComparisonTabProps {
  suppliers: Supplier[];
  comparisonData: ProductComparison[];
  effectiveLLM: boolean;
  hasAnyNormalization: boolean;
  onToggleLLM: () => void;
}
