import * as t from 'io-ts';

export enum CartStatus {
  IN_PROGRESS,
  CHECKED_OUT,
  ERROR,
  ABANDONED
}

export const CartItemDecoder = t.exact(t.type({
  productId: t.string,
  quantity: t.number
}));

export type CartItem = t.TypeOf<typeof CartItemDecoder>;

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

export const UpdateEmailSignalDecoder = t.exact(t.type({
  email: t.string
}));

export type UpdateEmailSignal = t.TypeOf<typeof UpdateEmailSignalDecoder>;