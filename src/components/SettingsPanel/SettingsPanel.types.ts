export interface SettingsPanelProps {
  settings: { apiKey: string; model: string };
  onSave: (settings: { apiKey: string; model: string }) => void;
  onClearCache: () => void;
  cacheSize: number;
}
