export interface Store {
  id: string;
  name: string;
  city?: string | null;
}

export interface Stock {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
}

export interface ProductStock {
  productId: string;
  total: number;
  stocks: Stock[];
}
