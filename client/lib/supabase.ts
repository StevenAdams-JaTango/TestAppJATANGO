import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// These will be replaced with your actual Supabase project credentials
// Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase credentials not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for TypeScript
export interface DbColorVariant {
  id: string;
  name: string;
  hexCode?: string;
  image?: string;
  price?: number;
  msrp?: number;
  cost?: number;
  stockQuantity?: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  isArchived?: boolean;
}

export interface DbSizeVariant {
  id: string;
  name: string;
  image?: string;
  price?: number;
  msrp?: number;
  cost?: number;
  stockQuantity?: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  isArchived?: boolean;
}

export interface DbProductVariant {
  id: string;
  colorId?: string;
  colorName?: string;
  sizeId?: string;
  sizeName?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  msrp?: number;
  cost?: number;
  stockQuantity?: number;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  image?: string;
  isArchived?: boolean;
}

export interface DbProduct {
  id: string;
  name: string;
  price: number;
  msrp?: number;
  cost?: number;
  image: string;
  images?: string[];
  description: string;
  category?: string;
  weight?: number;
  weight_unit?: "oz" | "lb" | "g" | "kg";
  quantity_in_stock?: number;
  aisle?: string;
  bin?: string;
  length?: number;
  width?: number;
  height?: number;
  dimension_unit?: "in" | "cm";
  barcode?: string;
  sku?: string;
  colors?: DbColorVariant[];
  sizes?: DbSizeVariant[];
  variants?: DbProductVariant[];
  shipping_profile?: string;
  tax_category?: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

// Normalized table row types
export interface DbProductColorRow {
  id: string;
  product_id: string;
  client_id?: string;
  name: string;
  hex_code?: string;
  image?: string;
  price?: number;
  msrp?: number;
  cost?: number;
  stock_quantity?: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  weight_unit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimension_unit?: string;
  is_archived?: boolean;
  display_order?: number;
  created_at?: string;
}

export interface DbProductSizeRow {
  id: string;
  product_id: string;
  client_id?: string;
  name: string;
  image?: string;
  price?: number;
  msrp?: number;
  cost?: number;
  stock_quantity?: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  weight_unit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimension_unit?: string;
  is_archived?: boolean;
  display_order?: number;
  created_at?: string;
}

export interface DbProductVariantRow {
  id: string;
  product_id: string;
  client_id?: string;
  color_id?: string;
  color_name?: string;
  size_id?: string;
  size_name?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  msrp?: number;
  cost?: number;
  stock_quantity?: number;
  weight?: number;
  weight_unit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimension_unit?: string;
  image?: string;
  is_archived?: boolean;
  display_order?: number;
  created_at?: string;
}

// Map normalized DB rows to existing client interfaces
export function mapColorRow(row: DbProductColorRow): DbColorVariant {
  return {
    id: row.client_id || row.id,
    name: row.name,
    hexCode: row.hex_code,
    image: row.image,
    price: row.price,
    msrp: row.msrp,
    cost: row.cost,
    stockQuantity: row.stock_quantity,
    sku: row.sku,
    barcode: row.barcode,
    weight: row.weight,
    weightUnit: row.weight_unit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimension_unit,
    isArchived: row.is_archived,
  };
}

export function mapSizeRow(row: DbProductSizeRow): DbSizeVariant {
  return {
    id: row.client_id || row.id,
    name: row.name,
    image: row.image,
    price: row.price,
    msrp: row.msrp,
    cost: row.cost,
    stockQuantity: row.stock_quantity,
    sku: row.sku,
    barcode: row.barcode,
    weight: row.weight,
    weightUnit: row.weight_unit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimension_unit,
    isArchived: row.is_archived,
  };
}

export function mapVariantRow(row: DbProductVariantRow): DbProductVariant {
  return {
    id: row.client_id || row.id,
    colorId: row.color_id,
    colorName: row.color_name,
    sizeId: row.size_id,
    sizeName: row.size_name,
    sku: row.sku,
    barcode: row.barcode,
    price: row.price,
    msrp: row.msrp,
    cost: row.cost,
    stockQuantity: row.stock_quantity,
    weight: row.weight,
    weightUnit: row.weight_unit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimension_unit,
    image: row.image,
    isArchived: row.is_archived,
  };
}

export interface DbShow {
  id: string;
  title: string;
  thumbnail_url?: string;
  status: "draft" | "scheduled" | "live" | "ended";
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  seller_id: string;
  stream_key?: string;
  product_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_seller: boolean;
  store_name?: string;
  created_at: string;
}
