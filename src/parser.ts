import { PriceEntry } from './types';

/**
 * Парсит plain text прайс в формате:
 * "Наименование товара - цена"
 * 
 * Поддерживает различные разделители:
 * - " - " (тире с пробелами)
 * - " — " (длинное тире)
 * - "\t" (табуляция)
 * - ";" (точка с запятой)
 * - "|" (пайп)
 */
export function parsePriceText(text: string): PriceEntry[] {
  const entries: PriceEntry[] = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Пробуем различные разделители
    let match: RegExpMatchArray | null = null;
    
    // Формат: "Название - 1234" или "Название — 1234"
    match = trimmedLine.match(/^(.+?)\s*[-—–]\s*(\d+[\d\s.,]*)\s*$/);
    
    if (!match) {
      // Формат с табуляцией или точкой с запятой
      match = trimmedLine.match(/^(.+?)\s*[;\t|]\s*(\d+[\d\s.,]*)\s*$/);
    }
    
    if (!match) {
      // Формат: "Название: 1234"
      match = trimmedLine.match(/^(.+?)\s*:\s*(\d+[\d\s.,]*)\s*$/);
    }

    if (match) {
      const productName = match[1].trim();
      const priceStr = match[2].trim().replace(/\s/g, '').replace(',', '.');
      const price = parseFloat(priceStr);
      
      if (productName && !isNaN(price)) {
        entries.push({ productName, price });
      }
    }
  }

  return entries;
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
