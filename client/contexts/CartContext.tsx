import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Cart, StoreCart } from "@/types/cart";
import { Product, ColorVariant, SizeVariant, ProductVariant } from "@/types";
import { cartService } from "@/services/cart";
import { useAuth } from "@/contexts/AuthContext";

interface CartResult {
  success: boolean;
  message?: string;
}

interface CartContextType {
  cart: Cart;
  isLoading: boolean;
  totalItems: number;
  addToCart: (
    product: Product,
    quantity?: number,
    selectedColor?: ColorVariant,
    selectedSize?: SizeVariant,
    selectedVariant?: ProductVariant,
    showId?: string,
  ) => Promise<CartResult>;
  updateQuantity: (
    sellerId: string,
    cartItemId: string,
    quantity: number,
  ) => Promise<CartResult>;
  removeItem: (sellerId: string, cartItemId: string) => Promise<CartResult>;
  clearStoreCart: (sellerId: string) => Promise<CartResult>;
  clearCart: () => Promise<CartResult>;
  getStoreCart: (sellerId: string) => StoreCart | undefined;
  getStoreItemCount: (sellerId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Cart>({ stores: [], updatedAt: Date.now() });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = cartService.subscribe((updatedCart) => {
      setCart({ ...updatedCart });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      const loadedCart = await cartService.initialize();
      if (cancelled) return;
      setCart(loadedCart);
      setIsLoading(false);
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const totalItems = cart.stores.reduce(
    (total, store) =>
      total + store.items.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );

  const addToCart = useCallback(
    async (
      product: Product,
      quantity: number = 1,
      selectedColor?: ColorVariant,
      selectedSize?: SizeVariant,
      selectedVariant?: ProductVariant,
      showId?: string,
    ) => {
      return cartService.addToCart(
        product,
        quantity,
        selectedColor,
        selectedSize,
        selectedVariant,
        showId,
      );
    },
    [],
  );

  const updateQuantity = useCallback(
    async (sellerId: string, cartItemId: string, quantity: number) => {
      return cartService.updateQuantity(sellerId, cartItemId, quantity);
    },
    [],
  );

  const removeItem = useCallback(
    async (sellerId: string, cartItemId: string) => {
      return cartService.removeItem(sellerId, cartItemId);
    },
    [],
  );

  const clearStoreCart = useCallback(async (sellerId: string) => {
    return cartService.clearStoreCart(sellerId);
  }, []);

  const clearCart = useCallback(async () => {
    return cartService.clearCart();
  }, []);

  const getStoreCart = useCallback(
    (sellerId: string) => {
      return cart.stores.find((s) => s.sellerId === sellerId);
    },
    [cart],
  );

  const getStoreItemCount = useCallback((sellerId: string) => {
    return cartService.getStoreItemCount(sellerId);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        totalItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearStoreCart,
        clearCart,
        getStoreCart,
        getStoreItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
