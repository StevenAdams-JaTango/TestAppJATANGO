import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/query-client";
import { Cart, CartItem, StoreCart } from "@/types/cart";
import { Product, ColorVariant, SizeVariant, ProductVariant } from "@/types";

const RESERVATION_HOURS = 6;

class CartService {
  private cart: Cart = { stores: [], updatedAt: Date.now() };
  private listeners: Set<(cart: Cart) => void> = new Set();
  private userId: string | null = null;
  private authSubscription: { unsubscribe: () => void } | null = null;

  private async ensureUserId(): Promise<string | null> {
    if (this.userId) return this.userId;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const sessionUserId = session?.user?.id ?? null;
      console.log("[CartService] ensureUserId getSession user:", sessionUserId);
      if (sessionUserId) {
        this.userId = sessionUserId;
        return sessionUserId;
      }
    } catch {
      // ignore
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id ?? null;
      console.log("[CartService] ensureUserId getUser user:", userId);
      if (userId) {
        this.userId = userId;
        return userId;
      }
    } catch {
      // ignore
    }

    return null;
  }

  async initialize(): Promise<Cart> {
    try {
      console.log("[CartService] Initializing cart...");

      if (!this.authSubscription) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          const nextUserId = session?.user?.id ?? null;
          const changed = nextUserId !== this.userId;
          this.userId = nextUserId;

          if (!changed) return;

          if (!this.userId) {
            this.cart = { stores: [], updatedAt: Date.now() };
            this.notifyListeners();
            return;
          }

          this.loadFromDb();
        });

        this.authSubscription = (data as any)?.subscription ?? null;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[CartService] Session error:", sessionError);
        return this.cart;
      }

      if (session?.user?.id) {
        this.userId = session.user.id;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("[CartService] Auth error:", authError);
        return this.cart;
      }

      if (!user) {
        console.log("[CartService] No user logged in, returning empty cart");
        return this.cart;
      }

      console.log("[CartService] User found:", user.id);
      this.userId = user.id;
      await this.loadFromDb();
      console.log(
        "[CartService] Cart loaded with",
        this.cart.stores.length,
        "stores",
      );
    } catch (error) {
      console.error("[CartService] Error initializing cart:", error);
    }
    return this.cart;
  }

  private async loadFromDb(): Promise<void> {
    const userId = await this.ensureUserId();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `
          *,
          products:product_id (
            id, name, price, image, images, description,
            quantity_in_stock, colors, sizes, variants, seller_id
          ),
          profiles:seller_id (
            id, name, avatar_url
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date().toISOString();
      const expiredIds: string[] = [];

      // Group items by seller
      const storeMap = new Map<string, StoreCart>();

      for (const item of (data || []) as any[]) {
        if (!item.products || !item.profiles) continue;

        // Skip and collect expired show reservations for deletion
        if (item.reserved_until && item.reserved_until < now) {
          expiredIds.push(item.id);
          continue;
        }

        const sellerId = item.seller_id;
        let storeCart = storeMap.get(sellerId);

        if (!storeCart) {
          storeCart = {
            sellerId,
            sellerName: item.profiles.name || "Unknown Store",
            sellerAvatar: item.profiles.avatar_url,
            items: [],
          };
          storeMap.set(sellerId, storeCart);
        }

        // Reconstruct product from DB data
        const product: Product = {
          id: item.products.id,
          name: item.products.name,
          price: item.products.price,
          image: item.products.image,
          images: item.products.images,
          description: item.products.description,
          quantityInStock: item.products.quantity_in_stock,
          colors: item.products.colors || [],
          sizes: item.products.sizes || [],
          variants: item.products.variants || [],
          sellerId: item.products.seller_id,
          sellerName: item.profiles.name || "Unknown Store",
          sellerAvatar: item.profiles.avatar_url,
        };

        // Reconstruct selected color/size
        const selectedColor = item.selected_color_id
          ? product.colors?.find((c) => c.id === item.selected_color_id)
          : undefined;
        const selectedSize = item.selected_size_id
          ? product.sizes?.find((s) => s.id === item.selected_size_id)
          : undefined;
        const selectedVariant = item.selected_variant_id
          ? product.variants?.find((v) => v.id === item.selected_variant_id)
          : undefined;

        const cartItem: CartItem = {
          id: item.id,
          product,
          quantity: item.quantity,
          selectedColor,
          selectedSize,
          selectedVariant,
          addedAt: new Date(item.created_at).getTime(),
          showId: item.show_id || undefined,
          reservedUntil: item.reserved_until || undefined,
        };

        storeCart.items.push(cartItem);
      }

      this.cart = {
        stores: Array.from(storeMap.values()),
        updatedAt: Date.now(),
      };
      this.notifyListeners();

      // Delete expired show reservations from DB in the background
      if (expiredIds.length > 0) {
        console.log(
          `[CartService] Removing ${expiredIds.length} expired show reservation(s)`,
        );
        supabase
          .from("cart_items")
          .delete()
          .in("id", expiredIds)
          .then(({ error: delError }) => {
            if (delError) {
              console.warn(
                "[CartService] Failed to delete expired reservations:",
                delError,
              );
            }
          });
      }
    } catch (error) {
      console.error("[CartService] Error loading cart from DB:", error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.cart));
  }

  subscribe(listener: (cart: Cart) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCart(): Cart {
    return this.cart;
  }

  private async fetchReservedForProduct(productId: string): Promise<number> {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/reservations/quantities`);
      if (!res.ok) return 0;
      const data = await res.json();
      return (data.reservedQuantities || {})[productId] || 0;
    } catch {
      return 0;
    }
  }

  async checkStock(
    product: Product,
    quantity: number,
    selectedColor?: ColorVariant,
    selectedSize?: SizeVariant,
    selectedVariant?: ProductVariant,
  ): Promise<{ available: boolean; maxQuantity: number; message?: string }> {
    // Get the stock quantity from variant or product
    let stockQuantity =
      selectedVariant?.stockQuantity ??
      selectedColor?.stockQuantity ??
      selectedSize?.stockQuantity ??
      product.quantityInStock ??
      0;

    // Subtract active reservations from other users' show carts
    const reserved = await this.fetchReservedForProduct(product.id);
    if (reserved > 0) {
      stockQuantity = Math.max(0, stockQuantity - reserved);
    }

    // Check existing cart quantity for this item
    const existingCartItem = this.cart.stores
      .flatMap((s) => s.items)
      .find(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor?.id === selectedColor?.id &&
          item.selectedSize?.id === selectedSize?.id,
      );

    const existingQuantity = existingCartItem?.quantity || 0;
    const totalRequested = existingQuantity + quantity;

    if (stockQuantity === 0) {
      return {
        available: false,
        maxQuantity: 0,
        message: "This item is out of stock",
      };
    }

    if (totalRequested > stockQuantity) {
      const canAdd = stockQuantity - existingQuantity;
      return {
        available: canAdd > 0,
        maxQuantity: stockQuantity,
        message:
          canAdd > 0
            ? `Only ${canAdd} more available (${stockQuantity} total in stock)`
            : `Maximum quantity (${stockQuantity}) already in cart`,
      };
    }

    return { available: true, maxQuantity: stockQuantity };
  }

  async addToCart(
    product: Product,
    quantity: number = 1,
    selectedColor?: ColorVariant,
    selectedSize?: SizeVariant,
    selectedVariant?: ProductVariant,
    showId?: string,
  ): Promise<{ success: boolean; message?: string }> {
    console.log("[CartService] addToCart called:", {
      productId: product.id,
      productName: product.name,
      quantity,
      userId: this.userId,
      selectedColor: selectedColor?.name,
      selectedSize: selectedSize?.name,
      showId: showId || null,
    });

    const userId = await this.ensureUserId();
    if (!userId) {
      console.error("[CartService] No userId - user not logged in");
      return { success: false, message: "Please log in to add items to cart" };
    }

    // Check stock availability
    const stockCheck = await this.checkStock(
      product,
      quantity,
      selectedColor,
      selectedSize,
      selectedVariant,
    );

    if (!stockCheck.available) {
      return { success: false, message: stockCheck.message };
    }

    const unitPrice =
      selectedVariant?.price ??
      selectedColor?.price ??
      selectedSize?.price ??
      product.price;

    // Calculate reservation expiry for live show items
    const reservedUntil = showId
      ? new Date(Date.now() + RESERVATION_HOURS * 60 * 60 * 1000).toISOString()
      : null;

    try {
      // Check if item already exists in cart
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .eq("selected_color_id", selectedColor?.id || null)
        .eq("selected_size_id", selectedSize?.id || null)
        .maybeSingle();

      if (existing) {
        // Update quantity (and refresh reservation if from a show)
        const updateData: Record<string, unknown> = {
          quantity: existing.quantity + quantity,
          unit_price: unitPrice,
        };
        if (showId) {
          updateData.show_id = showId;
          updateData.reserved_until = reservedUntil;
        }

        const { error } = await supabase
          .from("cart_items")
          .update(updateData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase.from("cart_items").insert({
          user_id: userId,
          product_id: product.id,
          seller_id: product.sellerId,
          quantity,
          selected_color_id: selectedColor?.id || null,
          selected_color_name: selectedColor?.name || null,
          selected_size_id: selectedSize?.id || null,
          selected_size_name: selectedSize?.name || null,
          selected_variant_id: selectedVariant?.id || null,
          unit_price: unitPrice,
          show_id: showId || null,
          reserved_until: reservedUntil,
        });

        if (error) throw error;
      }

      // Log show cart event for show-level tracking
      if (showId) {
        this.logShowCartEvent(showId, userId, product, unitPrice, quantity, {
          selectedColor,
          selectedSize,
          selectedVariant,
        }).catch((err) =>
          console.warn("[CartService] Failed to log show cart event:", err),
        );
      }

      await this.loadFromDb();
      return { success: true };
    } catch (error) {
      console.error("[CartService] Error adding to cart:", error);
      return { success: false, message: "Failed to add item to cart" };
    }
  }

  private async logShowCartEvent(
    showId: string,
    userId: string,
    product: Product,
    unitPrice: number,
    quantity: number,
    options: {
      selectedColor?: ColorVariant;
      selectedSize?: SizeVariant;
      selectedVariant?: ProductVariant;
      eventType?: string;
    },
  ): Promise<void> {
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/shows/${showId}/cart-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId: product.id,
          sellerId: product.sellerId,
          quantity,
          unitPrice,
          selectedColorId: options.selectedColor?.id,
          selectedColorName: options.selectedColor?.name,
          selectedSizeId: options.selectedSize?.id,
          selectedSizeName: options.selectedSize?.name,
          selectedVariantId: options.selectedVariant?.id,
          eventType: options.eventType || "add",
        }),
      });
    } catch (err) {
      console.warn("[CartService] Show cart event logging failed:", err);
    }
  }

  async updateQuantity(
    sellerId: string,
    cartItemId: string,
    quantity: number,
  ): Promise<{ success: boolean; message?: string }> {
    const userId = await this.ensureUserId();
    if (!userId) return { success: false, message: "Please log in" };

    if (quantity <= 0) {
      return this.removeItem(sellerId, cartItemId);
    }

    // Find the cart item to check stock
    const cartItem = this.cart.stores
      .flatMap((s) => s.items)
      .find((i) => i.id === cartItemId);

    if (cartItem) {
      const stockQuantity =
        cartItem.selectedVariant?.stockQuantity ??
        cartItem.selectedColor?.stockQuantity ??
        cartItem.selectedSize?.stockQuantity ??
        cartItem.product.quantityInStock ??
        0;

      if (quantity > stockQuantity) {
        return {
          success: false,
          message: `Only ${stockQuantity} available in stock`,
        };
      }
    }

    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", cartItemId)
        .eq("user_id", userId);

      if (error) throw error;

      await this.loadFromDb();
      return { success: true };
    } catch (error) {
      console.error("[CartService] Error updating quantity:", error);
      return { success: false, message: "Failed to update quantity" };
    }
  }

  async removeItem(
    sellerId: string,
    cartItemId: string,
  ): Promise<{ success: boolean; message?: string }> {
    const userId = await this.ensureUserId();
    if (!userId) return { success: false, message: "Please log in" };

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId)
        .eq("user_id", userId);

      if (error) throw error;

      await this.loadFromDb();
      return { success: true };
    } catch (error) {
      console.error("[CartService] Error removing item:", error);
      return { success: false, message: "Failed to remove item" };
    }
  }

  async clearStoreCart(
    sellerId: string,
  ): Promise<{ success: boolean; message?: string }> {
    const userId = await this.ensureUserId();
    if (!userId) return { success: false, message: "Please log in" };

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .eq("seller_id", sellerId);

      if (error) throw error;

      await this.loadFromDb();
      return { success: true };
    } catch (error) {
      console.error("[CartService] Error clearing store cart:", error);
      return { success: false, message: "Failed to clear cart" };
    }
  }

  async clearCart(): Promise<{ success: boolean; message?: string }> {
    const userId = await this.ensureUserId();
    if (!userId) return { success: false, message: "Please log in" };

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      this.cart = { stores: [], updatedAt: Date.now() };
      this.notifyListeners();
      return { success: true };
    } catch (error) {
      console.error("[CartService] Error clearing cart:", error);
      return { success: false, message: "Failed to clear cart" };
    }
  }

  getTotalItems(): number {
    return this.cart.stores.reduce(
      (total, store) =>
        total + store.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    );
  }

  getStoreItemCount(sellerId: string): number {
    const store = this.cart.stores.find((s) => s.sellerId === sellerId);
    if (!store) return 0;
    return store.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

export const cartService = new CartService();
