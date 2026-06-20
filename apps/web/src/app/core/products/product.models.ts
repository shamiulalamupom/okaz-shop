export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  imageMediaId?: string;
  createdAt?: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  imageMediaId?: string;
}

export interface ProductApiResponse<T> {
  message: string;
  data: T;
}
