export enum CartStatus {
  IN_PROGRESS,
  CHECKED_OUT,
  ERROR,
  ABANDONED
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  status: CartStatus;
  email?: string;
  items: CartItem[];
  error?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
}

export interface CartWorkflowOptions {
  abandonedCartTimeoutMS: number;
}
