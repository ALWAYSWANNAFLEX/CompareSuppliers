import { useState } from 'react';
import { SettingsPanelProps } from './SettingsPanel.types';
import { MODELS } from '../../llmService';
import styles from './SettingsPanel.module.css';

export function SettingsPanel({ settings, onSave, onClearCache, cacheSize }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);

  return (
    <div className={styles.panel}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.field}>
            <label className={styles.label}>NordRouter API ключ</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-nr-..."
              className={styles.input}
            />
            <p className={styles.hint}>
              Получить: <a href="https://nordrouter.net/dashboard/" target="_blank" rel="noopener" className={styles.link}>nordrouter.net/dashboard</a>
            </p>
          </div>

          <div className={`${styles.field} ${styles.fieldSmall}`}>
            <label className={styles.label}>Модель</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={styles.select}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.note ? `— ${m.note}` : ''} ({m.priceNote})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => onSave({ apiKey, model })}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Сохранить
            </button>
            <button
              onClick={onClearCache}
              className={`${styles.button} ${styles.buttonSecondary}`}
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
