export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  email?: string;
  items: CartItem[];
};

export type CartWorkflow = () => {
  execute(): Promise<void>;
  signals: {
    addToCart: (item: CartItem) => void;
    removeFromCart: (item: CartItem) => void;
    updateCart: (email: string) => void;
    checkout: () => void;
  };
  queries: {
    getCart: () => Cart;
  };
};