import { createActivityHandle, defineSignal, defineQuery, setListener, condition, CancellationScope } from '@temporalio/workflow';
import { Cart, CartItem, CartStatus, CartWorkflowOptions } from './interfaces';
import type { createActivities } from './activities';

const { sendAbandonedCartEmail } = createActivityHandle<ReturnType<typeof createActivities>>({
  startToCloseTimeout: '240 minutes',
});

export const addToCartSignal = defineSignal<[CartItem]>('addToCart');
export const removeFromCartSignal = defineSignal<[CartItem]>('removeFromCart');
export const updateEmailSignal = defineSignal<[string]>('updateEmail');
export const checkoutSignal = defineSignal('checkout');

export const getCartQuery = defineQuery<Cart>('getCart');

export async function cartWorkflow(options?: CartWorkflowOptions): Promise<void> {
  const state: Cart = { items: [], status: CartStatus.IN_PROGRESS };

  const abandonedCartTimeoutMS = options && options.abandonedCartTimeoutMS > 0 ?
    options.abandonedCartTimeoutMS :
    1000 * 60;
  
  let timeout = setTimeout(() => state.email && sendAbandonedCartEmail(state.email), abandonedCartTimeoutMS);
  function resetTimeout() {
    clearTimeout(timeout);
    setTimeout(() => state.email && sendAbandonedCartEmail(state.email), abandonedCartTimeoutMS);
  }

  setListener(addToCartSignal, function addToCartSignal(item: CartItem): void {
    resetTimeout();
    const existingItem = state.items.find(({ productId }) => productId === item.productId);
    if (existingItem !== undefined) {
      existingItem.quantity += item.quantity;
    } else {
      state.items.push(item);
    }
  });

  setListener(removeFromCartSignal, function removeFromCartSignalHandler(item: CartItem): void {
    resetTimeout();
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
    resetTimeout();
    state.email = email;
  });

  setListener(getCartQuery, (): Cart => {
    return state;
  });

  setListener(checkoutSignal, function checkoutSignalHandler(): void {
    if (state.email === undefined) {
      throw new Error('Must have email to check out!');
    }
    clearTimeout(timeout);
    state.status = CartStatus.CHECKED_OUT;
  });

  await condition(() => state.status === CartStatus.CHECKED_OUT);
}
