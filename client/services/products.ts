import {
  supabase,
  DbProductColorRow,
  DbProductSizeRow,
  DbProductVariantRow,
  mapColorRow,
  mapSizeRow,
  mapVariantRow,
} from "@/lib/supabase";
import { getApiUrl } from "@/lib/query-client";
import { Product, ColorVariant, SizeVariant, ProductVariant } from "@/types";

export interface ProductInput {
  name: string;
  price: number;
  msrp?: number;
  cost?: number;
  image: string;
  images?: string[];
  description: string;
  category?: string;
  weight?: number;
  weightUnit?: "oz" | "lb" | "g" | "kg";
  quantityInStock?: number;
  aisle?: string;
  bin?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: "in" | "cm";
  barcode?: string;
  sku?: string;
  colors?: ColorVariant[];
  sizes?: SizeVariant[];
  variants?: ProductVariant[];
  shippingProfile?: string;
  taxCategory?: string;
}

// The SELECT string for product queries with normalized joins
const PRODUCT_SELECT = `
  *,
  product_colors(*),
  product_sizes(*),
  product_variants(*)
`;

const PRODUCT_SELECT_WITH_SELLER = `
  *,
  product_colors(*),
  product_sizes(*),
  product_variants(*),
  profiles:seller_id (
    name,
    avatar_url
  )
`;

// Convert database row (with joined normalized tables) to Product type
function dbToProduct(row: any): Product {
  // Map normalized rows to client interfaces (fallback to JSONB for backward compat)
  const colorRows: DbProductColorRow[] = row.product_colors || [];
  const sizeRows: DbProductSizeRow[] = row.product_sizes || [];
  const variantRows: DbProductVariantRow[] = row.product_variants || [];

  const colors: ColorVariant[] =
    colorRows.length > 0
      ? colorRows
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map(mapColorRow)
      : row.colors || [];
  const sizes: SizeVariant[] =
    sizeRows.length > 0
      ? sizeRows
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map(mapSizeRow)
      : row.sizes || [];
  const variants: ProductVariant[] =
    variantRows.length > 0
      ? variantRows
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map(mapVariantRow)
      : row.variants || [];

  return {
    id: row.id,
    name: row.name,
    price: row.price,
    msrp: row.msrp,
    cost: row.cost,
    image: row.image,
    images: row.images,
    description: row.description,
    category: row.category,
    weight: row.weight,
    weightUnit: row.weight_unit,
    quantityInStock: row.quantity_in_stock,
    aisle: row.aisle,
    bin: row.bin,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimension_unit,
    barcode: row.barcode,
    sku: row.sku,
    colors,
    sizes,
    variants,
    shippingProfile: row.shipping_profile,
    taxCategory: row.tax_category,
    sellerId: row.seller_id,
    sellerName: "Store",
    sellerAvatar: null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// Convert ProductInput to database format (no longer writes JSONB variant columns)
function inputToDb(input: ProductInput, sellerId: string) {
  return {
    name: input.name,
    price: input.price,
    msrp: input.msrp,
    cost: input.cost,
    image: input.image,
    images: input.images || [],
    description: input.description,
    category: input.category,
    weight: input.weight,
    weight_unit: input.weightUnit,
    quantity_in_stock: input.quantityInStock,
    aisle: input.aisle,
    bin: input.bin,
    length: input.length,
    width: input.width,
    height: input.height,
    dimension_unit: input.dimensionUnit,
    barcode: input.barcode,
    sku: input.sku,
    colors: input.colors || [],
    sizes: input.sizes || [],
    variants: input.variants || [],
    shipping_profile: input.shippingProfile,
    tax_category: input.taxCategory,
    seller_id: sellerId,
  };
}

// Upsert colors, sizes, and variants into normalized tables for a product
async function upsertNormalizedVariants(
  productId: string,
  colors?: ColorVariant[],
  sizes?: SizeVariant[],
  variants?: ProductVariant[],
) {
  // Delete existing rows and re-insert (simple replace strategy)
  if (colors !== undefined) {
    await supabase.from("product_colors").delete().eq("product_id", productId);
    if (colors.length > 0) {
      const rows = colors.map((c, idx) => ({
        product_id: productId,
        client_id: c.id,
        name: c.name,
        hex_code: c.hexCode,
        image: c.image,
        price: c.price,
        msrp: c.msrp,
        cost: c.cost,
        stock_quantity: c.stockQuantity ?? 0,
        sku: c.sku,
        barcode: c.barcode,
        weight: c.weight,
        weight_unit: c.weightUnit,
        length: c.length,
        width: c.width,
        height: c.height,
        dimension_unit: c.dimensionUnit,
        is_archived: c.isArchived ?? false,
        display_order: idx,
      }));
      const { error } = await supabase.from("product_colors").insert(rows);
      if (error)
        console.error("Error inserting product_colors:", error.message);
    }
  }

  if (sizes !== undefined) {
    await supabase.from("product_sizes").delete().eq("product_id", productId);
    if (sizes.length > 0) {
      const rows = sizes.map((s, idx) => ({
        product_id: productId,
        client_id: s.id,
        name: s.name,
        image: s.image,
        price: s.price,
        msrp: s.msrp,
        cost: s.cost,
        stock_quantity: s.stockQuantity ?? 0,
        sku: s.sku,
        barcode: s.barcode,
        weight: s.weight,
        weight_unit: s.weightUnit,
        length: s.length,
        width: s.width,
        height: s.height,
        dimension_unit: s.dimensionUnit,
        is_archived: s.isArchived ?? false,
        display_order: idx,
      }));
      const { error } = await supabase.from("product_sizes").insert(rows);
      if (error) console.error("Error inserting product_sizes:", error.message);
    }
  }

  if (variants !== undefined) {
    await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);
    if (variants.length > 0) {
      const rows = variants.map((v, idx) => ({
        product_id: productId,
        client_id: v.id,
        color_id: v.colorId,
        color_name: v.colorName,
        size_id: v.sizeId,
        size_name: v.sizeName,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        msrp: v.msrp,
        cost: v.cost,
        stock_quantity: v.stockQuantity ?? 0,
        weight: v.weight,
        weight_unit: v.weightUnit,
        length: v.length,
        width: v.width,
        height: v.height,
        dimension_unit: v.dimensionUnit,
        image: v.image,
        is_archived: v.isArchived ?? false,
        display_order: idx,
      }));
      const { error } = await supabase.from("product_variants").insert(rows);
      if (error)
        console.error("Error inserting product_variants:", error.message);
    }
  }
}

class ProductsService {
  // Fetch reserved quantities from the server (items held in live show carts)
  private async fetchReservedQuantities(): Promise<Record<string, number>> {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/reservations/quantities`);
      if (!res.ok) return {};
      const data = await res.json();
      return data.reservedQuantities || {};
    } catch {
      return {};
    }
  }

  // List all products (for explore/browse) with seller info
  // Subtracts active show reservations from displayed stock
  async listAllProducts(): Promise<Product[]> {
    try {
      const [{ data, error }, reservedQty] = await Promise.all([
        supabase
          .from("products")
          .select(PRODUCT_SELECT_WITH_SELLER)
          .order("created_at", { ascending: false }),
        this.fetchReservedQuantities(),
      ]);

      if (error) throw error;
      return (data || []).map((row) => {
        const product = dbToProduct(row);
        // Add seller info from joined profiles
        if (row.profiles) {
          product.sellerName = row.profiles.name || "Unknown Seller";
          product.sellerAvatar = row.profiles.avatar_url || null;
        }
        // Subtract reserved quantities from available stock
        const reserved = reservedQty[product.id] || 0;
        if (reserved > 0 && product.quantityInStock != null) {
          product.quantityInStock = Math.max(
            0,
            product.quantityInStock - reserved,
          );
        }
        return product;
      });
    } catch (error) {
      console.error("Error listing all products:", error);
      return [];
    }
  }

  // List products for current user (seller's own products)
  async listProducts(): Promise<Product[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn("No authenticated user, returning empty products");
        return [];
      }

      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToProduct);
    } catch (error) {
      console.error("Error listing products:", error);
      return [];
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? dbToProduct(data) : null;
    } catch (error) {
      console.error("Error getting product:", error);
      return null;
    }
  }

  async createProduct(input: ProductInput): Promise<Product | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Must be authenticated to create products");
      }

      const { data, error } = await supabase
        .from("products")
        .insert(inputToDb(input, user.id))
        .select(PRODUCT_SELECT)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Write normalized variant rows
      await upsertNormalizedVariants(
        data.id,
        input.colors,
        input.sizes,
        input.variants,
      );

      // Re-fetch to get populated normalized data
      const { data: fresh } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", data.id)
        .single();

      return fresh ? dbToProduct(fresh) : dbToProduct(data);
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(
    id: string,
    input: Partial<ProductInput>,
  ): Promise<Product | null> {
    try {
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.msrp !== undefined) updateData.msrp = input.msrp;
      if (input.cost !== undefined) updateData.cost = input.cost;
      if (input.image !== undefined) updateData.image = input.image;
      if (input.images !== undefined) updateData.images = input.images;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.weight !== undefined) updateData.weight = input.weight;
      if (input.weightUnit !== undefined)
        updateData.weight_unit = input.weightUnit;
      if (input.quantityInStock !== undefined)
        updateData.quantity_in_stock = input.quantityInStock;
      if (input.aisle !== undefined) updateData.aisle = input.aisle;
      if (input.bin !== undefined) updateData.bin = input.bin;
      if (input.length !== undefined) updateData.length = input.length;
      if (input.width !== undefined) updateData.width = input.width;
      if (input.height !== undefined) updateData.height = input.height;
      if (input.dimensionUnit !== undefined)
        updateData.dimension_unit = input.dimensionUnit;
      if (input.barcode !== undefined) updateData.barcode = input.barcode;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.shippingProfile !== undefined)
        updateData.shipping_profile = input.shippingProfile;
      if (input.taxCategory !== undefined)
        updateData.tax_category = input.taxCategory;
      if (input.colors !== undefined) updateData.colors = input.colors;
      if (input.sizes !== undefined) updateData.sizes = input.sizes;
      if (input.variants !== undefined) updateData.variants = input.variants;

      const { data, error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id)
        .select(PRODUCT_SELECT)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Write normalized variant rows
      await upsertNormalizedVariants(
        id,
        input.colors,
        input.sizes,
        input.variants,
      );

      // Re-fetch to get populated normalized data
      const { data: fresh } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", id)
        .single();

      return fresh ? dbToProduct(fresh) : dbToProduct(data);
    } catch (error) {
      console.error("Error updating product:", error);
      return null;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      return false;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .or(
          `name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToProduct);
    } catch (error) {
      console.error("Error searching products:", error);
      return [];
    }
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToProduct);
    } catch (error) {
      console.error("Error getting products by category:", error);
      return [];
    }
  }

  // Subscribe to real-time product updates
  subscribeToProducts(callback: (products: Product[]) => void) {
    const subscription = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        async () => {
          // Refetch all products when any change occurs
          const products = await this.listAllProducts();
          callback(products);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const productsService = new ProductsService();
