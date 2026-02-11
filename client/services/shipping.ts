import { getApiUrl } from "@/lib/query-client";
import { ShippingRate, StoreAddress, Sale, SavedPackage } from "@/types";

export const shippingService = {
  /**
   * Get USPS shipping rates for a shipment.
   */
  async getRates(
    fromAddress: {
      name: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      phone?: string;
    },
    toAddress: {
      name: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      phone?: string;
    },
    parcel: {
      length: string;
      width: string;
      height: string;
      distanceUnit: string;
      weight: string;
      massUnit: string;
    },
  ): Promise<{ rates: ShippingRate[]; shipmentId: string }> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/shipping/rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromAddress, toAddress, parcel }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to get rates (${res.status})`);
    }

    return res.json();
  },

  /**
   * Purchase a shipping label.
   */
  async buyLabel(
    rateId: string,
    orderId?: string,
    packageInfo?: {
      packageType: string;
      length: string;
      width: string;
      height: string;
      weight: string;
    },
  ): Promise<{
    trackingNumber: string;
    labelUrl: string;
    status: string;
  }> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/shipping/buy-label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rateId, orderId, packageInfo }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to buy label (${res.status})`);
    }

    return res.json();
  },

  /**
   * Get tracking info for a shipment.
   */
  async getTracking(
    trackingNumber: string,
    carrier: string = "usps",
  ): Promise<{
    trackingNumber: string;
    status: string;
    statusDetails: string;
    eta: string | null;
    trackingHistory: {
      status: string;
      statusDetails: string;
      location: any;
      statusDate: string;
    }[];
  }> {
    const baseUrl = getApiUrl();
    const url = `${baseUrl}/api/shipping/track/${trackingNumber}?carrier=${carrier}`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to get tracking (${res.status})`);
    }

    return res.json();
  },

  /**
   * Fetch sales for a seller.
   */
  async fetchSales(sellerId: string): Promise<Sale[]> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/sales/${sellerId}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to fetch sales (${res.status})`);
    }

    const data = await res.json();
    return data.sales || [];
  },

  /**
   * Update order status (seller action).
   */
  async updateOrderStatus(
    orderId: string,
    status: "shipped" | "delivered" | "cancelled",
  ): Promise<void> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/sales/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to update status (${res.status})`);
    }
  },

  /**
   * Get a seller's store address.
   */
  async getStoreAddress(sellerId: string): Promise<StoreAddress | null> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/store-address/${sellerId}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to fetch store address (${res.status})`,
      );
    }

    const data = await res.json();
    return data.address || null;
  },

  /**
   * Delete all orders for a user (dev/test cleanup).
   */
  async deleteAllOrders(userId: string): Promise<{ deleted: number }> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/orders/${userId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to delete orders (${res.status})`);
    }

    return res.json();
  },

  /**
   * Update a seller's store address.
   */
  // ============================================================
  // Saved Packages
  // ============================================================

  async fetchSavedPackages(sellerId: string): Promise<SavedPackage[]> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/saved-packages/${sellerId}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to fetch saved packages (${res.status})`,
      );
    }

    const data = await res.json();
    return (data.packages || []).map((p: any) => ({
      id: p.id,
      sellerId: p.seller_id,
      name: p.name,
      packageType: p.package_type,
      length: p.length,
      width: p.width,
      height: p.height,
      weight: p.weight,
      isDefault: p.is_default,
    }));
  },

  async createSavedPackage(pkg: {
    sellerId: string;
    name: string;
    packageType: string;
    length: string;
    width: string;
    height: string;
    weight?: string;
  }): Promise<SavedPackage> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/saved-packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pkg),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to create saved package (${res.status})`,
      );
    }

    const data = await res.json();
    const p = data.package;
    return {
      id: p.id,
      sellerId: p.seller_id,
      name: p.name,
      packageType: p.package_type,
      length: p.length,
      width: p.width,
      height: p.height,
      weight: p.weight,
      isDefault: p.is_default,
    };
  },

  async deleteSavedPackage(packageId: string): Promise<void> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/saved-packages/${packageId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to delete saved package (${res.status})`,
      );
    }
  },

  async updateStoreAddress(
    sellerId: string,
    address: StoreAddress,
  ): Promise<void> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/store-address/${sellerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(address),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to update store address (${res.status})`,
      );
    }
  },
};
