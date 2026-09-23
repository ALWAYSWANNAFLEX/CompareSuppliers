import { useState, useRef, useCallback } from 'react';

interface UploadZoneProps {
  supplierName: string;
  onFileUpload: (file: File) => void;
}

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
      className={`bg-white rounded-xl border-2 border-dashed transition-all overflow-hidden ${
        isDragOver ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-300 hover:border-blue-300'
      }`}
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDragOver ? 'bg-blue-100' : 'bg-gradient-to-br from-blue-50 to-indigo-100'
          }`}>
            <svg className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              {isDragOver ? '📂 Отпустите файл' : `Загрузите прайс для «${supplierName}»`}
            </h3>
            <p className="text-sm text-gray-500 mb-3">Перетащите файл или нажмите кнопку</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">Excel</span>
                <span className="text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 rounded">TXT</span>
                <span className="text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 rounded">CSV</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
