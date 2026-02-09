export interface User {
  id: string;
  name: string;
  avatar: string | null;
  isSeller: boolean;
  followers: number;
  following: number;
}

export interface ColorVariant {
  id: string;
  name: string; // e.g., "Red", "Navy Blue"
  hexCode?: string; // e.g., "#FF0000"
  image?: string; // product image for this color
  price?: number; // base price for this variant
  msrp?: number; // MSRP for this variant
  cost?: number; // cost for this variant
  stockQuantity?: number;
  sku?: string; // SKU specific to this variant
  barcode?: string; // barcode for this variant
  weight?: number; // weight value
  weightUnit?: string; // oz, lb, g, kg
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string; // in, cm, m
  isArchived?: boolean; // archived variants are hidden but preserved for order history
}

export interface SizeVariant {
  id: string;
  name: string; // e.g., "S", "M", "L", "XL" or "6", "7", "8"
  image?: string; // optional image for this size
  price?: number; // base price for this variant
  msrp?: number; // MSRP for this variant
  cost?: number; // cost for this variant
  stockQuantity?: number;
  sku?: string; // SKU specific to this variant
  barcode?: string; // barcode for this variant
  weight?: number; // weight value
  weightUnit?: string; // oz, lb, g, kg
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string; // in, cm, m
  isArchived?: boolean; // archived variants are hidden but preserved for order history
}

export interface ProductVariant {
  id: string;
  colorId?: string;
  colorName?: string; // denormalized for display
  sizeId?: string;
  sizeName?: string; // denormalized for display
  sku?: string;
  barcode?: string;
  price?: number; // override base price for this specific combination
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
  isArchived?: boolean; // archived variants are hidden but preserved for order history
}

export interface ProductCustomization {
  id: string;
  name: string;
  description: string;
}

export interface Product {
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
  customizations?: ProductCustomization[];
  shippingProfile?: string;
  taxCategory?: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface LiveStream {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string | null;
  title: string;
  thumbnail: string;
  viewerCount: number;
  productCount: number;
  isLive: boolean;
  scheduledAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  selectedColorId?: string;
  selectedColorName?: string;
  selectedSizeId?: string;
  selectedSizeName?: string;
  selectedVariantId?: string;
  productName: string;
  productImage?: string;
  createdAt?: string;
}

export interface OrderPaymentCard {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface Order {
  id: string;
  userId: string;
  stripePaymentIntentId?: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  paymentCard?: OrderPaymentCard | null;
  sellerNames?: Record<string, string>;
  shippingAddress?: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  id: string;
  userId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}
