import { useState } from 'react';
import { MODELS, LLMSettings } from '../llmService';

interface SettingsPanelProps {
  settings: LLMSettings;
  onSave: (settings: LLMSettings) => void;
  onClearCache: () => void;
  cacheSize: number;
}

export function SettingsPanel({ settings, onSave, onClearCache, cacheSize }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4 flex-wrap">
          {/* API Key */}
          <div className="flex-1 min-w-[280px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">NordRouter API ключ</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-nr-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Получить: <a href="https://nordrouter.net/dashboard/" target="_blank" rel="noopener" className="text-purple-600 hover:underline">nordrouter.net/dashboard</a>
            </p>
          </div>

          {/* Model */}
          <div className="min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.note ? `— ${m.note}` : ''} ({m.priceNote})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => onSave({ apiKey, model })}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={onClearCache}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              title={`Кэш: ${cacheSize} записей`}
            >
              Кэш ({cacheSize})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
