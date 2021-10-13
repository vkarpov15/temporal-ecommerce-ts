export enum CartStatus {
  IN_PROGRESS,
  CHECKED_OUT
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  status: CartStatus;
  email?: string;
  items: CartItem[];
};