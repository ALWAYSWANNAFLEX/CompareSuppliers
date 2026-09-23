import { useMemo } from 'react';
import { Supplier } from '../types';
import { parsePriceText, parseExcelFile, entriesToPlainText } from '../parser';
import { UploadZone } from './UploadZone';

interface SuppliersTabProps {
  supplier: Supplier;
  normalizedMap: Record<string, string>;
  hasAnyNormalization: boolean;
  onFileUpload: (file: File) => void;
  onPriceTextChange: (text: string) => void;
  onUploadMessage: (type: 'success' | 'error', text: string) => void;
}

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
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="space-y-5">
        {/* Upload zone */}
        <UploadZone supplierName={supplier.name} onFileUpload={handleFileUpload} />

        {/* Text input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Или вставьте прайс текстом</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{entries.length} позиций</span>
          </div>
          <textarea
            value={supplier.priceText}
            onChange={(e) => onPriceTextChange(e.target.value)}
            placeholder={"Вставьте прайс в любом формате:\n\nSamsung-A17-4/128-Gray  14500\nSamsung A17 4/128 серый — 14500\nSM-A175F 4+128 Black  14500"}
            className="w-full h-40 px-5 py-4 text-sm font-mono text-gray-800 resize-none focus:outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Parsed preview */}
        {entries.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Распознанные позиции</h3>
              <span className="text-xs text-gray-500">{entries.length} позиций</span>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-2 text-gray-600 font-medium w-12">№</th>
                    <th className="text-left px-5 py-2 text-gray-600 font-medium">Оригинал</th>
                    {hasAnyNormalization && (
                      <th className="text-left px-5 py-2 text-purple-600 font-medium">→ Стандарт</th>
                    )}
                    <th className="text-right px-5 py-2 text-gray-600 font-medium w-32">Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const normalized = normalizedMap[entry.productName];
                    const hasNorm = normalized && normalized.toLowerCase().trim() !== entry.productName.toLowerCase().trim();
                    return (
                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-2 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-5 py-2 text-gray-800">{entry.productName}</td>
                        {hasAnyNormalization && (
                          <td className={`px-5 py-2 text-xs ${hasNorm ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                            {hasNorm ? normalized : '—'}
                          </td>
                        )}
                        <td className="px-5 py-2 text-right font-medium text-gray-800">
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
