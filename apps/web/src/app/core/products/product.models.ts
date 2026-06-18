export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  createdAt?: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  category?: string;
}

export interface ProductApiResponse<T> {
  message: string;
  data: T;
}
