import { proxyActivities, defineSignal, defineQuery, setHandler, condition } from '@temporalio/workflow';
import { Cart, CartItem, CartStatus, CartWorkflowOptions } from './interfaces';
import type { createActivities } from './activities';

const { sendAbandonedCartEmail } = proxyActivities<ReturnType<typeof createActivities>>({
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
  
  let abandonedCartPromise = Promise.resolve();
  let timeout = setTimeout(handleAbandonedCartEmail, abandonedCartTimeoutMS);
  function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(handleAbandonedCartEmail, abandonedCartTimeoutMS);
  }

  function handleAbandonedCartEmail() {
    if (state.email === undefined) {
      return;
    }
    state.status = CartStatus.ABANDONED;
    abandonedCartPromise = sendAbandonedCartEmail(state.email);
  }

  setHandler(addToCartSignal, function addToCartSignal(item: CartItem): void {
    resetTimeout();
    const existingItem = state.items.find(({ productId }) => productId === item.productId);
    if (existingItem !== undefined) {
      existingItem.quantity += item.quantity;
    } else {
      state.items.push(item);
    }
  });

  setHandler(removeFromCartSignal, function removeFromCartSignalHandler(item: CartItem): void {
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

  setHandler(updateEmailSignal, function updateEmailSignalHandler(email: string): void {
    resetTimeout();
    state.email = email;
  });

  setHandler(getCartQuery, (): Cart => {
    return state;
  });

  setHandler(checkoutSignal, function checkoutSignalHandler(): void {
    if (state.email === undefined) {
      resetTimeout();
      state.status = CartStatus.ERROR;
      state.error = 'Must have email to check out!';
      return;
    }
    if (state.items.length === 0) {
      resetTimeout();
      state.status = CartStatus.ERROR;
      state.error = 'Must have items to check out!';
      return;
    }
    clearTimeout(timeout);
    state.error = undefined;
    state.status = CartStatus.CHECKED_OUT;
  });

  await condition(() => state.status === CartStatus.CHECKED_OUT);
  await abandonedCartPromise;
}
