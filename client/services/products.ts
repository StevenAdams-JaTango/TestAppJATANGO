import { supabase, DbProduct } from "@/lib/supabase";
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

// Convert database row to Product type
function dbToProduct(row: DbProduct): Product {
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
    colors: row.colors || [],
    sizes: row.sizes || [],
    variants: row.variants || [],
    shippingProfile: row.shipping_profile,
    taxCategory: row.tax_category,
    sellerId: row.seller_id,
    sellerName: "Store", // Will be populated from profiles join
    sellerAvatar: null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// Convert ProductInput to database format
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
          .select(
            `
          *,
          profiles:seller_id (
            name,
            avatar_url
          )
        `,
          )
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
        .select("*")
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
        .select("*")
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
        .select()
        .single();

      if (error) throw error;
      return data ? dbToProduct(data) : null;
    } catch (error) {
      console.error("Error creating product:", error);
      return null;
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
        .select()
        .single();

      if (error) throw error;
      return data ? dbToProduct(data) : null;
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
        .select("*")
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
        .select("*")
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
