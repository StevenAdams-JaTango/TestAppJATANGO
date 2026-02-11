import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[Payments] WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Using anon key — RLS may block server-side profile updates. " +
      "Add SUPABASE_SERVICE_ROLE_KEY to your .env for full functionality.",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

/**
 * Get or create a Stripe Customer for a user.
 * Stores the stripe_customer_id in the profiles table.
 */
async function getOrCreateStripeCustomer(
  userId: string,
  email?: string,
): Promise<string> {
  // Check if user already has a Stripe Customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, name")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Check if a Stripe Customer already exists via metadata (in case profile update was blocked by RLS)
  const existing = await stripe.customers.search({
    query: `metadata["supabase_user_id"]:"${userId}"`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    const existingId = existing.data[0].id;
    // Try to backfill the profile
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: existingId })
      .eq("id", userId);
    return existingId;
  }

  // Create a new Stripe Customer
  const customer = await stripe.customers.create({
    email: email || profile?.email || undefined,
    name: profile?.name || undefined,
    metadata: { supabase_user_id: userId },
  });

  // Save the customer ID to the profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  if (updateError) {
    console.error(
      `[Payments] Failed to save stripe_customer_id for user ${userId}:`,
      updateError.message,
    );
  } else {
    console.log(
      `[Payments] Created Stripe Customer ${customer.id} for user ${userId}`,
    );
  }

  return customer.id;
}

// Sales tax rate (8%) — adjust per jurisdiction as needed
const SALES_TAX_RATE = 0.08;

export function registerPaymentRoutes(app: Express) {
  /**
   * POST /api/checkout/create-payment-intent
   * Creates a Stripe PaymentIntent for the given cart items.
   * Attaches Stripe Customer so saved cards appear in PaymentSheet.
   */
  app.post(
    "/api/checkout/create-payment-intent",
    async (req: Request, res: Response) => {
      try {
        const { items, userId, email, shippingCost } = req.body as {
          items: CartItemPayload[];
          userId: string;
          email?: string;
          shippingCost?: number;
        };

        if (!items || items.length === 0) {
          return res.status(400).json({ error: "No items provided" });
        }

        if (!userId) {
          return res.status(400).json({ error: "No userId provided" });
        }

        // Get or create Stripe Customer
        const customerId = await getOrCreateStripeCustomer(userId, email);

        // Create ephemeral key for the customer (needed by PaymentSheet)
        const ephemeralKey = await stripe.ephemeralKeys.create(
          { customer: customerId },
          { apiVersion: "2026-01-28.clover" },
        );

        // Calculate subtotal server-side from the items
        let subtotal = 0;
        for (const item of items) {
          subtotal += item.unitPrice * item.quantity;
        }

        // Calculate sales tax
        const salesTax = Math.round(subtotal * SALES_TAX_RATE * 100) / 100;
        const shipping = shippingCost || 0;
        const totalAmount =
          Math.round((subtotal + salesTax + shipping) * 100) / 100;

        // Stripe expects amount in cents
        const amountInCents = Math.round(totalAmount * 100);

        if (amountInCents < 50) {
          return res
            .status(400)
            .json({ error: "Order total must be at least $0.50" });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          customer: customerId,
          setup_future_usage: "off_session",
          metadata: {
            userId,
            itemCount: items.length.toString(),
            subtotal: subtotal.toFixed(2),
            salesTax: salesTax.toFixed(2),
            taxRate: SALES_TAX_RATE.toString(),
          },
        });

        console.log(
          `[Payments] Created PaymentIntent ${paymentIntent.id} for $${totalAmount.toFixed(2)} (subtotal: $${subtotal.toFixed(2)}, tax: $${salesTax.toFixed(2)}, customer: ${customerId})`,
        );

        return res.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          ephemeralKey: ephemeralKey.secret,
          customerId,
          amount: totalAmount,
          subtotal,
          salesTax,
          taxRate: SALES_TAX_RATE,
        });
      } catch (error: any) {
        console.error("[Payments] Error creating PaymentIntent:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to create payment intent" });
      }
    },
  );

  /**
   * POST /api/checkout/confirm
   * After successful payment, creates order rows and clears cart.
   */
  app.post("/api/checkout/confirm", async (req: Request, res: Response) => {
    try {
      const {
        paymentIntentId,
        userId,
        items,
        shippingAddress,
        shippingCost,
        shippingCarrier,
        shippingService,
      } = req.body as {
        paymentIntentId: string;
        userId: string;
        items: CartItemPayload[];
        shippingAddress?: Record<string, any>;
        shippingCost?: number;
        shippingCarrier?: string;
        shippingService?: string;
      };

      if (!paymentIntentId || !userId || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify payment succeeded with Stripe
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({
          error: `Payment not completed. Status: ${paymentIntent.status}`,
        });
      }

      const totalAmount = paymentIntent.amount / 100;
      const metaSubtotal = paymentIntent.metadata?.subtotal;
      const metaTax = paymentIntent.metadata?.salesTax;
      const metaRate = paymentIntent.metadata?.taxRate;
      const subtotal = parseFloat(metaSubtotal || "0") || totalAmount;
      const salesTax = parseFloat(metaTax || "0") || 0;
      const taxRate = parseFloat(metaRate || "0") || 0;

      // Determine show_id if any items came from a live show
      const showId = items.find((i) => i.showId)?.showId || null;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          stripe_payment_intent_id: paymentIntentId,
          status: "paid",
          total_amount: totalAmount,
          subtotal,
          sales_tax: salesTax,
          tax_rate: taxRate,
          currency: "usd",
          shipping_address: shippingAddress || null,
          show_id: showId,
          shipping_cost: shippingCost || 0,
          shipping_carrier: shippingCarrier || null,
          shipping_service: shippingService || null,
          seller_id: items[0]?.sellerId || null,
        })
        .select("id")
        .single();

      if (orderError) {
        console.error("[Payments] Error creating order:", orderError);
        return res.status(500).json({ error: "Failed to create order" });
      }

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        seller_id: item.sellerId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        selected_color_id: item.selectedColorId || null,
        selected_color_name: item.selectedColorName || null,
        selected_size_id: item.selectedSizeId || null,
        selected_size_name: item.selectedSizeName || null,
        selected_variant_id: item.selectedVariantId || null,
        product_name: item.productName,
        product_image: item.productImage || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("[Payments] Error creating order items:", itemsError);
        // Order was created but items failed — log but don't fail the whole thing
      }

      // Decrement stock for each item
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("quantity_in_stock")
          .eq("id", item.productId)
          .single();

        if (product) {
          const newStock = Math.max(
            0,
            (product.quantity_in_stock || 0) - item.quantity,
          );
          await supabase
            .from("products")
            .update({ quantity_in_stock: newStock })
            .eq("id", item.productId);
        }
      }

      // Clear purchased cart items
      const cartItemIds = items.map((i) => i.id).filter(Boolean);
      if (cartItemIds.length > 0) {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", userId)
          .in("id", cartItemIds);
      }

      console.log(
        `[Payments] Order ${order.id} confirmed for user ${userId} ($${totalAmount.toFixed(2)})`,
      );

      return res.json({
        orderId: order.id,
        status: "paid",
        totalAmount,
      });
    } catch (error: any) {
      console.error("[Payments] Error confirming order:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to confirm order" });
    }
  });

  /**
   * POST /api/checkout/pay-with-saved-card
   * Charges a saved payment method server-side (for web checkout).
   * Creates PaymentIntent, confirms it immediately, then creates the order.
   */
  app.post(
    "/api/checkout/pay-with-saved-card",
    async (req: Request, res: Response) => {
      try {
        const {
          items,
          userId,
          email,
          paymentMethodId,
          shippingAddress,
          shippingCost,
          shippingCarrier,
          shippingService,
        } = req.body as {
          items: CartItemPayload[];
          userId: string;
          email?: string;
          paymentMethodId: string;
          shippingAddress?: Record<string, any>;
          shippingCost?: number;
          shippingCarrier?: string;
          shippingService?: string;
        };

        if (!items || items.length === 0) {
          return res.status(400).json({ error: "No items provided" });
        }
        if (!userId) {
          return res.status(400).json({ error: "No userId provided" });
        }
        if (!paymentMethodId) {
          return res.status(400).json({ error: "No paymentMethodId provided" });
        }

        const customerId = await getOrCreateStripeCustomer(userId, email);

        // Calculate subtotal + sales tax + shipping
        let subtotal = 0;
        for (const item of items) {
          subtotal += item.unitPrice * item.quantity;
        }
        const salesTax = Math.round(subtotal * SALES_TAX_RATE * 100) / 100;
        const shipping = shippingCost || 0;
        const totalAmount =
          Math.round((subtotal + salesTax + shipping) * 100) / 100;
        const amountInCents = Math.round(totalAmount * 100);

        if (amountInCents < 50) {
          return res
            .status(400)
            .json({ error: "Order total must be at least $0.50" });
        }

        // Create and confirm PaymentIntent in one step
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          metadata: {
            userId,
            itemCount: items.length.toString(),
            subtotal: subtotal.toFixed(2),
            salesTax: salesTax.toFixed(2),
            taxRate: SALES_TAX_RATE.toString(),
          },
        });

        if (paymentIntent.status !== "succeeded") {
          return res.status(400).json({
            error: `Payment not completed. Status: ${paymentIntent.status}`,
          });
        }

        console.log(
          `[Payments] Charged saved card for $${totalAmount.toFixed(2)} (subtotal: $${subtotal.toFixed(2)}, tax: $${salesTax.toFixed(2)}, PI: ${paymentIntent.id})`,
        );

        // Determine show_id if any items came from a live show
        const savedCardShowId = items.find((i) => i.showId)?.showId || null;

        // Create order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: userId,
            stripe_payment_intent_id: paymentIntent.id,
            status: "paid",
            total_amount: totalAmount,
            subtotal,
            sales_tax: salesTax,
            tax_rate: SALES_TAX_RATE,
            currency: "usd",
            shipping_address: shippingAddress || null,
            show_id: savedCardShowId,
            shipping_cost: shippingCost || 0,
            shipping_carrier: shippingCarrier || null,
            shipping_service: shippingService || null,
            seller_id: items[0]?.sellerId || null,
          })
          .select("id")
          .single();

        if (orderError) {
          console.error("[Payments] Error creating order:", orderError);
          return res.status(500).json({ error: "Failed to create order" });
        }

        // Create order items
        const orderItems = items.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          seller_id: item.sellerId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          selected_color_id: item.selectedColorId || null,
          selected_color_name: item.selectedColorName || null,
          selected_size_id: item.selectedSizeId || null,
          selected_size_name: item.selectedSizeName || null,
          selected_variant_id: item.selectedVariantId || null,
          product_name: item.productName,
          product_image: item.productImage || null,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("[Payments] Error creating order items:", itemsError);
        }

        // Decrement stock
        for (const item of items) {
          const { data: product } = await supabase
            .from("products")
            .select("quantity_in_stock")
            .eq("id", item.productId)
            .single();

          if (product) {
            const newStock = Math.max(
              0,
              (product.quantity_in_stock || 0) - item.quantity,
            );
            await supabase
              .from("products")
              .update({ quantity_in_stock: newStock })
              .eq("id", item.productId);
          }
        }

        // Clear purchased cart items
        const cartItemIds = items.map((i) => i.id).filter(Boolean);
        if (cartItemIds.length > 0) {
          await supabase
            .from("cart_items")
            .delete()
            .eq("user_id", userId)
            .in("id", cartItemIds);
        }

        console.log(
          `[Payments] Order ${order.id} created via saved card for user ${userId}`,
        );

        return res.json({
          orderId: order.id,
          status: "paid",
          totalAmount,
          paymentIntentId: paymentIntent.id,
        });
      } catch (error: any) {
        console.error("[Payments] Error paying with saved card:", error);

        // Handle Stripe card errors specifically
        if (error.type === "StripeCardError") {
          return res.status(400).json({
            error: error.message || "Your card was declined.",
          });
        }

        return res
          .status(500)
          .json({ error: error.message || "Failed to process payment" });
      }
    },
  );

  /**
   * GET /api/orders/:userId
   * Fetch orders for a user.
   */
  app.get("/api/orders/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (
            *
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Payments] Error fetching orders:", error);
        return res.status(500).json({ error: "Failed to fetch orders" });
      }

      // Enrich orders with payment card info and seller names
      const enrichedOrders = await Promise.all(
        (orders || []).map(async (order: any) => {
          // Fetch payment method details from Stripe
          let paymentCard: {
            brand: string;
            last4: string;
            expMonth: number;
            expYear: number;
          } | null = null;

          if (order.stripe_payment_intent_id) {
            try {
              const pi = await stripe.paymentIntents.retrieve(
                order.stripe_payment_intent_id,
              );
              if (pi.payment_method && typeof pi.payment_method === "string") {
                const pm = await stripe.paymentMethods.retrieve(
                  pi.payment_method,
                );
                if (pm.card) {
                  paymentCard = {
                    brand: pm.card.brand,
                    last4: pm.card.last4,
                    expMonth: pm.card.exp_month,
                    expYear: pm.card.exp_year,
                  };
                }
              }
            } catch {
              console.warn(
                "[Payments] Could not fetch payment method for order:",
                order.id,
              );
            }
          }

          // Get unique seller IDs from order items
          const sellerIds = [
            ...new Set((order.order_items || []).map((i: any) => i.seller_id)),
          ].filter(Boolean);

          let sellerNames: Record<string, string> = {};
          if (sellerIds.length > 0) {
            const { data: sellers } = await supabase
              .from("profiles")
              .select("id, name, store_name")
              .in("id", sellerIds);

            if (sellers) {
              for (const s of sellers) {
                sellerNames[s.id] = s.store_name || s.name || "Unknown Store";
              }
            }
          }

          return {
            ...order,
            payment_card: paymentCard,
            seller_names: sellerNames,
          };
        }),
      );

      return res.json({ orders: enrichedOrders });
    } catch (error: any) {
      console.error("[Payments] Error fetching orders:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to fetch orders" });
    }
  });

  // ─── Stripe Setup Intent (for saving cards without charging) ───

  /**
   * POST /api/stripe/setup-intent
   * Creates a SetupIntent so the user can save a card for future use.
   */
  app.post("/api/stripe/setup-intent", async (req: Request, res: Response) => {
    try {
      const { userId, email } = req.body as {
        userId: string;
        email?: string;
      };

      if (!userId) {
        return res.status(400).json({ error: "No userId provided" });
      }

      const customerId = await getOrCreateStripeCustomer(userId, email);

      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: "2026-01-28.clover" },
      );

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: "off_session",
      });

      console.log(
        `[Payments] Created SetupIntent ${setupIntent.id} for customer ${customerId}`,
      );

      return res.json({
        clientSecret: setupIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customerId,
      });
    } catch (error: any) {
      console.error("[Payments] Error creating SetupIntent:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to create setup intent" });
    }
  });

  // ─── Saved Payment Methods ───

  /**
   * GET /api/stripe/payment-methods/:userId
   * Lists saved payment methods for a user.
   */
  app.get(
    "/api/stripe/payment-methods/:userId",
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;

        // Get the Stripe Customer ID from the profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", userId)
          .single();

        let customerId = profile?.stripe_customer_id;

        // Fallback: if stripe_customer_id isn't stored (e.g. RLS blocked the update),
        // search Stripe directly by metadata
        if (!customerId) {
          console.log(
            `[Payments] No stripe_customer_id in profile for user ${userId}, searching Stripe...`,
          );
          const customers = await stripe.customers.search({
            query: `metadata["supabase_user_id"]:"${userId}"`,
            limit: 1,
          });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            // Try to backfill the profile
            await supabase
              .from("profiles")
              .update({ stripe_customer_id: customerId })
              .eq("id", userId);
            console.log(
              `[Payments] Found Stripe customer ${customerId} via metadata search`,
            );
          } else {
            return res.json({ paymentMethods: [] });
          }
        }

        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });

        const cards = paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand || "unknown",
          last4: pm.card?.last4 || "****",
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: false,
        }));

        // Check which is the default payment method
        const customer = await stripe.customers.retrieve(customerId);
        if (
          customer &&
          !customer.deleted &&
          customer.invoice_settings?.default_payment_method
        ) {
          const defaultId = customer.invoice_settings
            .default_payment_method as string;
          const defaultCard = cards.find((c) => c.id === defaultId);
          if (defaultCard) defaultCard.isDefault = true;
        }

        return res.json({ paymentMethods: cards });
      } catch (error: any) {
        console.error("[Payments] Error fetching payment methods:", error);
        return res.status(500).json({
          error: error.message || "Failed to fetch payment methods",
        });
      }
    },
  );

  /**
   * DELETE /api/stripe/payment-methods/:paymentMethodId
   * Detaches a saved payment method from the customer.
   */
  app.delete(
    "/api/stripe/payment-methods/:paymentMethodId",
    async (req: Request, res: Response) => {
      try {
        const paymentMethodId = req.params.paymentMethodId as string;

        await stripe.paymentMethods.detach(paymentMethodId);

        console.log(`[Payments] Detached payment method ${paymentMethodId}`);

        return res.json({ success: true });
      } catch (error: any) {
        console.error("[Payments] Error detaching payment method:", error);
        return res.status(500).json({
          error: error.message || "Failed to remove payment method",
        });
      }
    },
  );

  // ─── Shipping Addresses ───

  /**
   * GET /api/addresses/:userId
   * List user's shipping addresses.
   */
  app.get("/api/addresses/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { data: addresses, error } = await supabase
        .from("shipping_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Payments] Error fetching addresses:", error);
        return res.status(500).json({ error: "Failed to fetch addresses" });
      }

      return res.json({ addresses: addresses || [] });
    } catch (error: any) {
      console.error("[Payments] Error fetching addresses:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to fetch addresses" });
    }
  });

  /**
   * POST /api/addresses
   * Create a new shipping address.
   */
  app.post("/api/addresses", async (req: Request, res: Response) => {
    try {
      const {
        userId,
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        country,
        phone,
        isDefault,
      } = req.body;

      if (!userId || !name || !addressLine1 || !city || !state || !zip) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { data: address, error } = await supabase
        .from("shipping_addresses")
        .insert({
          user_id: userId,
          name,
          address_line1: addressLine1,
          address_line2: addressLine2 || null,
          city,
          state,
          zip,
          country: country || "US",
          phone: phone || null,
          is_default: isDefault || false,
        })
        .select()
        .single();

      if (error) {
        console.error("[Payments] Error creating address:", error);
        return res.status(500).json({ error: "Failed to create address" });
      }

      return res.json({ address });
    } catch (error: any) {
      console.error("[Payments] Error creating address:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to create address" });
    }
  });

  /**
   * PUT /api/addresses/:addressId
   * Update a shipping address.
   */
  app.put("/api/addresses/:addressId", async (req: Request, res: Response) => {
    try {
      const { addressId } = req.params;
      const {
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        country,
        phone,
        isDefault,
      } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (addressLine1 !== undefined) updateData.address_line1 = addressLine1;
      if (addressLine2 !== undefined)
        updateData.address_line2 = addressLine2 || null;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;
      if (zip !== undefined) updateData.zip = zip;
      if (country !== undefined) updateData.country = country;
      if (phone !== undefined) updateData.phone = phone || null;
      if (isDefault !== undefined) updateData.is_default = isDefault;

      const { data: address, error } = await supabase
        .from("shipping_addresses")
        .update(updateData)
        .eq("id", addressId)
        .select()
        .single();

      if (error) {
        console.error("[Payments] Error updating address:", error);
        return res.status(500).json({ error: "Failed to update address" });
      }

      return res.json({ address });
    } catch (error: any) {
      console.error("[Payments] Error updating address:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to update address" });
    }
  });

  /**
   * DELETE /api/addresses/:addressId
   * Delete a shipping address.
   */
  app.delete(
    "/api/addresses/:addressId",
    async (req: Request, res: Response) => {
      try {
        const { addressId } = req.params;

        const { error } = await supabase
          .from("shipping_addresses")
          .delete()
          .eq("id", addressId);

        if (error) {
          console.error("[Payments] Error deleting address:", error);
          return res.status(500).json({ error: "Failed to delete address" });
        }

        return res.json({ success: true });
      } catch (error: any) {
        console.error("[Payments] Error deleting address:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to delete address" });
      }
    },
  );

  /**
   * PUT /api/addresses/:addressId/default
   * Set an address as the default.
   */
  app.put(
    "/api/addresses/:addressId/default",
    async (req: Request, res: Response) => {
      try {
        const { addressId } = req.params;

        const { data: address, error } = await supabase
          .from("shipping_addresses")
          .update({ is_default: true })
          .eq("id", addressId)
          .select()
          .single();

        if (error) {
          console.error("[Payments] Error setting default address:", error);
          return res
            .status(500)
            .json({ error: "Failed to set default address" });
        }

        return res.json({ address });
      } catch (error: any) {
        console.error("[Payments] Error setting default address:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to set default address" });
      }
    },
  );
}
