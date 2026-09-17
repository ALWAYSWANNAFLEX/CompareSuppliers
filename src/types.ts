export interface Supplier {
  id: string;
  name: string;
  priceText: string;
}

export interface PriceEntry {
  productName: string;
  price: number | null;
}

export interface ProductComparison {
  productName: string;
  prices: Record<string, number | null>; // supplierId -> price
}
