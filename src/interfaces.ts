import * as runtypes from 'runtypes';

export enum CartStatus {
  IN_PROGRESS,
  CHECKED_OUT,
  ERROR,
  ABANDONED
}

export const CartItemDecoder = runtypes.Record({
  productId: runtypes.String,
  quantity: runtypes.Number
});

export type CartItem = runtypes.Static<typeof CartItemDecoder>;

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

export const UpdateEmailSignalDecoder = runtypes.Record({
  email: runtypes.String
});

export type UpdateEmailSignal = runtypes.Static<typeof UpdateEmailSignalDecoder>;