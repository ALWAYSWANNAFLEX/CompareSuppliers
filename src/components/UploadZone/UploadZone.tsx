import { useState, useRef, useCallback } from 'react';
import { UploadZoneProps } from './UploadZone.types';
import styles from './UploadZone.module.css';

export function UploadZone({ supplierName, onFileUpload }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFileUpload(files[0]);
  }, [onFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFileUpload(files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onFileUpload]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${styles.zone} ${isDragOver ? styles.zoneActive : ''}`}
    >
      <div className={styles.content}>
        <div className={styles.wrapper}>
          <div className={`${styles.icon} ${isDragOver ? styles.iconActive : ''}`}>
            <svg className={`${styles.iconSvg} ${isDragOver ? styles.iconSvgActive : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className={styles.text}>
            <h3 className={styles.title}>
              {isDragOver ? '📂 Отпустите файл' : `Загрузите прайс для «${supplierName}»`}
            </h3>
            <p className={styles.subtitle}>Перетащите файл или нажмите кнопку</p>
            <div className={styles.actions}>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.button}
              >
                <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Выбрать файл
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.txt,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className={styles.badges}>
                <span className={`${styles.badge} ${styles.badgeGreen}`}>Excel</span>
                <span className={`${styles.badge} ${styles.badgeGray}`}>TXT</span>
                <span className={`${styles.badge} ${styles.badgeGray}`}>CSV</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
