import { defineSignal, defineQuery, setListener, condition } from '@temporalio/workflow';
import { Cart, CartItem, CartStatus } from './interfaces';
// Only import the activity types
import type * as activities from './activities';

export const addToCartSignal = defineSignal<[CartItem]>('addToCart');
export const removeFromCartSignal = defineSignal<[CartItem]>('removeFromCart');
export const updateEmailSignal = defineSignal<[string]>('updateEmail');
export const checkoutSignal = defineSignal('checkout');

export const getCartQuery = defineQuery<Cart>('getCart');

export async function cartWorkflow(): Promise<void> {
  const state: Cart = { items: [], status: CartStatus.IN_PROGRESS };

  setListener(addToCartSignal, function addToCartSignal(item: CartItem): void {
    const existingItem = state.items.find(({ productId }) => productId === item.productId);
    if (existingItem !== undefined) {
      existingItem.quantity += item.quantity;
    } else {
      state.items.push(item);
    }
  });

  setListener(removeFromCartSignal, function removeFromCartSignalHandler(item: CartItem): void {
    const index = state.items.findIndex(({ productId }) => productId === item.productId);
    if (index === -1) {
      return;
    }

    const existingItem = state.items[index];
    existingItem.quantity -= item.quantity;
    if (existingItem.quantity <= 0) {
      state.items.splice(index, 1);
    }
  });

  setListener(updateEmailSignal, function updateEmailSignalHandler(email: string): void {
    state.email = email;
  });

  setListener(getCartQuery, (): Cart => {
    return state;
  });

  setListener(checkoutSignal, function checkoutSignalHandler(): void {
    state.status = CartStatus.CHECKED_OUT;
  });

  await condition(() => state.status === CartStatus.CHECKED_OUT);
}
