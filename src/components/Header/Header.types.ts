export interface HeaderProps {
  activeTab: 'suppliers' | 'comparison';
  onTabChange: (tab: 'suppliers' | 'comparison') => void;
  comparisonDataLength: number;
  useLLM: boolean;
  hasAnyNormalization: boolean;
  onToggleLLM: () => void;
  onNormalize: () => void;
  isNormalizing: boolean;
  normalizationProgress: { current: number; total: number };
  settings: { apiKey: string; model: string };
  onSettingsClick: () => void;
  onExportCSV: () => void;
}
