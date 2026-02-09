import type { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!hasServiceKey) {
  console.warn(
    "[Shows] ⚠️  SUPABASE_SERVICE_ROLE_KEY not set — using anon key. " +
      "RLS may block server-side queries. Set SUPABASE_SERVICE_ROLE_KEY in .env",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export function registerShowRoutes(app: Express) {
  /**
   * GET /api/shows/:showId/summary
   * Returns sales summary for a show (for the host).
   */
  app.get(
    "/api/shows/:showId/summary",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { showId } = req.params;
        console.log("[Shows] Fetching summary for showId:", showId);

        // Get show info
        const { data: show, error: showError } = await supabase
          .from("shows")
          .select(
            "id, title, thumbnail_url, status, started_at, ended_at, seller_id",
          )
          .eq("id", showId)
          .single();

        if (showError || !show) {
          console.error(
            "[Shows] Show not found:",
            showId,
            "error:",
            showError?.message || showError,
            "code:",
            showError?.code,
            "usingServiceKey:",
            hasServiceKey,
          );
          res.status(404).json({ error: "Show not found" });
          return;
        }
        console.log("[Shows] Found show:", show.id, "status:", show.status);

        // Get orders placed during this show
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select(
            `
            id, user_id, total_amount, subtotal, sales_tax, status, created_at,
            order_items (
              id, product_id, product_name, product_image,
              quantity, unit_price, seller_id,
              selected_color_name, selected_size_name
            )
          `,
          )
          .eq("show_id", showId)
          .eq("status", "paid")
          .order("created_at", { ascending: false });

        if (ordersError) {
          console.error("[Shows] Error fetching show orders:", ordersError);
          res.status(500).json({ error: "Failed to fetch show orders" });
          return;
        }

        // Get cart activity events for this show
        const { data: cartEvents, error: eventsError } = await supabase
          .from("show_cart_events")
          .select("id, user_id, product_id, quantity, event_type, created_at")
          .eq("show_id", showId)
          .order("created_at", { ascending: false });

        if (eventsError) {
          console.error("[Shows] Error fetching cart events:", eventsError);
        }

        // Get active reservations (not yet expired, not yet purchased)
        const { data: activeReservations, error: reservationsError } =
          await supabase
            .from("cart_items")
            .select(
              "id, user_id, product_id, quantity, unit_price, reserved_until",
            )
            .eq("show_id", showId)
            .gt("reserved_until", new Date().toISOString());

        if (reservationsError) {
          console.error(
            "[Shows] Error fetching reservations:",
            reservationsError,
          );
        }

        // Aggregate product-level stats from orders
        const productMap = new Map<
          string,
          {
            productId: string;
            productName: string;
            productImage: string | null;
            quantitySold: number;
            revenue: number;
            uniqueBuyers: Set<string>;
          }
        >();

        const uniqueBuyers = new Set<string>();
        let totalRevenue = 0;
        let totalItemsSold = 0;
        let totalSalesTax = 0;

        for (const order of orders || []) {
          uniqueBuyers.add(order.user_id);
          const subtotal = parseFloat(order.subtotal || order.total_amount);
          const tax = parseFloat(order.sales_tax || "0");
          totalRevenue += subtotal;
          totalSalesTax += tax;

          for (const item of (order as any).order_items || []) {
            totalItemsSold += item.quantity;

            const existing = productMap.get(item.product_id);
            if (existing) {
              existing.quantitySold += item.quantity;
              existing.revenue += parseFloat(item.unit_price) * item.quantity;
              existing.uniqueBuyers.add(order.user_id);
            } else {
              const buyers = new Set<string>();
              buyers.add(order.user_id);
              productMap.set(item.product_id, {
                productId: item.product_id,
                productName: item.product_name,
                productImage: item.product_image,
                quantitySold: item.quantity,
                revenue: parseFloat(item.unit_price) * item.quantity,
                uniqueBuyers: buyers,
              });
            }
          }
        }

        const productBreakdown = Array.from(productMap.values()).map((p) => ({
          productId: p.productId,
          productName: p.productName,
          productImage: p.productImage,
          quantitySold: p.quantitySold,
          revenue: p.revenue,
          uniqueBuyers: p.uniqueBuyers.size,
        }));

        // Sort by revenue descending
        productBreakdown.sort((a, b) => b.revenue - a.revenue);

        // Count add-to-cart events
        const addToCartCount = (cartEvents || []).filter(
          (e) => e.event_type === "add",
        ).length;
        const uniqueCartUsers = new Set(
          (cartEvents || []).map((e) => e.user_id),
        ).size;

        // Calculate fees breakdown (matching JaTango web)
        const orderCount = (orders || []).length;
        const grossSales = totalRevenue; // subtotal-based, already excludes tax
        const shippingTotal = 0; // TODO: pull from orders when shipping costs are tracked
        const salesTax = Math.round(totalSalesTax * 100) / 100;
        const jatangoFee = grossSales * 0.055; // 5.5%
        const processingFee = grossSales * 0.029 + orderCount * 0.3; // 2.9% + 30¢/order
        const netSales =
          grossSales - shippingTotal - jatangoFee - processingFee;
        res.json({
          show: {
            id: show.id,
            title: show.title,
            thumbnailUrl: show.thumbnail_url,
            status: show.status,
            startedAt: show.started_at,
            endedAt: show.ended_at,
          },
          summary: {
            totalOrders: orderCount,
            uniqueBuyers: uniqueBuyers.size,
            totalRevenue,
            totalItemsSold,
            uniqueProductsSold: productMap.size,
            addToCartEvents: addToCartCount,
            uniqueCartUsers,
            activeReservations: (activeReservations || []).length,
          },
          feesBreakdown: {
            grossSales: Math.round(grossSales * 100) / 100,
            shippingTotal: Math.round(shippingTotal * 100) / 100,
            salesTax: Math.round(salesTax * 100) / 100,
            jatangoFee: Math.round(jatangoFee * 100) / 100,
            jatangoFeeRate: "5.5%",
            processingFee: Math.round(processingFee * 100) / 100,
            processingFeeRate: "2.9% + 30¢ per Order",
            netSales: Math.round(netSales * 100) / 100,
          },
          productBreakdown,
          recentOrders: (orders || []).slice(0, 20).map((o: any) => ({
            id: o.id,
            userId: o.user_id,
            totalAmount: parseFloat(o.total_amount),
            createdAt: o.created_at,
            items: (o.order_items || []).map((i: any) => ({
              productName: i.product_name,
              productImage: i.product_image,
              quantity: i.quantity,
              unitPrice: parseFloat(i.unit_price),
              colorName: i.selected_color_name,
              sizeName: i.selected_size_name,
            })),
          })),
        });
      } catch (error: any) {
        console.error("[Shows] Error fetching show summary:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to fetch show summary" });
      }
    },
  );

  /**
   * POST /api/shows/:showId/cart-event
   * Logs a cart event (add/remove) for show-level tracking.
   */
  app.post(
    "/api/shows/:showId/cart-event",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { showId } = req.params;
        const {
          userId,
          productId,
          sellerId,
          quantity,
          unitPrice,
          selectedColorId,
          selectedColorName,
          selectedSizeId,
          selectedSizeName,
          selectedVariantId,
          eventType,
        } = req.body;

        if (!userId || !productId || !sellerId) {
          res.status(400).json({ error: "Missing required fields" });
          return;
        }

        const { error } = await supabase.from("show_cart_events").insert({
          show_id: showId,
          user_id: userId,
          product_id: productId,
          seller_id: sellerId,
          quantity: quantity || 1,
          unit_price: unitPrice || 0,
          selected_color_id: selectedColorId || null,
          selected_color_name: selectedColorName || null,
          selected_size_id: selectedSizeId || null,
          selected_size_name: selectedSizeName || null,
          selected_variant_id: selectedVariantId || null,
          event_type: eventType || "add",
        });

        if (error) {
          console.error("[Shows] Error logging cart event:", error);
          res.status(500).json({ error: "Failed to log cart event" });
          return;
        }

        res.json({ success: true });
      } catch (error: any) {
        console.error("[Shows] Error logging cart event:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to log cart event" });
      }
    },
  );

  /**
   * POST /api/shows/:showId/cleanup-reservations
   * Manually trigger cleanup of expired reservations for a show.
   */
  app.post(
    "/api/shows/:showId/cleanup-reservations",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { showId } = req.params;

        const { error } = await supabase
          .from("cart_items")
          .delete()
          .eq("show_id", showId)
          .lt("reserved_until", new Date().toISOString());

        if (error) {
          console.error("[Shows] Error cleaning up reservations:", error);
          res.status(500).json({ error: "Failed to cleanup reservations" });
          return;
        }

        console.log(
          `[Shows] Cleaned up expired reservations for show ${showId}`,
        );
        res.json({ success: true });
      } catch (error: any) {
        console.error("[Shows] Error cleaning up reservations:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to cleanup reservations" });
      }
    },
  );

  /**
   * GET /api/reservations/quantities
   * Returns a map of product_id -> reserved_quantity for all active reservations.
   * Used by the client to subtract from displayed stock.
   */
  app.get(
    "/api/reservations/quantities",
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const { data, error } = await supabase.rpc(
          "get_all_reserved_quantities",
        );

        if (error) {
          // Fallback: query cart_items directly if RPC not available
          const { data: cartData, error: cartError } = await supabase
            .from("cart_items")
            .select("product_id, quantity")
            .not("reserved_until", "is", null)
            .gt("reserved_until", new Date().toISOString());

          if (cartError) {
            console.error(
              "[Shows] Error fetching reserved quantities:",
              cartError,
            );
            res.json({ reservedQuantities: {} });
            return;
          }

          // Aggregate by product_id
          const quantities: Record<string, number> = {};
          for (const item of cartData || []) {
            const pid = item.product_id;
            quantities[pid] = (quantities[pid] || 0) + item.quantity;
          }

          res.json({ reservedQuantities: quantities });
          return;
        }

        // RPC returns array of { product_id, reserved_qty }
        const quantities: Record<string, number> = {};
        for (const row of data || []) {
          quantities[row.product_id] = row.reserved_qty;
        }

        res.json({ reservedQuantities: quantities });
      } catch (error: any) {
        console.error("[Shows] Error fetching reserved quantities:", error);
        res.json({ reservedQuantities: {} });
      }
    },
  );

  /**
   * GET /api/shows/:showId/reservations
   * Get active reservation count and details for a show.
   */
  app.get(
    "/api/shows/:showId/reservations",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { showId } = req.params;

        const { data, error } = await supabase
          .from("cart_items")
          .select(
            `
            id, user_id, product_id, quantity, unit_price, reserved_until,
            products:product_id (name, image)
          `,
          )
          .eq("show_id", showId)
          .gt("reserved_until", new Date().toISOString());

        if (error) {
          console.error("[Shows] Error fetching reservations:", error);
          res.status(500).json({ error: "Failed to fetch reservations" });
          return;
        }

        const totalReservedValue = (data || []).reduce(
          (sum, item) =>
            sum + parseFloat(item.unit_price as any) * item.quantity,
          0,
        );

        res.json({
          reservations: data || [],
          count: (data || []).length,
          totalReservedValue,
        });
      } catch (error: any) {
        console.error("[Shows] Error fetching reservations:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to fetch reservations" });
      }
    },
  );
}
