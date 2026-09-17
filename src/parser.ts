import { PriceEntry } from './types';
import * as XLSX from 'xlsx';

/**
 * Очищает строку от лишних символов
 */
function cleanString(str: string): string {
  return str
    .replace(/\s+/g, ' ')      // множественные пробелы -> один
    .replace(/["«»""„]/g, '')   // убираем кавычки
    .replace(/^\s*[\d.]+\s*[.)]\s*/, '') // убираем нумерацию "1. " или "1) "
    .trim();
}

/**
 * Извлекает цену из строки (последнее число в строке)
 */
function extractPrice(str: string): number | null {
  // Ищем все числа в строке
  const numbers = str.match(/\d+[\d\s.,]*\d|\d+/g);
  if (!numbers || numbers.length === 0) return null;
  
  // Берём последнее число — обычно это цена
  const lastNum = numbers[numbers.length - 1];
  const cleaned = lastNum.replace(/\s/g, '').replace(',', '.');
  const price = parseFloat(cleaned);
  
  return isNaN(price) ? null : price;
}

/**
 * Извлекает название товара (всё до цены)
 */
function extractProductName(line: string): string {
  // Убираем нумерацию в начале
  let cleaned = line.replace(/^\s*[\d.]+\s*[.)]\s*/, '');
  
  // Пробуем найти разделитель и взять часть до него
  const separators = [' - ', ' — ', ' – ', '\t', ' | ', ' ; ', ': '];
  
  for (const sep of separators) {
    const idx = cleaned.lastIndexOf(sep);
    if (idx > 0) {
      const beforeSep = cleaned.substring(0, idx).trim();
      const afterSep = cleaned.substring(idx + sep.length).trim();
      
      // Проверяем что после разделителя есть число
      const priceCheck = afterSep.match(/^[\d\s.,]+/);
      if (priceCheck) {
        return cleanString(beforeSep);
      }
    }
  }
  
  // Если разделитель не найден, берём всё до последнего числа
  const match = cleaned.match(/^(.+?)\s+(\d[\d\s.,]*)\s*(руб|р\.|₽|грн|₸|$)/i);
  if (match) {
    return cleanString(match[1]);
  }
  
  // Фолбэк: всё до последнего числа
  const lastNumIdx = cleaned.search(/\d[\d\s.,]*\d|\d+\s*$/);
  if (lastNumIdx > 0) {
    return cleanString(cleaned.substring(0, lastNumIdx));
  }
  
  return cleanString(cleaned);
}

/**
 * Определяет, является ли строка заголовком/шапкой таблицы
 */
function isHeaderLine(line: string): boolean {
  const headerPatterns = [
    /^наименование/i,
    /^товар/i,
    /^название/i,
    /^продукция/i,
    /^позиция/i,
    /^#?\s*п\/?п/i,
    /^№/i,
    /^наим/i,
    /^\s*название\s*$/i,
    /^\s*товар\s*$/i,
  ];
  
  const trimmed = line.trim().toLowerCase();
  return headerPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Определяет, является ли строка пустой или мусорной
 */
function isGarbageLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length < 3) return true;
  if (/^[-=_*#+]{3,}$/.test(trimmed)) return true; // линии из символов
  if (/^(итого|всего|внимание|условия|контакт|телефон|адрес|сайт|www|http)/i.test(trimmed)) return true;
  return false;
}

/**
 * Парсит plain text прайс в формате:
 * "Наименование товара - цена"
 * 
 * Поддерживает множество форматов:
 * - "Товар - 1234"
 * - "Товар — 1234"  
 * - "Товар: 1234"
 * - "Товар  1234" (просто пробел)
 * - "1. Товар - 1234" (с нумерацией)
 * - "Товар - 1 234" (с пробелами в числе)
 * - "Товар - 1,234.56" (с дробной частью)
 * - "Товар 1234 руб" (с валютой)
 */
export function parsePriceText(text: string): PriceEntry[] {
  const entries: PriceEntry[] = [];
  const lines = text.split('\n');
  const seenNames = new Set<string>();

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Пропускаем мусор
    if (isGarbageLine(trimmedLine)) continue;
    if (isHeaderLine(trimmedLine)) continue;

    // Пробуем распарсить строку
    let productName = '';
    let price: number | null = null;

    // Формат с явным разделителем: "Название - 1234"
    const separatorMatch = trimmedLine.match(/^(.+?)\s*[-—–:;|]\s*(\d[\d\s.,]*)\s*(руб|р\.?|₽|грн|₸|usd|\$|€)?\s*$/i);
    
    if (separatorMatch) {
      productName = cleanString(separatorMatch[1]);
      const priceStr = separatorMatch[2].trim().replace(/\s/g, '').replace(',', '.');
      price = parseFloat(priceStr);
    }
    
    // Формат с табуляцией: "Название\t1234"
    if (!productName) {
      const tabMatch = trimmedLine.match(/^(.+?)\t+(\d[\d\s.,]*)\s*(руб|р\.?|₽|грн|₸)?\s*$/i);
      if (tabMatch) {
        productName = cleanString(tabMatch[1]);
        const priceStr = tabMatch[2].trim().replace(/\s/g, '').replace(',', '.');
        price = parseFloat(priceStr);
      }
    }
    
    // Формат без явного разделителя: "Название 1234" или "Название 1234 руб"
    if (!productName) {
      const noSepMatch = trimmedLine.match(/^(.+?)\s{2,}(\d[\d\s.,]*)\s*(руб|р\.?|₽|грн|₸)?\s*$/i);
      if (noSepMatch) {
        productName = cleanString(noSepMatch[1]);
        const priceStr = noSepMatch[2].trim().replace(/\s/g, '').replace(',', '.');
        price = parseFloat(priceStr);
      }
    }
    
    // Формат: "1. Название - 1234" (с нумерацией)
    if (!productName) {
      const numberedMatch = trimmedLine.match(/^\s*\d+[.)]\s*(.+?)\s*[-—–:;|]\s*(\d[\d\s.,]*)\s*(руб|р\.?|₽|грн|₸)?\s*$/i);
      if (numberedMatch) {
        productName = cleanString(numberedMatch[1]);
        const priceStr = numberedMatch[2].trim().replace(/\s/g, '').replace(',', '.');
        price = parseFloat(priceStr);
      }
    }

    // Фолбэк: извлекаем название и цену из любой строки
    if (!productName && trimmedLine.length > 3) {
      productName = extractProductName(trimmedLine);
      price = extractPrice(trimmedLine);
    }

    // Валидация и добавление
    if (productName && productName.length > 1 && price !== null && !isNaN(price) && price > 0) {
      const key = productName.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        entries.push({ productName, price });
      }
    }
  }

  return entries;
}

/**
 * Парсит Excel файл (xlsx, xls)
 */
export function parseExcelFile(data: ArrayBuffer): PriceEntry[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const entries: PriceEntry[] = [];
  const seenNames = new Set<string>();

  // Берём первый лист
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return entries;
  
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

  let nameColIdx = -1;
  let priceColIdx = -1;

  // Ищем заголовок для определения колонок
  for (let rowIdx = 0; rowIdx < Math.min(jsonData.length, 10); rowIdx++) {
    const row = jsonData[rowIdx] as string[];
    if (!row) continue;
    
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = String(row[colIdx] || '').trim().toLowerCase();
      if (/наименование|товар|название|продукц|позиц|наим/i.test(cell)) {
        nameColIdx = colIdx;
      }
      if (/цена|стоимость|прайс|руб|cost|price/i.test(cell)) {
        priceColIdx = colIdx;
      }
    }
    
    if (nameColIdx >= 0 && priceColIdx >= 0) break;
  }

  // Если не нашли заголовок — пробуем определить по данным
  if (nameColIdx < 0 || priceColIdx < 0) {
    // Ищем строку с данными для определения колонок
    for (let rowIdx = 0; rowIdx < Math.min(jsonData.length, 20); rowIdx++) {
      const row = jsonData[rowIdx] as string[];
      if (!row || row.length < 2) continue;
      
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = String(row[colIdx] || '').trim();
        // Проверяем есть ли число
        const num = parseFloat(cell.replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(num) && num > 0 && priceColIdx < 0) {
          priceColIdx = colIdx;
          // Название скорее всего в предыдущей колонке
          if (nameColIdx < 0 && colIdx > 0) {
            nameColIdx = colIdx - 1;
          }
        }
      }
      if (nameColIdx >= 0 && priceColIdx >= 0) break;
    }
  }

  // Если всё ещё не нашли — берём первые две колонки
  if (nameColIdx < 0) nameColIdx = 0;
  if (priceColIdx < 0) priceColIdx = 1;

  // Парсим данные
  for (let rowIdx = 0; rowIdx < jsonData.length; rowIdx++) {
    const row = jsonData[rowIdx] as (string | number)[];
    if (!row || row.length < 2) continue;

    const nameCell = String(row[nameColIdx] || '').trim();
    const priceCell = row[priceColIdx];

    // Пропускаем заголовки и мусор
    if (isHeaderLine(nameCell) || isGarbageLine(nameCell)) continue;
    if (nameCell.length < 2) continue;

    // Извлекаем цену
    let price: number | null = null;
    if (typeof priceCell === 'number') {
      price = priceCell;
    } else {
      const priceStr = String(priceCell || '').replace(/\s/g, '').replace(',', '.');
      const parsed = parseFloat(priceStr);
      price = isNaN(parsed) ? null : parsed;
    }

    const productName = cleanString(nameCell);
    
    if (productName && productName.length > 1 && price !== null && !isNaN(price) && price > 0) {
      const key = productName.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        entries.push({ productName, price });
      }
    }
  }

  return entries;
}

/**
 * Конвертирует PriceEntry[] в plain text
 */
export function entriesToPlainText(entries: PriceEntry[]): string {
  return entries.map(e => `${e.productName} - ${e.price}`).join('\n');
}

/**
 * Находит минимальную цену из списка
 */
export function findMinPrice(prices: (number | null)[]): number | null {
  const validPrices = prices.filter((p): p is number => p !== null);
  if (validPrices.length === 0) return null;
  return Math.min(...validPrices);
}

/**
 * Экспорт данных в CSV
 */
export function exportToCSV(
  data: { productName: string; prices: Record<string, number | null> }[],
  suppliers: { id: string; name: string }[]
): string {
  const header = ['Наименование товара', ...suppliers.map(s => s.name)];
  const rows = data.map(item => {
    const prices = suppliers.map(s => {
      const price = item.prices[s.id];
      return price !== null && price !== undefined ? price.toString() : '';
    });
    return [item.productName, ...prices];
  });

  const csvContent = [
    header.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  return csvContent;
}
