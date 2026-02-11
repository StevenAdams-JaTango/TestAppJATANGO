import type { Express, Request, Response } from "express";
import { Shippo } from "shippo";
import { LabelFileTypeEnum } from "shippo/models/components";
import { createClient } from "@supabase/supabase-js";

const shippo = new Shippo({
  apiKeyHeader: process.env.SHIPPO_API_TOKEN || "",
});

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RateRequest {
  fromAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  toAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  parcel: {
    length: string;
    width: string;
    height: string;
    distanceUnit: string;
    weight: string;
    massUnit: string;
  };
}

export function registerShippingRoutes(app: Express) {
  /**
   * POST /api/shipping/rates
   * Get shipping rates for a shipment.
   */
  app.post("/api/shipping/rates", async (req: Request, res: Response) => {
    try {
      const { fromAddress, toAddress, parcel } = req.body as RateRequest;

      if (!fromAddress || !toAddress || !parcel) {
        return res
          .status(400)
          .json({ error: "Missing fromAddress, toAddress, or parcel" });
      }

      const shipment = await shippo.shipments.create({
        addressFrom: {
          name: fromAddress.name,
          street1: fromAddress.street1,
          street2: fromAddress.street2 || undefined,
          city: fromAddress.city,
          state: fromAddress.state,
          zip: fromAddress.zip,
          country: fromAddress.country,
          phone: fromAddress.phone || undefined,
        },
        addressTo: {
          name: toAddress.name,
          street1: toAddress.street1,
          street2: toAddress.street2 || undefined,
          city: toAddress.city,
          state: toAddress.state,
          zip: toAddress.zip,
          country: toAddress.country,
          phone: toAddress.phone || undefined,
        },
        parcels: [
          {
            length: parcel.length,
            width: parcel.width,
            height: parcel.height,
            distanceUnit: parcel.distanceUnit as any,
            weight: parcel.weight,
            massUnit: parcel.massUnit as any,
          },
        ],
        async: false,
      });

      // Filter to USPS rates and format for the client
      const rates = (shipment.rates || [])
        .filter((r: any) => r.provider === "USPS")
        .map((r: any) => ({
          rateId: r.objectId,
          carrier: r.provider,
          service: r.servicelevel?.token || "",
          serviceName: r.servicelevel?.name || r.provider,
          amount: parseFloat(r.amount),
          currency: r.currency,
          estimatedDays: r.estimatedDays || r.durationTerms ? 0 : 0,
          shippoShipmentId: shipment.objectId,
        }));

      // Try to parse estimated days from duration_terms
      for (const rate of rates) {
        const original = (shipment.rates || []).find(
          (r: any) => r.objectId === rate.rateId,
        );
        if (original) {
          rate.estimatedDays = (original as any).estimatedDays || 0;
        }
      }

      console.log(
        `[Shipping] Got ${rates.length} USPS rates for shipment ${shipment.objectId}`,
      );

      return res.json({ rates, shipmentId: shipment.objectId });
    } catch (error: any) {
      console.error("[Shipping] Error getting rates:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to get shipping rates" });
    }
  });

  /**
   * POST /api/shipping/buy-label
   * Purchase a shipping label for a rate.
   */
  app.post("/api/shipping/buy-label", async (req: Request, res: Response) => {
    try {
      const { rateId, orderId, packageInfo } = req.body as {
        rateId: string;
        orderId: string;
        packageInfo?: {
          packageType: string;
          length: string;
          width: string;
          height: string;
          weight: string;
        };
      };

      if (!rateId) {
        return res.status(400).json({ error: "Missing rateId" });
      }

      const transaction = await shippo.transactions.create({
        rate: rateId,
        labelFileType: LabelFileTypeEnum.Pdf,
        async: false,
      });

      if (transaction.status !== "SUCCESS") {
        console.error("[Shipping] Transaction failed:", transaction.messages);
        return res.status(400).json({
          error: "Failed to purchase label",
          messages: transaction.messages,
        });
      }

      console.log(
        `[Shipping] Label purchased: ${transaction.trackingNumber}, URL: ${transaction.labelUrl}`,
      );

      // Update order with tracking info if orderId provided
      if (orderId) {
        const updateData: Record<string, any> = {
          tracking_number: transaction.trackingNumber,
          label_url: transaction.labelUrl,
          status: "shipped",
        };
        if (packageInfo) {
          updateData.package_type = packageInfo.packageType;
          updateData.package_length = packageInfo.length;
          updateData.package_width = packageInfo.width;
          updateData.package_height = packageInfo.height;
          updateData.package_weight = packageInfo.weight;
        }
        const { error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId);

        if (updateError) {
          console.error(
            "[Shipping] Error updating order with tracking:",
            updateError,
          );
        }
      }

      return res.json({
        trackingNumber: transaction.trackingNumber,
        labelUrl: transaction.labelUrl,
        status: transaction.status,
      });
    } catch (error: any) {
      console.error("[Shipping] Error buying label:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to purchase label" });
    }
  });

  /**
   * GET /api/shipping/track/:trackingNumber
   * Get tracking status for a shipment.
   */
  app.get(
    "/api/shipping/track/:trackingNumber",
    async (req: Request, res: Response) => {
      try {
        const trackingNumber = req.params.trackingNumber as string;
        const carrier = (req.query.carrier as string) || "usps";

        const tracking = await shippo.trackingStatus.get(
          carrier,
          trackingNumber,
        );

        return res.json({
          trackingNumber: tracking.trackingNumber,
          status: tracking.trackingStatus?.status || "UNKNOWN",
          statusDetails: tracking.trackingStatus?.statusDetails || "",
          location: tracking.trackingStatus?.location || null,
          eta: tracking.eta,
          trackingHistory: (tracking.trackingHistory || []).map((h: any) => ({
            status: h.status,
            statusDetails: h.statusDetails,
            location: h.location,
            statusDate: h.statusDate,
          })),
        });
      } catch (error: any) {
        console.error("[Shipping] Error tracking:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to get tracking info" });
      }
    },
  );

  /**
   * GET /api/sales/:sellerId
   * Fetch all orders containing this seller's products.
   */
  app.get("/api/sales/:sellerId", async (req: Request, res: Response) => {
    try {
      const { sellerId } = req.params;

      // Find all order IDs that have items from this seller
      const { data: sellerItems, error: itemsError } = await supabase
        .from("order_items")
        .select("order_id")
        .eq("seller_id", sellerId);

      if (itemsError) {
        console.error("[Shipping] Error fetching seller items:", itemsError);
        return res.status(500).json({ error: "Failed to fetch sales" });
      }

      if (!sellerItems || sellerItems.length === 0) {
        return res.json({ sales: [] });
      }

      const orderIds = [...new Set(sellerItems.map((i) => i.order_id))];

      // Fetch full orders with items
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (*)
        `,
        )
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("[Shipping] Error fetching orders:", ordersError);
        return res.status(500).json({ error: "Failed to fetch sales" });
      }

      // Enrich with buyer names
      const buyerIds = [...new Set((orders || []).map((o: any) => o.user_id))];
      let buyerNames: Record<string, string> = {};
      if (buyerIds.length > 0) {
        const { data: buyers } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", buyerIds);

        if (buyers) {
          for (const b of buyers) {
            buyerNames[b.id] = b.name || b.email || "Unknown";
          }
        }
      }

      const sales = (orders || []).map((o: any) => ({
        id: o.id,
        userId: o.user_id,
        buyerName: buyerNames[o.user_id] || "Unknown",
        status: o.status,
        totalAmount: parseFloat(o.total_amount),
        shippingCost: o.shipping_cost ? parseFloat(o.shipping_cost) : 0,
        shippingCarrier: o.shipping_carrier || null,
        shippingService: o.shipping_service || null,
        trackingNumber: o.tracking_number || null,
        labelUrl: o.label_url || null,
        shippingAddress: o.shipping_address || null,
        items: (o.order_items || [])
          .filter((i: any) => i.seller_id === sellerId)
          .map((i: any) => ({
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
          })),
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      }));

      return res.json({ sales });
    } catch (error: any) {
      console.error("[Shipping] Error fetching sales:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to fetch sales" });
    }
  });

  /**
   * PUT /api/sales/:orderId/status
   * Update order status (seller marks shipped/delivered).
   */
  app.put("/api/sales/:orderId/status", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body as { status: string };

      if (!status || !["shipped", "delivered", "cancelled"].includes(status)) {
        return res.status(400).json({
          error: "Invalid status. Must be shipped, delivered, or cancelled",
        });
      }

      const { data: order, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId)
        .select("id, status")
        .single();

      if (error) {
        console.error("[Shipping] Error updating order status:", error);
        return res.status(500).json({ error: "Failed to update order status" });
      }

      console.log(`[Shipping] Order ${orderId} status updated to ${status}`);

      return res.json({ order });
    } catch (error: any) {
      console.error("[Shipping] Error updating status:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to update status" });
    }
  });

  /**
   * GET /api/store-address/:sellerId
   * Get a seller's store address.
   */
  app.get(
    "/api/store-address/:sellerId",
    async (req: Request, res: Response) => {
      try {
        const { sellerId } = req.params;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select(
            "store_address_line1, store_address_line2, store_city, store_state, store_zip, store_country, store_phone",
          )
          .eq("id", sellerId)
          .single();

        if (error) {
          console.error("[Shipping] Error fetching store address:", error);
          return res
            .status(500)
            .json({ error: "Failed to fetch store address" });
        }

        if (!profile?.store_address_line1) {
          return res.json({ address: null });
        }

        return res.json({
          address: {
            addressLine1: profile.store_address_line1,
            addressLine2: profile.store_address_line2 || undefined,
            city: profile.store_city,
            state: profile.store_state,
            zip: profile.store_zip,
            country: profile.store_country || "US",
            phone: profile.store_phone || undefined,
          },
        });
      } catch (error: any) {
        console.error("[Shipping] Error fetching store address:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to fetch store address" });
      }
    },
  );

  /**
   * PUT /api/store-address/:sellerId
   * Update a seller's store address.
   */
  app.put(
    "/api/store-address/:sellerId",
    async (req: Request, res: Response) => {
      try {
        const { sellerId } = req.params;
        const { addressLine1, addressLine2, city, state, zip, country, phone } =
          req.body;

        if (!addressLine1 || !city || !state || !zip) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            store_address_line1: addressLine1,
            store_address_line2: addressLine2 || null,
            store_city: city,
            store_state: state,
            store_zip: zip,
            store_country: country || "US",
            store_phone: phone || null,
          })
          .eq("id", sellerId);

        if (error) {
          console.error("[Shipping] Error updating store address:", error);
          return res
            .status(500)
            .json({ error: "Failed to update store address" });
        }

        console.log(`[Shipping] Store address updated for seller ${sellerId}`);

        return res.json({ success: true });
      } catch (error: any) {
        console.error("[Shipping] Error updating store address:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to update store address" });
      }
    },
  );

  // ============================================================
  // Saved Packages CRUD
  // ============================================================

  /**
   * GET /api/saved-packages/:sellerId
   * Fetch all saved packages for a seller.
   */
  app.get(
    "/api/saved-packages/:sellerId",
    async (req: Request, res: Response) => {
      try {
        const { sellerId } = req.params;

        const { data, error } = await supabase
          .from("saved_packages")
          .select("*")
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[Shipping] Error fetching saved packages:", error);
          return res
            .status(500)
            .json({ error: "Failed to fetch saved packages" });
        }

        return res.json({ packages: data || [] });
      } catch (error: any) {
        console.error("[Shipping] Error fetching saved packages:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to fetch saved packages" });
      }
    },
  );

  /**
   * POST /api/saved-packages
   * Create a new saved package.
   */
  app.post("/api/saved-packages", async (req: Request, res: Response) => {
    try {
      const { sellerId, name, packageType, length, width, height, weight } =
        req.body as {
          sellerId: string;
          name: string;
          packageType: string;
          length: string;
          width: string;
          height: string;
          weight?: string;
        };

      if (!sellerId || !name || !length || !width || !height) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { data, error } = await supabase
        .from("saved_packages")
        .insert({
          seller_id: sellerId,
          name,
          package_type: packageType || "box",
          length,
          width,
          height,
          weight: weight || null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[Shipping] Error creating saved package:", error);
        return res
          .status(500)
          .json({ error: "Failed to create saved package" });
      }

      return res.json({ package: data });
    } catch (error: any) {
      console.error("[Shipping] Error creating saved package:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to create saved package" });
    }
  });

  /**
   * PUT /api/saved-packages/:packageId
   * Update a saved package.
   */
  app.put(
    "/api/saved-packages/:packageId",
    async (req: Request, res: Response) => {
      try {
        const { packageId } = req.params;
        const { name, packageType, length, width, height, weight } =
          req.body as {
            name?: string;
            packageType?: string;
            length?: string;
            width?: string;
            height?: string;
            weight?: string;
          };

        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (packageType !== undefined) updateData.package_type = packageType;
        if (length !== undefined) updateData.length = length;
        if (width !== undefined) updateData.width = width;
        if (height !== undefined) updateData.height = height;
        if (weight !== undefined) updateData.weight = weight;

        const { data, error } = await supabase
          .from("saved_packages")
          .update(updateData)
          .eq("id", packageId)
          .select("*")
          .single();

        if (error) {
          console.error("[Shipping] Error updating saved package:", error);
          return res
            .status(500)
            .json({ error: "Failed to update saved package" });
        }

        return res.json({ package: data });
      } catch (error: any) {
        console.error("[Shipping] Error updating saved package:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to update saved package" });
      }
    },
  );

  /**
   * DELETE /api/saved-packages/:packageId
   * Delete a saved package.
   */
  app.delete(
    "/api/saved-packages/:packageId",
    async (req: Request, res: Response) => {
      try {
        const { packageId } = req.params;

        const { error } = await supabase
          .from("saved_packages")
          .delete()
          .eq("id", packageId);

        if (error) {
          console.error("[Shipping] Error deleting saved package:", error);
          return res
            .status(500)
            .json({ error: "Failed to delete saved package" });
        }

        return res.json({ success: true });
      } catch (error: any) {
        console.error("[Shipping] Error deleting saved package:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to delete saved package" });
      }
    },
  );

  /**
   * DELETE /api/orders/:userId
   * Delete all orders for a user (dev/test cleanup).
   */
  app.delete("/api/orders/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Delete order items first (foreign key)
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId);

      if (orders && orders.length > 0) {
        const orderIds = orders.map((o) => o.id);
        await supabase.from("order_items").delete().in("order_id", orderIds);
        await supabase.from("orders").delete().eq("user_id", userId);
      }

      console.log(`[Shipping] Deleted all orders for user ${userId}`);
      return res.json({ success: true, deleted: orders?.length || 0 });
    } catch (error: any) {
      console.error("[Shipping] Error deleting orders:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to delete orders" });
    }
  });
}
