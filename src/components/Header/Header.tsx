import { HeaderProps } from './Header.types';
import styles from './Header.module.css';

export function Header({
  activeTab,
  onTabChange,
  comparisonDataLength,
  useLLM,
  hasAnyNormalization,
  onToggleLLM,
  onNormalize,
  isNormalizing,
  normalizationProgress,
  settings,
  onSettingsClick,
  onExportCSV,
}: HeaderProps) {
  const currentModel = settings.model || 'DeepSeek V4 Pro';

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className={styles.title}>Сравнение прайсов</h1>
              <p className={styles.subtitle}>Анализ цен от нескольких поставщиков</p>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              onClick={() => onTabChange('suppliers')}
              className={`${styles.tab} ${activeTab === 'suppliers' ? styles.tabActive : styles.tabInactive}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Поставщики
            </button>
            <button
              onClick={() => onTabChange('comparison')}
              disabled={comparisonDataLength === 0}
              className={`${styles.tab} ${
                activeTab === 'comparison'
                  ? styles.tabActive
                  : comparisonDataLength === 0
                  ? styles.tabDisabled
                  : styles.tabInactive
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Сравнение
              {comparisonDataLength > 0 && (
                <span className={styles.tabBadge}>{comparisonDataLength}</span>
              )}
            </button>
          </div>

          <div className={styles.actions}>
            {hasAnyNormalization && (
              <button
                onClick={onToggleLLM}
                className={`${styles.button} ${styles.buttonLLM} ${
                  useLLM ? styles.buttonLLMActive : styles.buttonLLMInactive
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {useLLM ? 'LLM: ВКЛ' : 'LLM: ВЫКЛ'}
              </button>
            )}
            <button
              onClick={onNormalize}
              disabled={isNormalizing}
              className={`${styles.button} ${styles.buttonNormalize}`}
            >
              {isNormalizing ? (
                <>
                  <svg className={`w-4 h-4 ${styles.spinner}`} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {normalizationProgress.current}/{normalizationProgress.total}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Нормализовать
                </>
              )}
            </button>
            <button
              onClick={onSettingsClick}
              className={`${styles.button} ${styles.buttonSettings}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {settings.apiKey ? currentModel : 'Настройки'}
            </button>
            {comparisonDataLength > 0 && (
              <button
                onClick={onExportCSV}
                className={`${styles.button} ${styles.buttonExport}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
