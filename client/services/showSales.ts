import { getApiUrl } from "@/lib/query-client";

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
    const res = await fetch(`${baseUrl}/api/shows/${showId}/summary`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to fetch show summary (${res.status})`,
      );
    }

    return res.json();
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
