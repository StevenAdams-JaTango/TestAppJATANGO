import { Product, LiveStream, Order, User } from "@/types";

export const mockUser: User = {
  id: "user-1",
  name: "Alex Johnson",
  avatar: null,
  isSeller: true,
  followers: 1234,
  following: 567,
};

export const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Wireless Bluetooth Earbuds",
    price: 79.99,
    image: "https://picsum.photos/seed/earbuds/400/400",
    images: [
      "https://picsum.photos/seed/earbuds/400/400",
      "https://picsum.photos/seed/earbuds2/400/400",
      "https://picsum.photos/seed/earbuds3/400/400",
    ],
    description:
      "High-quality wireless earbuds with noise cancellation and 24-hour battery life.",
    sellerId: "seller-1",
    sellerName: "TechGear Pro",
    sellerAvatar: null,
  },
  {
    id: "prod-2",
    name: "Minimalist Leather Watch",
    price: 149.99,
    image: "https://picsum.photos/seed/watch/400/400",
    images: [
      "https://picsum.photos/seed/watch/400/400",
      "https://picsum.photos/seed/watch2/400/400",
      "https://picsum.photos/seed/watch3/400/400",
      "https://picsum.photos/seed/watch4/400/400",
    ],
    description:
      "Elegant leather watch with Japanese movement and sapphire crystal.",
    sellerId: "seller-2",
    sellerName: "LuxeTime",
    sellerAvatar: null,
  },
  {
    id: "prod-3",
    name: "Organic Cotton Hoodie",
    price: 59.99,
    image: "https://picsum.photos/seed/hoodie/400/400",
    images: [
      "https://picsum.photos/seed/hoodie/400/400",
      "https://picsum.photos/seed/hoodie2/400/400",
    ],
    description: "Soft and comfortable hoodie made from 100% organic cotton.",
    sellerId: "seller-3",
    sellerName: "EcoWear",
    sellerAvatar: null,
  },
  {
    id: "prod-4",
    name: "Smart Home Speaker",
    price: 99.99,
    image: "https://picsum.photos/seed/speaker/400/400",
    description: "Voice-controlled smart speaker with premium sound quality.",
    sellerId: "seller-1",
    sellerName: "TechGear Pro",
    sellerAvatar: null,
  },
  {
    id: "prod-5",
    name: "Ceramic Plant Pot Set",
    price: 34.99,
    image: "https://picsum.photos/seed/pots/400/400",
    description: "Set of 3 handcrafted ceramic plant pots in modern designs.",
    sellerId: "seller-4",
    sellerName: "HomeVibes",
    sellerAvatar: null,
  },
  {
    id: "prod-6",
    name: "Yoga Mat Premium",
    price: 45.99,
    image: "https://picsum.photos/seed/yoga/400/400",
    description: "Non-slip yoga mat with alignment guides and carrying strap.",
    sellerId: "seller-5",
    sellerName: "FitLife",
    sellerAvatar: null,
  },
];

export const mockLiveStreams: LiveStream[] = [
  {
    id: "live-1",
    sellerId: "seller-1",
    sellerName: "TechGear Pro",
    sellerAvatar: null,
    title: "New Tech Gadgets Unboxing",
    thumbnail: "https://picsum.photos/seed/tech/800/450",
    viewerCount: 1247,
    productCount: 8,
    isLive: true,
  },
  {
    id: "live-2",
    sellerId: "seller-2",
    sellerName: "LuxeTime",
    sellerAvatar: null,
    title: "Luxury Watch Collection Sale",
    thumbnail: "https://picsum.photos/seed/luxury/800/450",
    viewerCount: 892,
    productCount: 12,
    isLive: true,
  },
  {
    id: "live-3",
    sellerId: "seller-3",
    sellerName: "EcoWear",
    sellerAvatar: null,
    title: "Spring Fashion Preview",
    thumbnail: "https://picsum.photos/seed/fashion/800/450",
    viewerCount: 2103,
    productCount: 15,
    isLive: true,
  },
];

export const mockOrders: Order[] = [
  {
    id: "order-1",
    productId: "prod-1",
    productName: "Wireless Bluetooth Earbuds",
    productImage: "https://picsum.photos/seed/earbuds/400/400",
    price: 79.99,
    status: "delivered",
    date: "2024-01-15",
  },
  {
    id: "order-2",
    productId: "prod-3",
    productName: "Organic Cotton Hoodie",
    productImage: "https://picsum.photos/seed/hoodie/400/400",
    price: 59.99,
    status: "shipped",
    date: "2024-01-20",
  },
];

export const mockSellerProducts: Product[] = mockProducts.slice(0, 4);
