import { useMemo } from 'react';
import { SuppliersTabProps } from './SuppliersTab.types';
import { parsePriceText, parseExcelFile, entriesToPlainText } from '../../parser';
import { UploadZone } from '../UploadZone';
import styles from './SuppliersTab.module.css';

export function SuppliersTab({
  supplier,
  normalizedMap,
  hasAnyNormalization,
  onFileUpload,
  onPriceTextChange,
  onUploadMessage,
}: SuppliersTabProps) {
  const entries = useMemo(() => parsePriceText(supplier.priceText), [supplier.priceText]);

  const handleFileUpload = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const parsed = parseExcelFile(data);
          if (parsed.length > 0) {
            onPriceTextChange(entriesToPlainText(parsed));
            onUploadMessage('success', `Загружено ${parsed.length} позиций из "${file.name}"`);
          } else {
            onUploadMessage('error', 'Не удалось распознать данные в файле.');
          }
        } catch {
          onUploadMessage('error', 'Ошибка при чтении файла.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (extension === 'txt' || extension === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onPriceTextChange(text);
        const parsed = parsePriceText(text);
        onUploadMessage('success', `Загружено ${parsed.length} позиций из "${file.name}"`);
      };
      reader.readAsText(file, 'utf-8');
    } else {
      onUploadMessage('error', 'Поддерживаемые форматы: .xlsx, .xls, .txt, .csv');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <UploadZone supplierName={supplier.name} onFileUpload={handleFileUpload} />

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Или вставьте прайс текстом</h3>
            <span className={styles.badge}>{entries.length} позиций</span>
          </div>
          <textarea
            value={supplier.priceText}
            onChange={(e) => onPriceTextChange(e.target.value)}
            placeholder={"Вставьте прайс в любом формате:\n\nSamsung-A17-4/128-Gray  14500\nSamsung A17 4/128 серый — 14500\nSM-A175F 4+128 Black  14500"}
            className={styles.textarea}
          />
        </div>

        {entries.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Распознанные позиции</h3>
              <span className={styles.badge}>{entries.length} позиций</span>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={`${styles.tableHeadCell} ${styles.tableHeadCellSmall}`}>№</th>
                    <th className={styles.tableHeadCell}>Оригинал</th>
                    {hasAnyNormalization && (
                      <th className={styles.tableHeadCell}>→ Стандарт</th>
                    )}
                    <th className={`${styles.tableHeadCell} ${styles.tableHeadCellRight} ${styles.tableHeadCellPrice}`}>Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const normalized = normalizedMap[entry.productName];
                    const hasNorm = normalized && normalized.toLowerCase().trim() !== entry.productName.toLowerCase().trim();
                    return (
                      <tr key={idx} className={styles.tableRow}>
                        <td className={`${styles.tableCell} ${styles.tableCellIndex}`}>{idx + 1}</td>
                        <td className={styles.tableCell}>{entry.productName}</td>
                        {hasAnyNormalization && (
                          <td className={hasNorm ? styles.tableCellNormalized : styles.tableCellNormalizedEmpty}>
                            {hasNorm ? normalized : '—'}
                          </td>
                        )}
                        <td className={`${styles.tableCell} ${styles.tableCellPrice}`}>
                          {entry.price !== null ? entry.price.toLocaleString('ru-RU') + ' ₽' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
