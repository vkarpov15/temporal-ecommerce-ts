import { Trigger } from '@temporalio/workflow';
import { Cart, CartItem, CartWorkflow } from '../interfaces';
// Only import the activity types
import type * as activities from '../activities';

export const cartWorkflow: CartWorkflow = () => {
  const state: Cart = { items: [] };
  const checkoutTrigger = new Trigger<void>();

  return {
    async execute(): Promise<void> {
      await checkoutTrigger;
    },
    signals: {
      addToCart(item: CartItem): void {
        const existingItem = state.items.find(({ productId }) => productId === item.productId);
        if (existingItem !== undefined) {
          existingItem.quantity += item.quantity;
        } else {
          state.items.push(item);
        }
      },
      removeFromCart(item: CartItem): void {
        const index = state.items.findIndex(({ productId }) => productId === item.productId);
        if (index === -1) {
          return;
        }

        const existingItem = state.items[index];
        existingItem.quantity -= item.quantity;
        if (existingItem.quantity <= 0) {
          state.items.splice(index, 1);
        }
      },
      updateEmail(email: string): void {
        state.email = email;
      },
      checkout(): void {
        checkoutTrigger.resolve();
      }
    },
    queries: {
      getCart(): Cart {
        return state;
      },
    },
  };
};
