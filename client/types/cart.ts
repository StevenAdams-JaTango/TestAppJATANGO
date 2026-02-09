import { Product, ColorVariant, SizeVariant, ProductVariant } from "./index";

export interface CartItem {
  id: string; // unique cart item id
  product: Product;
  quantity: number;
  selectedColor?: ColorVariant;
  selectedSize?: SizeVariant;
  selectedVariant?: ProductVariant;
  addedAt: number; // timestamp
  showId?: string; // live show ID if added during a show
  reservedUntil?: string; // ISO timestamp for reservation expiry
}

export interface StoreCart {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string | null;
  items: CartItem[];
}

export interface Cart {
  stores: StoreCart[];
  updatedAt: number;
}

// Helper to get total items across all stores
export function getTotalCartItems(cart: Cart): number {
  return cart.stores.reduce(
    (total, store) =>
      total + store.items.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );
}

// Helper to get total price for a store
export function getStoreTotal(store: StoreCart): number {
  return store.items.reduce((total, item) => {
    const price =
      item.selectedVariant?.price ??
      item.selectedColor?.price ??
      item.selectedSize?.price ??
      item.product.price;
    return total + price * item.quantity;
  }, 0);
}

// Helper to get cart total across all stores
export function getCartTotal(cart: Cart): number {
  return cart.stores.reduce((total, store) => total + getStoreTotal(store), 0);
}
