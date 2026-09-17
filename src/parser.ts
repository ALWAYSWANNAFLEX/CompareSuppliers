import { PriceEntry } from './types';
import * as XLSX from 'xlsx';

// ============================================================
//  УТИЛИТЫ
// ============================================================

/**
 * Очищает строку от мусора
 */
function cleanName(str: string): string {
  return str
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-—–:;.]+/, '')  // убираем разделители в начале
    .replace(/[\s\-—–:;.]+$/, '')  // убираем разделители в конце
    .replace(/^\d+[.)]\s*/, '')    // убираем нумерацию "1. " или "1) "
    .replace(/^["«»""„']+/g, '')   // убираем кавычки
    .replace(/["«»""„']+$/g, '')
    .trim();
}

/**
 * Находит ВСЕ числовые фрагменты в строке с их позициями
 * Возвращает массив { value, start, end }
 */
function findAllNumbers(str: string): { value: number; start: number; end: number; raw: string }[] {
  const results: { value: number; start: number; end: number; raw: string }[] = [];
  // Ищем числа: целые, с пробелами-разделителями тысяч, с дробной частью
  const regex = /(\d[\d\s.,]*\d|\d)(?=\s|$|[^.\d]|[^.\d,\s])/g;
  let match;
  
  while ((match = regex.exec(str)) !== null) {
    const raw = match[1];
    // Очищаем число от пробелов и запятых
    const cleaned = raw.replace(/\s/g, '').replace(/,/g, '.');
    // Убираем лишние точки (например "1.234.567" -> "1234.567")
    const parts = cleaned.split('.');
    let numStr: string;
    if (parts.length > 2) {
      // Несколько точек — скорее всего разделители тысяч
      numStr = parts.join('');
    } else {
      numStr = cleaned;
    }
    
    const value = parseFloat(numStr);
    if (!isNaN(value) && value > 0) {
      results.push({
        value,
        start: match.index,
        end: match.index + raw.length,
        raw,
      });
    }
  }
  
  return results;
}

/**
 * Проверяет, является ли строка заголовком/шапкой
 */
function isHeaderLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  const patterns = [
    /^наименование/i, /^товар/i, /^название/i, /^продукци/i,
    /^позици/i, /^п\/?п/i, /^№/, /^наим/i, /^артикул/i,
    /^код/i, /^sku/i, /^model/i, /^name/i, /^product/i,
    /^price/i, /^цена/i, /^стоимость/i, /^прайс/i,
    /^описание/i, /^характеристик/i, /^единиц/i, /^кол-во/i,
    /^количество/i, /^остаток/i, /^сумма/i, /^итог/i,
  ];
  return patterns.some(p => p.test(lower));
}

/**
 * Проверяет, является ли строка мусорной
 */
function isGarbageLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return true;
  if (t.length < 3) return true;
  if (/^[-=_*#+~]{3,}$/.test(t)) return true;
  if (/^(итого|всего|внимание|условия|контакт|телефон|адрес|сайт|www|http|факс|email|@|скидк|акци)/i.test(t)) return true;
  // Строка без единого числа — скорее всего мусор
  if (!/\d/.test(t)) return true;
  return false;
}

// ============================================================
//  УМНЫЙ ПАРСЕР PLAIN TEXT
// ============================================================

/**
 * Главная функция: извлекает название и цену из строки.
 * 
 * Стратегия:
 * 1. Находим все числа в строке
 * 2. Последнее «большое» число — это цена
 * 3. Всё до позиции этого числа — название
 * 
 * Это работает для форматов:
 * - "Samsung-A17-4/128-Gray  14500"
 * - "Товар А - 1500"
 * - "1. Яблоко Гала 1кг - 150"
 * - "Артикул 12345 | Товар | 990"
 * - "Товар  1 500 руб"
 */
function smartParseLine(line: string): { name: string; price: number } | null {
  const trimmed = line.trim();
  if (isGarbageLine(trimmed) || isHeaderLine(trimmed)) return null;

  const numbers = findAllNumbers(trimmed);
  if (numbers.length === 0) return null;

  // === Стратегия 1: Есть явный разделитель ===
  const separators = [' - ', ' — ', ' – ', '\t', ' | ', ' ; ', ':\t', ': '];
  
  for (const sep of separators) {
    // Ищем разделитель справа налево (последний)
    const lastSepIdx = trimmed.lastIndexOf(sep);
    if (lastSepIdx > 0) {
      const afterSep = trimmed.substring(lastSepIdx + sep.length).trim();
      const beforeSep = trimmed.substring(0, lastSepIdx).trim();
      
      // Проверяем что после разделителя — число (возможно с валютой)
      const priceMatch = afterSep.match(/^[\d\s.,]+/);
      if (priceMatch) {
        const priceStr = priceMatch[0].replace(/\s/g, '').replace(/,/g, '.');
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0 && beforeSep.length > 0) {
          return { name: cleanName(beforeSep), price };
        }
      }
    }
  }

  // === Стратегия 2: Двойной (или более) пробел как разделитель ===
  const doubleSpaceMatch = trimmed.match(/^(.+?)\s{2,}(.+)$/);
  if (doubleSpaceMatch) {
    const left = doubleSpaceMatch[1].trim();
    const right = doubleSpaceMatch[2].trim();
    
    // Проверяем: правая часть — это число?
    const rightNum = parseFloat(right.replace(/\s/g, '').replace(/,/g, '.'));
    if (!isNaN(rightNum) && rightNum > 0) {
      return { name: cleanName(left), price: rightNum };
    }
    
    // Левая часть — число? (редко, но бывает)
    const leftNum = parseFloat(left.replace(/\s/g, '').replace(/,/g, '.'));
    if (!isNaN(leftNum) && leftNum > 0) {
      // Проверяем что правая часть — это текст (название)
      if (/[а-яёa-z]/i.test(right)) {
        return { name: cleanName(right), price: leftNum };
      }
    }
  }

  // === Стратегия 3: Берём ПОСЛЕДНЕЕ число как цену ===
  // Всё что до него — название
  const lastNum = numbers[numbers.length - 1];
  
  // Но сначала проверим: может последнее число — это часть названия (артикул)?
  // Если перед последним числом есть ещё числа и между ними текст — 
  // скорее всего последнее число это цена
  const beforeLastNum = trimmed.substring(0, lastNum.start).trim();
  
  // Убираем разделитель перед числом
  const nameCleaned = beforeLastNum.replace(/[\s\-—–:;|]+$/, '').trim();
  
  if (nameCleaned.length >= 2) {
    return { name: cleanName(nameCleaned), price: lastNum.value };
  }

  return null;
}

/**
 * Парсит plain text прайс
 */
export function parsePriceText(text: string): PriceEntry[] {
  const entries: PriceEntry[] = [];
  const lines = text.split('\n');
  const seenNames = new Set<string>();

  for (const line of lines) {
    const result = smartParseLine(line);
    
    if (result && result.name.length >= 2 && result.price > 0) {
      const key = result.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        entries.push({ productName: result.name, price: result.price });
      }
    }
  }

  return entries;
}

// ============================================================
//  УМНЫЙ ПАРСЕР EXCEL
// ============================================================

/**
 * Определяет, является ли значение числом (ценой)
 */
function isPriceValue(val: unknown): number | null {
  if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[\s₽$€£руб.р]/gi, '').replace(/,/g, '.').trim();
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0 && /^\d+\.?\d*$/.test(cleaned)) return num;
  }
  return null;
}

/**
 * Определяет, является ли ячейка текстовым названием товара
 */
function isProductNameValue(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 2) return false;
  // Должен содержать буквы
  if (!/[а-яёa-z]/i.test(trimmed)) return false;
  // Не должен быть заголовком
  if (isHeaderLine(trimmed)) return false;
  return true;
}

/**
 * Анализирует таблицу и находит колонку с ценами и колонку с названиями
 */
function detectColumns(data: unknown[][]): { nameCol: number; priceCol: number; dataStartRow: number } {
  if (data.length === 0) return { nameCol: 0, priceCol: 1, dataStartRow: 0 };

  const maxCols = Math.max(...data.map(row => (row as unknown[]).length));
  
  // === Попытка 1: Ищем строку-заголовок ===
  let headerRowIdx = -1;
  let nameCol = -1;
  let priceCol = -1;
  
  for (let rowIdx = 0; rowIdx < Math.min(data.length, 15); rowIdx++) {
    const row = data[rowIdx] as unknown[];
    if (!row) continue;
    
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = String(row[colIdx] || '').trim().toLowerCase();
      if (/наименование|товар|название|продукц|позиц|наим|описан|артикул|модель/i.test(cell)) {
        nameCol = colIdx;
        headerRowIdx = rowIdx;
      }
      if (/цена|стоимость|прайс|cost|price|сумма|руб/i.test(cell)) {
        priceCol = colIdx;
        headerRowIdx = rowIdx;
      }
    }
    
    if (nameCol >= 0 && priceCol >= 0) break;
  }
  
  // Если нашли заголовок — данные начинаются со следующей строки
  if (headerRowIdx >= 0) {
    // Если нашли только одну колонку из двух — пробуем угадать вторую
    if (nameCol >= 0 && priceCol < 0) {
      // Цена скорее всего справа от названия
      for (let col = nameCol + 1; col < maxCols; col++) {
        // Проверяем есть ли числа в этой колонке
        let numCount = 0;
        for (let r = headerRowIdx + 1; r < Math.min(data.length, headerRowIdx + 20); r++) {
          const row = data[r] as unknown[];
          if (row && isPriceValue(row[col]) !== null) numCount++;
        }
        if (numCount > 0) { priceCol = col; break; }
      }
    }
    if (priceCol >= 0 && nameCol < 0) {
      // Название скорее всего слева от цены
      for (let col = priceCol - 1; col >= 0; col--) {
        let textCount = 0;
        for (let r = headerRowIdx + 1; r < Math.min(data.length, headerRowIdx + 20); r++) {
          const row = data[r] as unknown[];
          if (row && isProductNameValue(row[col])) textCount++;
        }
        if (textCount > 0) { nameCol = col; break; }
      }
    }
    
    if (nameCol >= 0 && priceCol >= 0) {
      return { nameCol, priceCol, dataStartRow: headerRowIdx + 1 };
    }
  }

  // === Попытка 2: Статистический анализ — ищем колонку с числами ===
  const colStats: { col: number; numCount: number; textCount: number }[] = [];
  
  for (let col = 0; col < maxCols; col++) {
    let numCount = 0;
    let textCount = 0;
    
    for (let rowIdx = 0; rowIdx < Math.min(data.length, 30); rowIdx++) {
      const row = data[rowIdx] as unknown[];
      if (!row || col >= row.length) continue;
      
      const val = row[col];
      if (isPriceValue(val) !== null) numCount++;
      if (isProductNameValue(val)) textCount++;
    }
    
    colStats.push({ col, numCount, textCount });
  }
  
  // Колонка с максимальным кол-вом чисел — цена
  const priceColCandidate = colStats.reduce((best, curr) => 
    curr.numCount > best.numCount ? curr : best, { col: 0, numCount: 0, textCount: 0 }
  );
  
  // Колонка с максимальным кол-вом текста — название
  const nameColCandidate = colStats.reduce((best, curr) => 
    curr.textCount > best.textCount ? curr : best, { col: 0, numCount: 0, textCount: 0 }
  );
  
  if (priceColCandidate.numCount > 0 && nameColCandidate.textCount > 0) {
    // Определяем с какой строки начинаются данные (пропускаем заголовки)
    let dataStartRow = 0;
    for (let r = 0; r < Math.min(data.length, 10); r++) {
      const row = data[r] as unknown[];
      if (!row) continue;
      
      const nameVal = row[nameColCandidate.col];
      const priceVal = row[priceColCandidate.col];
      
      // Если обе ячейки содержат данные — это строка с данными
      if (isProductNameValue(nameVal) && isPriceValue(priceVal) !== null) {
        dataStartRow = r;
        break;
      }
    }
    
    return {
      nameCol: nameColCandidate.col,
      priceCol: priceColCandidate.col,
      dataStartRow,
    };
  }

  // === Фолбэк: первые две колонки ===
  return { nameCol: 0, priceCol: 1, dataStartRow: 0 };
}

/**
 * Парсит Excel файл
 */
export function parseExcelFile(data: ArrayBuffer): PriceEntry[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const entries: PriceEntry[] = [];
  const seenNames = new Set<string>();

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return entries;

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (jsonData.length === 0) return entries;

  const { nameCol, priceCol, dataStartRow } = detectColumns(jsonData);

  for (let rowIdx = dataStartRow; rowIdx < jsonData.length; rowIdx++) {
    const row = jsonData[rowIdx] as unknown[];
    if (!row) continue;

    const nameVal = row[nameCol];
    const priceVal = row[priceCol];

    const nameStr = String(nameVal || '').trim();
    const price = isPriceValue(priceVal);

    if (isGarbageLine(nameStr) || isHeaderLine(nameStr)) continue;
    if (nameStr.length < 2 || price === null) continue;

    const productName = cleanName(nameStr);
    if (productName.length < 2) continue;

    const key = productName.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      entries.push({ productName, price });
    }
  }

  return entries;
}

// ============================================================
//  ЭКСПОРТ / УТИЛИТЫ
// ============================================================

export function entriesToPlainText(entries: PriceEntry[]): string {
  return entries.map(e => `${e.productName}  ${e.price}`).join('\n');
}

export function findMinPrice(prices: (number | null)[]): number | null {
  const valid = prices.filter((p): p is number => p !== null);
  return valid.length === 0 ? null : Math.min(...valid);
}

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

  return [header.join(';'), ...rows.map(row => row.join(';'))].join('\n');
}
