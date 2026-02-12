import {
  supabase,
  DbProductColorRow,
  DbProductSizeRow,
  DbProductVariantRow,
  mapColorRow,
  mapSizeRow,
  mapVariantRow,
} from "@/lib/supabase";
import { Product, ColorVariant, SizeVariant, ProductVariant } from "@/types";

export const savedProductsService = {
  async save(productId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("saved_products")
        .insert({ user_id: user.id, product_id: productId });

      if (error && error.code !== "23505") {
        // 23505 = unique violation (already saved)
        console.error("[savedProducts] save error:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("[savedProducts] save error:", e);
      return false;
    }
  },

  async unsave(productId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("saved_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) {
        console.error("[savedProducts] unsave error:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("[savedProducts] unsave error:", e);
      return false;
    }
  },

  async isSaved(productId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { count } = await supabase
        .from("saved_products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("product_id", productId);

      return (count ?? 0) > 0;
    } catch {
      return false;
    }
  },

  async fetchSaved(): Promise<Product[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_products")
        .select(
          `product_id, created_at,
          products(*, product_colors(*), product_sizes(*), product_variants(*))`,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[savedProducts] fetch error:", error);
        return [];
      }

      return (data || [])
        .filter((row: any) => row.products)
        .map((row: any) => {
          const p = row.products;
          const cRows: DbProductColorRow[] = p.product_colors || [];
          const sRows: DbProductSizeRow[] = p.product_sizes || [];
          const vRows: DbProductVariantRow[] = p.product_variants || [];

          const colors: ColorVariant[] =
            cRows.length > 0
              ? cRows
                  .sort(
                    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
                  )
                  .map(mapColorRow)
              : p.colors || [];
          const sizes: SizeVariant[] =
            sRows.length > 0
              ? sRows
                  .sort(
                    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
                  )
                  .map(mapSizeRow)
              : p.sizes || [];
          const variants: ProductVariant[] =
            vRows.length > 0
              ? vRows
                  .sort(
                    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
                  )
                  .map(mapVariantRow)
              : p.variants || [];

          return {
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            images: p.images || [],
            description: p.description || "",
            category: p.category,
            quantityInStock: p.quantity_in_stock,
            colors,
            sizes,
            variants,
            sellerId: p.seller_id,
            sellerName: "",
            sellerAvatar: null,
          };
        });
    } catch (e) {
      console.error("[savedProducts] fetch error:", e);
      return [];
    }
  },

  async getCount(): Promise<number> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from("saved_products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      return count ?? 0;
    } catch {
      return 0;
    }
  },
};
