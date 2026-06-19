export type OrderStatus = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';

export interface OrderItem {
  id?: string;
  productId: string;
  storeId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  reason: string | null;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
}

export interface CreateOrderItem {
  productId: string;
  storeId: string;
  quantity: number;
}
