import { getApiUrl } from "@/lib/query-client";
import { Cart } from "@/types/cart";
import { Order, OrderItem } from "@/types";

interface CartItemPayload {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  selectedColorId?: string;
  selectedColorName?: string;
  selectedSizeId?: string;
  selectedSizeName?: string;
  selectedVariantId?: string;
  showId?: string;
}

interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  ephemeralKey: string;
  customerId: string;
  amount: number;
}

interface ConfirmOrderResponse {
  orderId: string;
  status: string;
  totalAmount: number;
}

function cartToPayload(cart: Cart): CartItemPayload[] {
  const items: CartItemPayload[] = [];
  for (const store of cart.stores) {
    for (const item of store.items) {
      const unitPrice =
        item.selectedVariant?.price ??
        item.selectedColor?.price ??
        item.selectedSize?.price ??
        item.product.price;

      items.push({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.image,
        sellerId: store.sellerId,
        quantity: item.quantity,
        unitPrice,
        selectedColorId: item.selectedColor?.id,
        selectedColorName: item.selectedColor?.name,
        selectedSizeId: item.selectedSize?.id,
        selectedSizeName: item.selectedSize?.name,
        selectedVariantId: item.selectedVariant?.id,
        showId: item.showId,
      });
    }
  }
  return items;
}

export const checkoutService = {
  /**
   * Convert cart to the payload format used by the backend.
   */
  getCartPayload: cartToPayload,

  /**
   * Create a Stripe PaymentIntent for the current cart.
   */
  async createPaymentIntent(
    cart: Cart,
    userId: string,
    email?: string,
    shippingCost?: number,
  ): Promise<CreatePaymentIntentResponse> {
    const items = cartToPayload(cart);
    const baseUrl = getApiUrl();
    const url = `${baseUrl}/api/checkout/create-payment-intent`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, userId, email, shippingCost }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Payment failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Confirm the order after successful Stripe payment.
   */
  async confirmOrder(
    paymentIntentId: string,
    cart: Cart,
    userId: string,
    shippingAddress?: Record<string, any>,
    shippingCost?: number,
    shippingCarrier?: string,
    shippingServiceName?: string,
  ): Promise<ConfirmOrderResponse> {
    const items = cartToPayload(cart);
    const baseUrl = getApiUrl();
    const url = `${baseUrl}/api/checkout/confirm`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId,
        userId,
        items,
        shippingAddress,
        shippingCost,
        shippingCarrier,
        shippingService: shippingServiceName,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Order confirmation failed (${res.status})`,
      );
    }

    return res.json();
  },

  /**
   * Pay with a saved card (server-side confirmation, used on web).
   */
  async payWithSavedCard(
    cart: Cart,
    userId: string,
    paymentMethodId: string,
    email?: string,
    shippingAddress?: Record<string, any>,
    shippingCost?: number,
    shippingCarrier?: string,
    shippingServiceName?: string,
  ): Promise<ConfirmOrderResponse & { paymentIntentId: string }> {
    const items = cartToPayload(cart);
    const baseUrl = getApiUrl();
    const url = `${baseUrl}/api/checkout/pay-with-saved-card`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        userId,
        email,
        paymentMethodId,
        shippingAddress,
        shippingCost,
        shippingCarrier,
        shippingService: shippingServiceName,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Payment failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Fetch orders for a user from the backend.
   */
  async fetchOrders(userId: string): Promise<Order[]> {
    const baseUrl = getApiUrl();
    const url = `${baseUrl}/api/orders/${userId}`;

    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to fetch orders (${res.status})`);
    }

    const data = await res.json();
    const orders: Order[] = (data.orders || []).map((o: any) => ({
      id: o.id,
      userId: o.user_id,
      stripePaymentIntentId: o.stripe_payment_intent_id,
      status: o.status,
      totalAmount: parseFloat(o.total_amount),
      currency: o.currency,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      paymentCard: o.payment_card || null,
      sellerNames: o.seller_names || {},
      shippingAddress: o.shipping_address || null,
      shippingCost: o.shipping_cost ? parseFloat(o.shipping_cost) : undefined,
      shippingCarrier: o.shipping_carrier || undefined,
      shippingService: o.shipping_service || undefined,
      trackingNumber: o.tracking_number || undefined,
      labelUrl: o.label_url || undefined,
      sellerId: o.seller_id || undefined,
      items: (o.order_items || []).map((i: any) => ({
        id: i.id,
        orderId: i.order_id,
        productId: i.product_id,
        sellerId: i.seller_id,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unit_price),
        selectedColorId: i.selected_color_id,
        selectedColorName: i.selected_color_name,
        selectedSizeId: i.selected_size_id,
        selectedSizeName: i.selected_size_name,
        selectedVariantId: i.selected_variant_id,
        productName: i.product_name,
        productImage: i.product_image,
        createdAt: i.created_at,
      })) as OrderItem[],
    }));

    return orders;
  },
};
