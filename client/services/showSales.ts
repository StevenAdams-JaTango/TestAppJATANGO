import { getApiUrl } from "@/lib/query-client";

export interface FeesBreakdown {
  grossSales: number;
  shippingTotal: number;
  salesTax: number;
  jatangoFee: number;
  jatangoFeeRate: string;
  processingFee: number;
  processingFeeRate: string;
  netSales: number;
}

export interface ShowSummaryData {
  show: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
  };
  summary: {
    totalOrders: number;
    uniqueBuyers: number;
    totalRevenue: number;
    totalItemsSold: number;
    uniqueProductsSold: number;
    addToCartEvents: number;
    uniqueCartUsers: number;
    activeReservations: number;
  };
  feesBreakdown: FeesBreakdown;
  productBreakdown: ProductSalesItem[];
  recentOrders: RecentOrder[];
}

export interface ProductSalesItem {
  productId: string;
  productName: string;
  productImage: string | null;
  quantitySold: number;
  revenue: number;
  uniqueBuyers: number;
}

export interface RecentOrder {
  id: string;
  userId: string;
  totalAmount: number;
  createdAt: string;
  items: {
    productName: string;
    productImage: string | null;
    quantity: number;
    unitPrice: number;
    colorName: string | null;
    sizeName: string | null;
  }[];
}

export const showSalesService = {
  async fetchShowSummary(showId: string): Promise<ShowSummaryData> {
    const baseUrl = getApiUrl();
    const url = `${baseUrl}/api/shows/${showId}/summary`;
    console.log("[showSales] Fetching summary from:", url);

    try {
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(
          "[showSales] Summary fetch failed:",
          res.status,
          body,
          "url:",
          url,
        );
        throw new Error(
          body.error || `Failed to fetch show summary (${res.status})`,
        );
      }

      return res.json();
    } catch (err: any) {
      console.error(
        "[showSales] Network error fetching summary:",
        err.message,
        "url:",
        url,
      );
      throw err;
    }
  },

  async fetchBatchRevenue(showIds: string[]): Promise<Record<string, number>> {
    if (showIds.length === 0) return {};
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/shows/batch-revenue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showIds }),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch batch revenue (${res.status})`);
    }
    const data = await res.json();
    return data.revenues;
  },

  async cleanupReservations(showId: string): Promise<void> {
    const baseUrl = getApiUrl();
    const res = await fetch(
      `${baseUrl}/api/shows/${showId}/cleanup-reservations`,
      { method: "POST" },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to cleanup reservations (${res.status})`,
      );
    }
  },
};
