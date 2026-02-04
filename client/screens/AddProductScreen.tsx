import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ColorPicker } from "@/components/ColorPicker";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { useTaxCategories, TaxCategory } from "@/hooks/useTaxCategories";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { productsService, ProductInput } from "@/services/products";
import { uploadImages, uploadImage } from "@/services/storage";
import { ColorVariant, SizeVariant, ProductVariant } from "@/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "AddProduct">;

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Sports",
  "Beauty",
  "Toys",
  "Food & Beverages",
  "Other",
];

// Common sizes for quick selection
const COMMON_SIZES = {
  Clothing: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  "Clothing Numeric": ["0", "2", "4", "6", "8", "10", "12", "14", "16"],
  Shoes: [
    "5",
    "5.5",
    "6",
    "6.5",
    "7",
    "7.5",
    "8",
    "8.5",
    "9",
    "9.5",
    "10",
    "10.5",
    "11",
    "11.5",
    "12",
    "13",
    "14",
  ],
  Kids: [
    "Newborn",
    "0-3M",
    "3-6M",
    "6-9M",
    "9-12M",
    "12-18M",
    "18-24M",
    "2T",
    "3T",
    "4T",
    "5T",
  ],
  "Kids Clothing": [
    "2",
    "3",
    "4",
    "5",
    "6",
    "6X",
    "7",
    "8",
    "10",
    "12",
    "14",
    "16",
  ],
  General: ["Small", "Medium", "Large", "Extra Large", "One Size"],
  Dimensions: ['6"', '8"', '10"', '12"', '14"', '16"', '18"', '20"', '24"'],
};

// Flatten all sizes for search
const ALL_COMMON_SIZES = Object.entries(COMMON_SIZES).flatMap(
  ([category, sizes]) => sizes.map((size) => ({ size, category })),
);

// 36 Common colors with hex codes
const COMMON_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Green", hex: "#22C55E" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Brown", hex: "#92400E" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Navy", hex: "#1E3A5F" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Coral", hex: "#FF7F50" },
  { name: "Maroon", hex: "#800000" },
  { name: "Olive", hex: "#808000" },
  { name: "Mint", hex: "#98FF98" },
  { name: "Lavender", hex: "#E6E6FA" },
  { name: "Burgundy", hex: "#800020" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Ivory", hex: "#FFFFF0" },
  { name: "Cream", hex: "#FFFDD0" },
  { name: "Charcoal", hex: "#36454F" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Champagne", hex: "#F7E7CE" },
  { name: "Turquoise", hex: "#40E0D0" },
  { name: "Aqua", hex: "#00FFFF" },
  { name: "Indigo", hex: "#4B0082" },
  { name: "Magenta", hex: "#FF00FF" },
  { name: "Lime", hex: "#32CD32" },
  { name: "Peach", hex: "#FFCBA4" },
  { name: "Salmon", hex: "#FA8072" },
  { name: "Khaki", hex: "#C3B091" },
  { name: "Tan", hex: "#D2B48C" },
];

const WEIGHT_UNITS = ["oz", "lb", "g", "kg"] as const;
const DIMENSION_UNITS = ["in", "cm"] as const;

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const productId = route.params?.productId;
  const isEditMode = !!productId;

  // Loading state for edit mode
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [msrp, setMsrp] = useState("");
  const [cost, setCost] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"oz" | "lb" | "g" | "kg">("oz");
  const [quantityInStock, setQuantityInStock] = useState("");
  const [aisle, setAisle] = useState("");
  const [bin, setBin] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [dimensionUnit, setDimensionUnit] = useState<"in" | "cm">("in");
  const [barcode, setBarcode] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [shippingProfile] = useState("Default - USPS");
  const [taxCategory, setTaxCategory] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTaxCategoryPicker, setShowTaxCategoryPicker] = useState(false);

  // Fetch tax categories from API/defaults
  const { categories: taxCategories, isLoading: loadingTaxCategories } =
    useTaxCategories();

  // Variants state
  const [colors, setColors] = useState<ColorVariant[]>([]);
  const [sizes, setSizes] = useState<SizeVariant[]>([]);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [combinedVariants, setCombinedVariants] = useState<ProductVariant[]>(
    [],
  );
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Image cropper state (for web)
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);
  const [cropCallback, setCropCallback] = useState<
    ((uri: string) => void) | null
  >(null);

  // Load existing product data when editing
  useEffect(() => {
    if (productId) {
      loadProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;
    setLoadingProduct(true);
    try {
      const product = await productsService.getProduct(productId);
      if (product) {
        setName(product.name);
        setCategory(product.category || "");
        setPrice(product.price.toString());
        setMsrp(product.msrp?.toString() || "");
        setCost(product.cost?.toString() || "");
        setWeight(product.weight?.toString() || "");
        setWeightUnit(product.weightUnit || "oz");
        setQuantityInStock(product.quantityInStock?.toString() || "");
        setAisle(product.aisle || "");
        setBin(product.bin || "");
        setLength(product.length?.toString() || "");
        setWidth(product.width?.toString() || "");
        setHeight(product.height?.toString() || "");
        setDimensionUnit(product.dimensionUnit || "in");
        setBarcode(product.barcode || "");
        setSku(product.sku || "");
        setDescription(product.description || "");
        setTaxCategory(product.taxCategory || "");
        setImages(product.images || (product.image ? [product.image] : []));
        setColors(product.colors || []);
        setSizes(product.sizes || []);
        setCombinedVariants(product.variants || []);
      }
    } catch (error) {
      console.error("Error loading product:", error);
      Alert.alert("Error", "Failed to load product");
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false, // Always use our custom cropper
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      // Always show cropper modal on all platforms
      setPendingCropImage(uri);
      setCropCallback(() => (croppedUri: string) => {
        setImages([...images, croppedUri]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddColor = () => {
    if (!newColorName.trim()) {
      Alert.alert("Missing Field", "Please enter a color name.");
      return;
    }
    const newColor: ColorVariant = {
      id: `color_${Date.now()}`,
      name: newColorName.trim(),
      hexCode: newColorHex,
    };
    const updatedColors = [...colors, newColor];
    setColors(updatedColors);
    setNewColorName("");
    setNewColorHex("#000000");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Always auto-generate variants (color-only, size-only, or combined)
    autoGenerateCombinedVariants(updatedColors, sizes);
  };

  const handleRemoveColor = (id: string) => {
    // If editing an existing product, archive the color (preserve for order history)
    // If creating a new product, delete it completely (no sales possible yet)
    if (isEditMode) {
      const updatedColors = colors.map((c) =>
        c.id === id ? { ...c, isArchived: true } : c,
      );
      setColors(updatedColors);
      // Also archive any variants using this color
      setCombinedVariants(
        combinedVariants.map((v) =>
          v.colorId === id ? { ...v, isArchived: true } : v,
        ),
      );
    } else {
      const updatedColors = colors.filter((c) => c.id !== id);
      setColors(updatedColors);
      autoGenerateCombinedVariants(updatedColors, sizes);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUnarchiveColor = (id: string) => {
    setColors(
      colors.map((c) => (c.id === id ? { ...c, isArchived: false } : c)),
    );
    // Also unarchive any variants using this color
    setCombinedVariants(
      combinedVariants.map((v) =>
        v.colorId === id ? { ...v, isArchived: false } : v,
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleColorImagePick = async (colorId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPendingCropImage(uri);
      setCropCallback(() => (croppedUri: string) => {
        setColors(
          colors.map((c) =>
            c.id === colorId ? { ...c, image: croppedUri } : c,
          ),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      });
    }
  };

  const handleUpdateColorField = (
    colorId: string,
    field: keyof ColorVariant,
    value: string,
  ) => {
    setColors(
      colors.map((c) => {
        if (c.id !== colorId) return c;
        if (
          field === "price" ||
          field === "msrp" ||
          field === "cost" ||
          field === "weight" ||
          field === "length" ||
          field === "width" ||
          field === "height"
        ) {
          return { ...c, [field]: value ? parseFloat(value) : undefined };
        }
        if (field === "stockQuantity") {
          return { ...c, [field]: value ? parseInt(value, 10) : undefined };
        }
        return { ...c, [field]: value };
      }),
    );
  };

  const handleAddSize = () => {
    if (!newSizeName.trim()) {
      Alert.alert("Missing Field", "Please enter a size name.");
      return;
    }
    const newSize: SizeVariant = {
      id: `size_${Date.now()}`,
      name: newSizeName.trim(),
    };
    const updatedSizes = [...sizes, newSize];
    setSizes(updatedSizes);
    setNewSizeName("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Always auto-generate variants (color-only, size-only, or combined)
    autoGenerateCombinedVariants(colors, updatedSizes);
  };

  const handleRemoveSize = (id: string) => {
    // If editing an existing product, archive the size (preserve for order history)
    // If creating a new product, delete it completely (no sales possible yet)
    if (isEditMode) {
      const updatedSizes = sizes.map((s) =>
        s.id === id ? { ...s, isArchived: true } : s,
      );
      setSizes(updatedSizes);
      // Also archive any variants using this size
      setCombinedVariants(
        combinedVariants.map((v) =>
          v.sizeId === id ? { ...v, isArchived: true } : v,
        ),
      );
    } else {
      const updatedSizes = sizes.filter((s) => s.id !== id);
      setSizes(updatedSizes);
      autoGenerateCombinedVariants(colors, updatedSizes);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUnarchiveSize = (id: string) => {
    setSizes(sizes.map((s) => (s.id === id ? { ...s, isArchived: false } : s)));
    // Also unarchive any variants using this size
    setCombinedVariants(
      combinedVariants.map((v) =>
        v.sizeId === id ? { ...v, isArchived: false } : v,
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSizeImagePick = async (sizeId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPendingCropImage(uri);
      setCropCallback(() => (croppedUri: string) => {
        setSizes(
          sizes.map((s) => (s.id === sizeId ? { ...s, image: croppedUri } : s)),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      });
    }
  };

  const handleUpdateSizeField = (
    sizeId: string,
    field: keyof SizeVariant,
    value: string,
  ) => {
    setSizes(
      sizes.map((s) => {
        if (s.id !== sizeId) return s;
        if (
          field === "price" ||
          field === "msrp" ||
          field === "cost" ||
          field === "weight" ||
          field === "length" ||
          field === "width" ||
          field === "height"
        ) {
          return { ...s, [field]: value ? parseFloat(value) : undefined };
        }
        if (field === "stockQuantity") {
          return { ...s, [field]: value ? parseInt(value, 10) : undefined };
        }
        return { ...s, [field]: value };
      }),
    );
  };

  const toggleEditColor = (id: string) => {
    setEditingColorId(editingColorId === id ? null : id);
  };

  const toggleEditSize = (id: string) => {
    setEditingSizeId(editingSizeId === id ? null : id);
  };

  const toggleEditVariant = (id: string) => {
    setEditingVariantId(editingVariantId === id ? null : id);
  };

  // Auto-generate variants (supports color-only, size-only, or combined)
  const autoGenerateCombinedVariants = (
    colorsToUse: ColorVariant[],
    sizesToUse: SizeVariant[],
  ) => {
    const newVariants: ProductVariant[] = [];

    // If both colors and sizes exist, create combined variants
    if (colorsToUse.length > 0 && sizesToUse.length > 0) {
      for (const color of colorsToUse) {
        for (const size of sizesToUse) {
          const existing = combinedVariants.find(
            (v) => v.colorId === color.id && v.sizeId === size.id,
          );
          if (existing) {
            newVariants.push(existing);
          } else {
            newVariants.push({
              id: `variant_${color.id}_${size.id}`,
              colorId: color.id,
              colorName: color.name,
              sizeId: size.id,
              sizeName: size.name,
              stockQuantity: 0,
              weightUnit: "oz",
              dimensionUnit: "in",
            });
          }
        }
      }
    }
    // If only colors exist, create color-only variants
    else if (colorsToUse.length > 0) {
      for (const color of colorsToUse) {
        const existing = combinedVariants.find((v) => v.colorId === color.id);
        if (existing) {
          newVariants.push(existing);
        } else {
          newVariants.push({
            id: `variant_color_${color.id}`,
            colorId: color.id,
            colorName: color.name,
            stockQuantity: 0,
            weightUnit: "oz",
            dimensionUnit: "in",
          });
        }
      }
    }
    // If only sizes exist, create size-only variants
    else if (sizesToUse.length > 0) {
      for (const size of sizesToUse) {
        const existing = combinedVariants.find((v) => v.sizeId === size.id);
        if (existing) {
          newVariants.push(existing);
        } else {
          newVariants.push({
            id: `variant_size_${size.id}`,
            sizeId: size.id,
            sizeName: size.name,
            stockQuantity: 0,
            weightUnit: "oz",
            dimensionUnit: "in",
          });
        }
      }
    }

    setCombinedVariants(newVariants);
  };

  const handleUpdateVariantField = (
    variantId: string,
    field: keyof ProductVariant,
    value: string,
  ) => {
    setCombinedVariants(
      combinedVariants.map((v) => {
        if (v.id !== variantId) return v;
        if (
          field === "price" ||
          field === "msrp" ||
          field === "cost" ||
          field === "weight" ||
          field === "length" ||
          field === "width" ||
          field === "height"
        ) {
          return { ...v, [field]: value ? parseFloat(value) : undefined };
        }
        if (field === "stockQuantity") {
          return { ...v, [field]: value ? parseInt(value, 10) : undefined };
        }
        return { ...v, [field]: value };
      }),
    );
  };

  const handleRemoveVariant = (variantId: string) => {
    // If editing an existing product, archive the variant (preserve for order history)
    // If creating a new product, delete it completely (no sales possible yet)
    if (isEditMode) {
      setCombinedVariants(
        combinedVariants.map((v) =>
          v.id === variantId ? { ...v, isArchived: true } : v,
        ),
      );
    } else {
      setCombinedVariants(combinedVariants.filter((v) => v.id !== variantId));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUnarchiveVariant = (variantId: string) => {
    setCombinedVariants(
      combinedVariants.map((v) =>
        v.id === variantId ? { ...v, isArchived: false } : v,
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Get active (non-archived) variants for display and validation
  const activeVariants = combinedVariants.filter((v) => !v.isArchived);
  const archivedVariants = combinedVariants.filter((v) => v.isArchived);

  const handleVariantImagePick = async (variantId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPendingCropImage(uri);
      setCropCallback(() => (croppedUri: string) => {
        setCombinedVariants(
          combinedVariants.map((v) =>
            v.id === variantId ? { ...v, image: croppedUri } : v,
          ),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      });
    }
  };

  const validateVariants = () => {
    // Only validate active (non-archived) variants
    if (activeVariants.length > 0) {
      for (const variant of activeVariants) {
        const variantName = [variant.colorName, variant.sizeName]
          .filter(Boolean)
          .join(" + ");
        if (!variant.price || variant.price <= 0) {
          Alert.alert(
            "Invalid Variant",
            `Variant "${variantName}" must have a price.`,
          );
          return false;
        }
        if (!variant.weight || variant.weight <= 0) {
          Alert.alert(
            "Invalid Variant",
            `Variant "${variantName}" must have a weight.`,
          );
          return false;
        }
        if (variant.stockQuantity === undefined || variant.stockQuantity <= 0) {
          Alert.alert(
            "Invalid Variant",
            `Variant "${variantName}" must have at least 1 in stock.`,
          );
          return false;
        }
      }
    }

    return true;
  };

  // Check if all required fields are filled (for disabling save button)
  const isFormValid = () => {
    // Must have name and at least one image
    if (!name.trim() || images.length === 0) return false;

    // Check if this is a variant-based product
    // A product is variant-based if it has any colors, sizes, or variants (including archived)
    const isVariantProduct =
      combinedVariants.length > 0 || colors.length > 0 || sizes.length > 0;

    if (isVariantProduct) {
      // Variant products: validate active variants only
      // If all variants are archived, that's still valid (product can be saved)
      for (const variant of activeVariants) {
        if (!variant.price || variant.price <= 0) return false;
        if (!variant.weight || variant.weight <= 0) return false;
        if (variant.stockQuantity === undefined || variant.stockQuantity <= 0)
          return false;
      }
    } else {
      // Non-variant products need price and quantity at top level
      if (!price.trim() || isNaN(parseFloat(price))) return false;
      if (!quantityInStock || parseInt(quantityInStock, 10) < 0) return false;
    }

    return true;
  };

  const canSave = isFormValid();

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Field", "Please enter a product name.");
      return;
    }
    if (images.length === 0) {
      Alert.alert("Missing Photo", "Please add at least one photo.");
      return;
    }

    // Validate based on whether product has variants
    const hasVariants =
      colors.length > 0 || sizes.length > 0 || combinedVariants.length > 0;

    if (!hasVariants) {
      // For non-variant products, require price and quantity at top level
      if (!price.trim() || isNaN(parseFloat(price))) {
        Alert.alert("Missing Field", "Please enter a valid price.");
        return;
      }
      if (!quantityInStock || parseInt(quantityInStock, 10) < 1) {
        Alert.alert(
          "Missing Field",
          "Please enter at least 1 for quantity in stock.",
        );
        return;
      }
    }

    if (!validateVariants()) {
      return;
    }

    setSaving(true);
    try {
      // Upload images to Supabase Storage (converts blob URLs to permanent URLs)
      const uploadedImages = await uploadImages(images);
      if (uploadedImages.length === 0) {
        Alert.alert("Error", "Failed to upload images. Please try again.");
        setSaving(false);
        return;
      }

      // Upload variant images and update the variants with permanent URLs
      const uploadedColors = await Promise.all(
        colors.map(async (color) => {
          if (color.image && !color.image.includes("supabase")) {
            const uploadedUrl = await uploadImage(color.image, "variants");
            return { ...color, image: uploadedUrl || undefined };
          }
          return color;
        }),
      );

      const uploadedSizes = await Promise.all(
        sizes.map(async (size) => {
          if (size.image && !size.image.includes("supabase")) {
            const uploadedUrl = await uploadImage(size.image, "variants");
            return { ...size, image: uploadedUrl || undefined };
          }
          return size;
        }),
      );

      const uploadedVariants = await Promise.all(
        combinedVariants.map(async (variant) => {
          if (variant.image && !variant.image.includes("supabase")) {
            const uploadedUrl = await uploadImage(variant.image, "variants");
            return { ...variant, image: uploadedUrl || undefined };
          }
          return variant;
        }),
      );

      // When variants exist, use the first variant's price as the product price
      const hasVariants = uploadedVariants.length > 0;
      const firstVariantPrice = uploadedVariants[0]?.price || 0;
      const productPrice = hasVariants ? firstVariantPrice : parseFloat(price);

      const input: ProductInput = {
        name: name.trim(),
        price: productPrice,
        msrp: msrp ? parseFloat(msrp) : undefined,
        cost: cost ? parseFloat(cost) : undefined,
        image: uploadedImages[0],
        images: uploadedImages,
        description: description.trim(),
        category: category || undefined,
        weight: weight ? parseFloat(weight) : undefined,
        weightUnit: weight ? weightUnit : undefined,
        quantityInStock: quantityInStock
          ? parseInt(quantityInStock, 10)
          : undefined,
        aisle: aisle || undefined,
        bin: bin || undefined,
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
        height: height ? parseFloat(height) : undefined,
        dimensionUnit: length || width || height ? dimensionUnit : undefined,
        barcode: barcode || undefined,
        sku: sku || undefined,
        shippingProfile: shippingProfile || undefined,
        taxCategory: taxCategory || undefined,
        colors: uploadedColors.length > 0 ? uploadedColors : undefined,
        sizes: uploadedSizes.length > 0 ? uploadedSizes : undefined,
        variants: uploadedVariants.length > 0 ? uploadedVariants : undefined,
      };

      if (isEditMode && productId) {
        await productsService.updateProduct(productId, input);
      } else {
        await productsService.createProduct(input);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch {
      Alert.alert(
        "Error",
        `Failed to ${isEditMode ? "update" : "save"} product. Please try again.`,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Loading product...</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={Colors.light.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          {isEditMode ? "Edit Product" : "Create Product"}
        </ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photos Section */}
        <View style={styles.section}>
          <View style={styles.photosRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable
                  style={styles.removePhotoBtn}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Feather name="x" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addPhotoBtn} onPress={handleAddPhoto}>
              <Feather name="image" size={24} color={Colors.light.secondary} />
              <ThemedText style={styles.addPhotoText}>Add Photos</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.photoHint}>* 1 photo required</ThemedText>
        </View>

        {/* Name & Category */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText style={styles.label}>Product Name</ThemedText>
            <View style={styles.priceInputWrapper}>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={name}
                onChangeText={setName}
                placeholder="Product Name"
                placeholderTextColor={Colors.light.textSecondary}
              />
              {!name.trim() && (
                <ThemedText style={styles.requiredBadge}>Required</ThemedText>
              )}
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText style={styles.label}>Category</ThemedText>
            <View style={styles.priceInputWrapper}>
              <Pressable
                style={[styles.selectInput, styles.priceInput]}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <ThemedText
                  style={[
                    styles.selectText,
                    !category && styles.placeholderText,
                  ]}
                >
                  {category || "Select Category"}
                </ThemedText>
                <Feather
                  name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.light.textSecondary}
                />
              </Pressable>
              {!category && (
                <ThemedText style={styles.requiredBadge}>Required</ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Category Dropdown - Separate from row for proper positioning */}
        {showCategoryPicker && (
          <View style={styles.categoryDropdown}>
            <ScrollView
              style={styles.categoryScroll}
              showsVerticalScrollIndicator={false}
            >
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryItem,
                    category === cat && styles.categoryItemActive,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </ThemedText>
                  {category === cat && (
                    <Feather
                      name="check"
                      size={18}
                      color={Colors.light.primary}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Price - Only show for non-variant products */}
        {colors.length === 0 && sizes.length === 0 && (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Price</ThemedText>
              <View style={styles.priceInputWrapper}>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="$0.00"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="decimal-pad"
                />
                {!price && (
                  <ThemedText style={styles.requiredBadge}>Required</ThemedText>
                )}
              </View>
            </View>

            {/* MSRP & Cost */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>MSRP</ThemedText>
                <TextInput
                  style={styles.input}
                  value={msrp}
                  onChangeText={setMsrp}
                  placeholder="$0.00"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>Cost</ThemedText>
                <TextInput
                  style={styles.input}
                  value={cost}
                  onChangeText={setCost}
                  placeholder="$0.00"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        )}

        {/* Weight & Quantity - Only show for non-variant products */}
        {colors.length === 0 && sizes.length === 0 && (
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Weight</ThemedText>
              <View style={styles.inputWithUnit}>
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="0"
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  {!weight && (
                    <ThemedText style={styles.requiredBadge}>
                      Required
                    </ThemedText>
                  )}
                </View>
                <View style={styles.unitPicker}>
                  {WEIGHT_UNITS.map((unit) => (
                    <Pressable
                      key={unit}
                      style={[
                        styles.unitBtn,
                        weightUnit === unit && styles.unitBtnActive,
                      ]}
                      onPress={() => setWeightUnit(unit)}
                    >
                      <ThemedText
                        style={[
                          styles.unitText,
                          weightUnit === unit && styles.unitTextActive,
                        ]}
                      >
                        {unit}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                <ThemedText style={styles.label}>Quantity in Stock</ThemedText>
                {(!quantityInStock || parseInt(quantityInStock, 10) < 1) && (
                  <ThemedText style={styles.requiredBadge}>Required</ThemedText>
                )}
              </View>
              <View style={styles.quantityInput}>
                <Pressable
                  style={styles.quantityBtn}
                  onPress={() =>
                    setQuantityInStock(
                      String(
                        Math.max(0, parseInt(quantityInStock || "0", 10) - 1),
                      ),
                    )
                  }
                >
                  <Feather name="minus" size={18} color={Colors.light.text} />
                </Pressable>
                <TextInput
                  style={[styles.input, styles.quantityField]}
                  value={quantityInStock}
                  onChangeText={setQuantityInStock}
                  placeholder="0"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="number-pad"
                />
                <Pressable
                  style={styles.quantityBtn}
                  onPress={() =>
                    setQuantityInStock(
                      String(parseInt(quantityInStock || "0", 10) + 1),
                    )
                  }
                >
                  <Feather name="plus" size={18} color={Colors.light.text} />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Aisle & Bin - Only show for non-variant products */}
        {colors.length === 0 && sizes.length === 0 && (
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Aisle</ThemedText>
              <TextInput
                style={styles.input}
                value={aisle}
                onChangeText={setAisle}
                placeholder="Aisle"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Bin</ThemedText>
              <TextInput
                style={styles.input}
                value={bin}
                onChangeText={setBin}
                placeholder="Bin"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
          </View>
        )}

        {/* Dimensions - Only show for non-variant products */}
        {colors.length === 0 && sizes.length === 0 && (
          <>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>Length</ThemedText>
                <TextInput
                  style={styles.input}
                  value={length}
                  onChangeText={setLength}
                  placeholder="Length"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>Width</ThemedText>
                <TextInput
                  style={styles.input}
                  value={width}
                  onChangeText={setWidth}
                  placeholder="Width"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>Height</ThemedText>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="Height"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { width: 80 }]}>
                <ThemedText style={styles.label}>Units</ThemedText>
                <View style={styles.unitPicker}>
                  {DIMENSION_UNITS.map((unit) => (
                    <Pressable
                      key={unit}
                      style={[
                        styles.unitBtn,
                        dimensionUnit === unit && styles.unitBtnActive,
                      ]}
                      onPress={() => setDimensionUnit(unit)}
                    >
                      <ThemedText
                        style={[
                          styles.unitText,
                          dimensionUnit === unit && styles.unitTextActive,
                        ]}
                      >
                        {unit}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
            <ThemedText style={styles.hint}>
              All measurements must be filled in or left blank.
            </ThemedText>
          </>
        )}

        {/* Barcode & SKU - Only show for non-variant products */}
        {colors.length === 0 && sizes.length === 0 && (
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Barcode</ThemedText>
              <TextInput
                style={styles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Barcode"
                placeholderTextColor={Colors.light.textSecondary}
              />
              <ThemedText style={styles.hint}>
                A barcode will automatically be generated if this field is left
                blank
              </ThemedText>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>
                SKU (Stock Keeping Unit)
              </ThemedText>
              <TextInput
                style={styles.input}
                value={sku}
                onChangeText={setSku}
                placeholder="SKU"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Product description..."
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Color Variants */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>COLOR VARIANTS</ThemedText>
        </View>
        {colors
          .filter((c) => !c.isArchived)
          .map((color) => (
            <View key={color.id} style={styles.variantCard}>
              <View style={styles.variantCardHeader}>
                <View style={styles.variantCardLeft}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: color.hexCode },
                    ]}
                  />
                  <ThemedText style={styles.variantCardTitle}>
                    {color.name}
                  </ThemedText>
                </View>
                <View style={styles.variantCardActions}>
                  {/* Only show edit button if no sizes exist (otherwise use combined variants) */}
                  {sizes.length === 0 && (
                    <Pressable
                      onPress={() => toggleEditColor(color.id)}
                      style={styles.variantEditBtn}
                    >
                      <Feather
                        name={
                          editingColorId === color.id ? "chevron-up" : "edit-2"
                        }
                        size={16}
                        color={Colors.light.secondary}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleRemoveColor(color.id)}
                    style={styles.variantRemoveBtn}
                  >
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              {editingColorId === color.id && sizes.length === 0 && (
                <View style={styles.variantCardBody}>
                  <Pressable
                    style={styles.variantImagePickerLarge}
                    onPress={() => handleColorImagePick(color.id)}
                  >
                    {color.image ? (
                      <Image
                        source={{ uri: color.image }}
                        style={styles.variantImagePreview}
                      />
                    ) : (
                      <>
                        <Feather
                          name="image"
                          size={32}
                          color={Colors.light.secondary}
                        />
                        <ThemedText style={styles.variantImageText}>
                          Add Image
                        </ThemedText>
                      </>
                    )}
                  </Pressable>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Base Price</ThemedText>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.input}
                          value={color.msrp?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateColorField(color.id, "msrp", v)
                          }
                          placeholder="MSRP"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.input}
                          value={color.cost?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateColorField(color.id, "cost", v)
                          }
                          placeholder="Cost"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Weight</ThemedText>
                    <View style={styles.inputWithUnit}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={color.weight?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateColorField(color.id, "weight", v)
                        }
                        placeholder="0"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.input, { width: 60 }]}
                        value={color.weightUnit || "oz"}
                        onChangeText={(v) =>
                          handleUpdateColorField(color.id, "weightUnit", v)
                        }
                        placeholder="oz"
                        placeholderTextColor={Colors.light.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Dimensions</ThemedText>
                    <View style={styles.row}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={color.length?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateColorField(color.id, "length", v)
                        }
                        placeholder="Length"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={color.width?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateColorField(color.id, "width", v)
                        }
                        placeholder="Width"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={color.height?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateColorField(color.id, "height", v)
                        }
                        placeholder="Height"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>SKU</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={color.sku || ""}
                      onChangeText={(v) =>
                        handleUpdateColorField(color.id, "sku", v)
                      }
                      placeholder="SKU (Stock Keeping Unit)"
                      placeholderTextColor={Colors.light.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Barcode</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={color.barcode || ""}
                      onChangeText={(v) =>
                        handleUpdateColorField(color.id, "barcode", v)
                      }
                      placeholder="Barcode"
                      placeholderTextColor={Colors.light.textSecondary}
                    />
                    <ThemedText style={styles.hint}>
                      A barcode will automatically be generated if this field is
                      left blank
                    </ThemedText>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>
                      Quantity in Stock
                    </ThemedText>
                    <View style={styles.stockControl}>
                      <Pressable
                        style={styles.stockBtn}
                        onPress={() => {
                          const current = color.stockQuantity || 0;
                          if (current > 0) {
                            handleUpdateColorField(
                              color.id,
                              "stockQuantity",
                              (current - 1).toString(),
                            );
                          }
                        }}
                      >
                        <Feather
                          name="minus"
                          size={16}
                          color={Colors.light.text}
                        />
                      </Pressable>
                      <TextInput
                        style={styles.stockInput}
                        value={color.stockQuantity?.toString() || "0"}
                        onChangeText={(v) =>
                          handleUpdateColorField(color.id, "stockQuantity", v)
                        }
                        keyboardType="number-pad"
                      />
                      <Pressable
                        style={styles.stockBtn}
                        onPress={() => {
                          const current = color.stockQuantity || 0;
                          handleUpdateColorField(
                            color.id,
                            "stockQuantity",
                            (current + 1).toString(),
                          );
                        }}
                      >
                        <Feather
                          name="plus"
                          size={16}
                          color={Colors.light.text}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}
        <View style={styles.colorInputContainer}>
          <View style={styles.addVariantRow}>
            <Pressable
              style={[styles.colorPreview, { backgroundColor: newColorHex }]}
              onPress={() => setShowColorPicker(true)}
            >
              <Feather name="droplet" size={16} color="#fff" />
            </Pressable>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newColorName}
              onChangeText={(text) => {
                setNewColorName(text);
                setShowColorDropdown(text.length > 0);
                // Auto-select hex if it matches a common color
                const match = COMMON_COLORS.find(
                  (c) => c.name.toLowerCase() === text.toLowerCase(),
                );
                if (match) {
                  setNewColorHex(match.hex);
                }
              }}
              onFocus={() => setShowColorDropdown(true)}
              onBlur={() => setTimeout(() => setShowColorDropdown(false), 200)}
              placeholder="Type or select a color..."
              placeholderTextColor={Colors.light.textSecondary}
            />
            <Pressable
              style={[styles.input, styles.colorHexButton]}
              onPress={() => setShowColorPicker(true)}
            >
              <ThemedText style={styles.colorHexText}>{newColorHex}</ThemedText>
            </Pressable>
            <Pressable style={styles.addVariantBtn} onPress={handleAddColor}>
              <Feather name="plus" size={20} color={Colors.light.buttonText} />
            </Pressable>
          </View>
          {showColorDropdown && (
            <View style={styles.colorDropdown}>
              <ScrollView
                style={styles.colorDropdownScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {COMMON_COLORS.filter((color) =>
                  color.name.toLowerCase().includes(newColorName.toLowerCase()),
                )
                  .slice(0, 12)
                  .map((color) => (
                    <Pressable
                      key={color.name}
                      style={styles.colorDropdownItem}
                      onPress={() => {
                        setNewColorName(color.name);
                        setNewColorHex(color.hex);
                        setShowColorDropdown(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View style={styles.colorDropdownItemLeft}>
                        <View
                          style={[
                            styles.colorDropdownSwatch,
                            { backgroundColor: color.hex },
                          ]}
                        />
                        <ThemedText style={styles.colorDropdownItemText}>
                          {color.name}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.colorDropdownItemHex}>
                        {color.hex}
                      </ThemedText>
                    </Pressable>
                  ))}
                {newColorName.trim() &&
                  !COMMON_COLORS.some(
                    (c) => c.name.toLowerCase() === newColorName.toLowerCase(),
                  ) && (
                    <Pressable
                      style={[
                        styles.colorDropdownItem,
                        styles.colorDropdownItemCustom,
                      ]}
                      onPress={() => {
                        setShowColorDropdown(false);
                        setShowColorPicker(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View style={styles.colorDropdownItemLeft}>
                        <View
                          style={[
                            styles.colorDropdownSwatch,
                            { backgroundColor: newColorHex },
                          ]}
                        />
                        <ThemedText style={styles.colorDropdownItemText}>
                          &quot;{newColorName}&quot; (custom - pick color)
                        </ThemedText>
                      </View>
                    </Pressable>
                  )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Size Variants */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>SIZE VARIANTS</ThemedText>
        </View>
        {sizes
          .filter((s) => !s.isArchived)
          .map((size) => (
            <View key={size.id} style={styles.variantCard}>
              <View style={styles.variantCardHeader}>
                <ThemedText style={styles.variantCardTitle}>
                  {size.name}
                </ThemedText>
                <View style={styles.variantCardActions}>
                  {/* Only show edit button if no colors exist (otherwise use combined variants) */}
                  {colors.length === 0 && (
                    <Pressable
                      onPress={() => toggleEditSize(size.id)}
                      style={styles.variantEditBtn}
                    >
                      <Feather
                        name={
                          editingSizeId === size.id ? "chevron-up" : "edit-2"
                        }
                        size={16}
                        color={Colors.light.secondary}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleRemoveSize(size.id)}
                    style={styles.variantRemoveBtn}
                  >
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              {editingSizeId === size.id && colors.length === 0 && (
                <View style={styles.variantCardBody}>
                  <Pressable
                    style={styles.variantImagePickerLarge}
                    onPress={() => handleSizeImagePick(size.id)}
                  >
                    {size.image ? (
                      <Image
                        source={{ uri: size.image }}
                        style={styles.variantImagePreview}
                      />
                    ) : (
                      <>
                        <Feather
                          name="image"
                          size={32}
                          color={Colors.light.secondary}
                        />
                        <ThemedText style={styles.variantImageText}>
                          Add Image
                        </ThemedText>
                      </>
                    )}
                  </Pressable>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Base Price</ThemedText>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.input}
                          value={size.msrp?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateSizeField(size.id, "msrp", v)
                          }
                          placeholder="MSRP"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.input}
                          value={size.cost?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateSizeField(size.id, "cost", v)
                          }
                          placeholder="Cost"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Weight</ThemedText>
                    <View style={styles.inputWithUnit}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={size.weight?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateSizeField(size.id, "weight", v)
                        }
                        placeholder="0"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.input, { width: 60 }]}
                        value={size.weightUnit || "oz"}
                        onChangeText={(v) =>
                          handleUpdateSizeField(size.id, "weightUnit", v)
                        }
                        placeholder="oz"
                        placeholderTextColor={Colors.light.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Dimensions</ThemedText>
                    <View style={styles.row}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={size.length?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateSizeField(size.id, "length", v)
                        }
                        placeholder="Length"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={size.width?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateSizeField(size.id, "width", v)
                        }
                        placeholder="Width"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={size.height?.toString() || ""}
                        onChangeText={(v) =>
                          handleUpdateSizeField(size.id, "height", v)
                        }
                        placeholder="Height"
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>SKU</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={size.sku || ""}
                      onChangeText={(v) =>
                        handleUpdateSizeField(size.id, "sku", v)
                      }
                      placeholder="SKU (Stock Keeping Unit)"
                      placeholderTextColor={Colors.light.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Barcode</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={size.barcode || ""}
                      onChangeText={(v) =>
                        handleUpdateSizeField(size.id, "barcode", v)
                      }
                      placeholder="Barcode"
                      placeholderTextColor={Colors.light.textSecondary}
                    />
                    <ThemedText style={styles.hint}>
                      A barcode will automatically be generated if this field is
                      left blank
                    </ThemedText>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>
                      Quantity in Stock
                    </ThemedText>
                    <View style={styles.stockControl}>
                      <Pressable
                        style={styles.stockBtn}
                        onPress={() => {
                          const current = size.stockQuantity || 0;
                          if (current > 0) {
                            handleUpdateSizeField(
                              size.id,
                              "stockQuantity",
                              (current - 1).toString(),
                            );
                          }
                        }}
                      >
                        <Feather
                          name="minus"
                          size={16}
                          color={Colors.light.text}
                        />
                      </Pressable>
                      <TextInput
                        style={styles.stockInput}
                        value={size.stockQuantity?.toString() || "0"}
                        onChangeText={(v) =>
                          handleUpdateSizeField(size.id, "stockQuantity", v)
                        }
                        keyboardType="number-pad"
                      />
                      <Pressable
                        style={styles.stockBtn}
                        onPress={() => {
                          const current = size.stockQuantity || 0;
                          handleUpdateSizeField(
                            size.id,
                            "stockQuantity",
                            (current + 1).toString(),
                          );
                        }}
                      >
                        <Feather
                          name="plus"
                          size={16}
                          color={Colors.light.text}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}
        <View style={styles.sizeInputContainer}>
          <View style={styles.addVariantRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newSizeName}
              onChangeText={(text) => {
                setNewSizeName(text);
                setShowSizeDropdown(text.length > 0);
              }}
              onFocus={() => setShowSizeDropdown(true)}
              onBlur={() => setTimeout(() => setShowSizeDropdown(false), 200)}
              placeholder="Type or select a size..."
              placeholderTextColor={Colors.light.textSecondary}
            />
            <Pressable style={styles.addVariantBtn} onPress={handleAddSize}>
              <Feather name="plus" size={20} color={Colors.light.buttonText} />
            </Pressable>
          </View>
          {showSizeDropdown && (
            <View style={styles.sizeDropdown}>
              <ScrollView
                style={styles.sizeDropdownScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {/* Filter sizes based on input */}
                {ALL_COMMON_SIZES.filter(
                  (item) =>
                    item.size
                      .toLowerCase()
                      .includes(newSizeName.toLowerCase()) ||
                    item.category
                      .toLowerCase()
                      .includes(newSizeName.toLowerCase()),
                )
                  .slice(0, 20)
                  .map((item, index) => (
                    <Pressable
                      key={`${item.category}-${item.size}-${index}`}
                      style={styles.sizeDropdownItem}
                      onPress={() => {
                        setNewSizeName(item.size);
                        setShowSizeDropdown(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <ThemedText style={styles.sizeDropdownItemText}>
                        {item.size}
                      </ThemedText>
                      <ThemedText style={styles.sizeDropdownItemCategory}>
                        {item.category}
                      </ThemedText>
                    </Pressable>
                  ))}
                {newSizeName.trim() &&
                  !ALL_COMMON_SIZES.some(
                    (item) =>
                      item.size.toLowerCase() === newSizeName.toLowerCase(),
                  ) && (
                    <Pressable
                      style={[
                        styles.sizeDropdownItem,
                        styles.sizeDropdownItemCustom,
                      ]}
                      onPress={() => {
                        setShowSizeDropdown(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <ThemedText style={styles.sizeDropdownItemText}>
                        &quot;{newSizeName}&quot; (custom)
                      </ThemedText>
                    </Pressable>
                  )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Archived Colors - Show with unarchive option */}
        {isEditMode && colors.filter((c) => c.isArchived).length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                ARCHIVED COLORS
              </ThemedText>
            </View>
            {colors
              .filter((c) => c.isArchived)
              .map((color) => (
                <View
                  key={color.id}
                  style={[styles.variantCard, styles.archivedVariantCard]}
                >
                  <View style={styles.variantCardHeader}>
                    <View style={styles.variantCardLeft}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: color.hexCode },
                        ]}
                      />
                      <ThemedText style={styles.archivedVariantTitle}>
                        {color.name}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => handleUnarchiveColor(color.id)}
                      style={styles.unarchiveBtn}
                    >
                      <Feather name="rotate-ccw" size={16} color="#10B981" />
                      <ThemedText style={styles.unarchiveBtnText}>
                        Restore
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
          </>
        )}

        {/* Archived Sizes - Show with unarchive option */}
        {isEditMode && sizes.filter((s) => s.isArchived).length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                ARCHIVED SIZES
              </ThemedText>
            </View>
            {sizes
              .filter((s) => s.isArchived)
              .map((size) => (
                <View
                  key={size.id}
                  style={[styles.variantCard, styles.archivedVariantCard]}
                >
                  <View style={styles.variantCardHeader}>
                    <ThemedText style={styles.archivedVariantTitle}>
                      {size.name}
                    </ThemedText>
                    <Pressable
                      onPress={() => handleUnarchiveSize(size.id)}
                      style={styles.unarchiveBtn}
                    >
                      <Feather name="rotate-ccw" size={16} color="#10B981" />
                      <ThemedText style={styles.unarchiveBtnText}>
                        Restore
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
          </>
        )}

        {/* Variant Details - Shows for color-only, size-only, or combined */}
        {activeVariants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                VARIANT DETAILS
              </ThemedText>
            </View>
            <ThemedText style={styles.hint}>
              Set pricing and inventory for each variant
            </ThemedText>
            {activeVariants.map((variant) => (
              <View key={variant.id} style={styles.variantCard}>
                <View style={styles.variantCardHeader}>
                  <View style={styles.variantCardLeft}>
                    {variant.colorName && (
                      <View
                        style={[
                          styles.colorDot,
                          {
                            backgroundColor:
                              colors.find((c) => c.id === variant.colorId)
                                ?.hexCode || "#888",
                          },
                        ]}
                      />
                    )}
                    <ThemedText style={styles.variantCardTitle}>
                      {[variant.colorName, variant.sizeName]
                        .filter(Boolean)
                        .join(" + ")}
                    </ThemedText>
                  </View>
                  <View style={styles.variantCardActions}>
                    <Pressable
                      onPress={() => toggleEditVariant(variant.id)}
                      style={styles.variantEditBtn}
                    >
                      <Feather
                        name={
                          editingVariantId === variant.id
                            ? "chevron-up"
                            : "edit-2"
                        }
                        size={16}
                        color={Colors.light.secondary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveVariant(variant.id)}
                      style={styles.variantRemoveBtn}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
                {editingVariantId === variant.id && (
                  <View style={styles.variantCardBody}>
                    <Pressable
                      style={styles.variantImagePickerLarge}
                      onPress={() => handleVariantImagePick(variant.id)}
                    >
                      {variant.image ? (
                        <Image
                          source={{ uri: variant.image }}
                          style={styles.variantImagePreview}
                        />
                      ) : (
                        <>
                          <Feather
                            name="image"
                            size={32}
                            color={Colors.light.secondary}
                          />
                          <ThemedText style={styles.variantImageText}>
                            Add Variant Image
                          </ThemedText>
                        </>
                      )}
                    </Pressable>

                    <View style={styles.inputGroup}>
                      <ThemedText style={styles.label}>Pricing</ThemedText>
                      <View style={styles.row}>
                        <View style={styles.priceInputWrapper}>
                          <TextInput
                            style={[styles.input, styles.priceInput]}
                            value={variant.price?.toString() || ""}
                            onChangeText={(v) =>
                              handleUpdateVariantField(variant.id, "price", v)
                            }
                            placeholder="Price"
                            placeholderTextColor={Colors.light.textSecondary}
                            keyboardType="decimal-pad"
                          />
                          {!variant.price && (
                            <ThemedText style={styles.requiredBadge}>
                              Required
                            </ThemedText>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={styles.input}
                            value={variant.msrp?.toString() || ""}
                            onChangeText={(v) =>
                              handleUpdateVariantField(variant.id, "msrp", v)
                            }
                            placeholder="MSRP"
                            placeholderTextColor={Colors.light.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={styles.input}
                            value={variant.cost?.toString() || ""}
                            onChangeText={(v) =>
                              handleUpdateVariantField(variant.id, "cost", v)
                            }
                            placeholder="Cost"
                            placeholderTextColor={Colors.light.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <ThemedText style={styles.label}>
                        SKU & Barcode
                      </ThemedText>
                      <View style={styles.row}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.sku || ""}
                          onChangeText={(v) =>
                            handleUpdateVariantField(variant.id, "sku", v)
                          }
                          placeholder="SKU"
                          placeholderTextColor={Colors.light.textSecondary}
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.barcode || ""}
                          onChangeText={(v) =>
                            handleUpdateVariantField(variant.id, "barcode", v)
                          }
                          placeholder="Barcode"
                          placeholderTextColor={Colors.light.textSecondary}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <ThemedText style={styles.label}>Weight</ThemedText>
                        {!variant.weight && (
                          <ThemedText style={styles.requiredBadge}>
                            Required
                          </ThemedText>
                        )}
                      </View>
                      <View style={styles.row}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.weight?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateVariantField(variant.id, "weight", v)
                          }
                          placeholder="Weight"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                        <View style={styles.unitPicker}>
                          {WEIGHT_UNITS.map((unit) => (
                            <Pressable
                              key={unit}
                              style={[
                                styles.unitBtn,
                                variant.weightUnit === unit &&
                                  styles.unitBtnActive,
                              ]}
                              onPress={() =>
                                handleUpdateVariantField(
                                  variant.id,
                                  "weightUnit",
                                  unit,
                                )
                              }
                            >
                              <ThemedText
                                style={[
                                  styles.unitText,
                                  variant.weightUnit === unit &&
                                    styles.unitTextActive,
                                ]}
                              >
                                {unit}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <ThemedText style={styles.label}>Dimensions</ThemedText>
                      <View style={styles.row}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.length?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateVariantField(variant.id, "length", v)
                          }
                          placeholder="Length"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.width?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateVariantField(variant.id, "width", v)
                          }
                          placeholder="Width"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.height?.toString() || ""}
                          onChangeText={(v) =>
                            handleUpdateVariantField(variant.id, "height", v)
                          }
                          placeholder="Height"
                          placeholderTextColor={Colors.light.textSecondary}
                          keyboardType="decimal-pad"
                        />
                        <View style={styles.unitPicker}>
                          {DIMENSION_UNITS.map((unit) => (
                            <Pressable
                              key={unit}
                              style={[
                                styles.unitBtn,
                                variant.dimensionUnit === unit &&
                                  styles.unitBtnActive,
                              ]}
                              onPress={() =>
                                handleUpdateVariantField(
                                  variant.id,
                                  "dimensionUnit",
                                  unit,
                                )
                              }
                            >
                              <ThemedText
                                style={[
                                  styles.unitText,
                                  variant.dimensionUnit === unit &&
                                    styles.unitTextActive,
                                ]}
                              >
                                {unit}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <ThemedText style={styles.label}>
                          Quantity in Stock
                        </ThemedText>
                        {(variant.stockQuantity === undefined ||
                          variant.stockQuantity <= 0) && (
                          <ThemedText style={styles.requiredBadge}>
                            Required
                          </ThemedText>
                        )}
                      </View>
                      <View style={styles.stockControl}>
                        <Pressable
                          style={styles.stockBtn}
                          onPress={() => {
                            const current = variant.stockQuantity || 0;
                            if (current > 0) {
                              handleUpdateVariantField(
                                variant.id,
                                "stockQuantity",
                                (current - 1).toString(),
                              );
                            }
                          }}
                        >
                          <Feather
                            name="minus"
                            size={16}
                            color={Colors.light.text}
                          />
                        </Pressable>
                        <TextInput
                          style={styles.stockInput}
                          value={variant.stockQuantity?.toString() || "0"}
                          onChangeText={(v) =>
                            handleUpdateVariantField(
                              variant.id,
                              "stockQuantity",
                              v,
                            )
                          }
                          keyboardType="number-pad"
                        />
                        <Pressable
                          style={styles.stockBtn}
                          onPress={() => {
                            const current = variant.stockQuantity || 0;
                            handleUpdateVariantField(
                              variant.id,
                              "stockQuantity",
                              (current + 1).toString(),
                            );
                          }}
                        >
                          <Feather
                            name="plus"
                            size={16}
                            color={Colors.light.text}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Archived Variants - Show with unarchive option */}
        {archivedVariants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                ARCHIVED VARIANTS
              </ThemedText>
            </View>
            <ThemedText style={styles.hint}>
              These variants are hidden but preserved for order history
            </ThemedText>
            {archivedVariants.map((variant) => (
              <View
                key={variant.id}
                style={[styles.variantCard, styles.archivedVariantCard]}
              >
                <View style={styles.variantCardHeader}>
                  <View style={styles.variantCardLeft}>
                    {variant.colorName && (
                      <View
                        style={[
                          styles.colorDot,
                          {
                            backgroundColor:
                              colors.find((c) => c.id === variant.colorId)
                                ?.hexCode || "#888",
                          },
                        ]}
                      />
                    )}
                    <ThemedText style={styles.archivedVariantTitle}>
                      {[variant.colorName, variant.sizeName]
                        .filter(Boolean)
                        .join(" + ")}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleUnarchiveVariant(variant.id)}
                    style={styles.unarchiveBtn}
                  >
                    <Feather name="rotate-ccw" size={16} color="#10B981" />
                    <ThemedText style={styles.unarchiveBtnText}>
                      Restore
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Shipping Profile */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>SHIPPING</ThemedText>
        </View>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Shipping Profile</ThemedText>
          <Pressable style={styles.selectInput}>
            <ThemedText style={styles.selectText}>{shippingProfile}</ThemedText>
            <Feather
              name="chevron-down"
              size={18}
              color={Colors.light.textSecondary}
            />
          </Pressable>
          <ThemedText style={styles.hint}>
            Select a shipping profile to automatically estimate shipping prices
            for your customers.
          </ThemedText>
        </View>

        {/* Tax Category */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>TAX</ThemedText>
        </View>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Tax Category</ThemedText>
          <View style={styles.priceInputWrapper}>
            <Pressable
              style={[styles.selectInput, styles.priceInput]}
              onPress={() => setShowTaxCategoryPicker(!showTaxCategoryPicker)}
            >
              <ThemedText
                style={[
                  styles.selectText,
                  !taxCategory && styles.placeholderText,
                ]}
              >
                {taxCategory || "Select Tax Category"}
              </ThemedText>
              <Feather
                name={showTaxCategoryPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.light.textSecondary}
              />
            </Pressable>
            {!taxCategory && (
              <ThemedText style={styles.requiredBadge}>Required</ThemedText>
            )}
          </View>
        </View>

        {/* Tax Category Dropdown */}
        {showTaxCategoryPicker && (
          <View style={styles.categoryDropdown}>
            {loadingTaxCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.light.primary} />
                <ThemedText style={styles.loadingText}>
                  Loading tax categories...
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                style={styles.categoryScroll}
                showsVerticalScrollIndicator={false}
              >
                {taxCategories.map((cat: TaxCategory) => (
                  <Pressable
                    key={cat.product_tax_code}
                    style={[
                      styles.categoryItem,
                      taxCategory === cat.name && styles.categoryItemActive,
                    ]}
                    onPress={() => {
                      setTaxCategory(cat.name);
                      setShowTaxCategoryPicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={styles.taxCategoryInfo}>
                      <ThemedText
                        style={[
                          styles.categoryText,
                          taxCategory === cat.name && styles.categoryTextActive,
                        ]}
                      >
                        {cat.name}
                      </ThemedText>
                      <ThemedText style={styles.taxCategoryCode}>
                        Code: {cat.product_tax_code}
                      </ThemedText>
                    </View>
                    {taxCategory === cat.name && (
                      <Feather
                        name="check"
                        size={18}
                        color={Colors.light.primary}
                      />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.inputGroup}>
          <ThemedText style={styles.hint}>
            We use tax categories to determine if your product is taxable during
            checkout.
          </ThemedText>
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.saveBtn,
              (saving || !canSave) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || !canSave}
          >
            <ThemedText style={styles.saveBtnText}>
              {saving ? "Saving..." : "Save"}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <ColorPicker
        visible={showColorPicker}
        initialColor={newColorHex}
        onColorSelected={(color) => setNewColorHex(color)}
        onClose={() => setShowColorPicker(false)}
      />

      <ImageCropperModal
        visible={!!pendingCropImage}
        imageUri={pendingCropImage || ""}
        aspectRatio={[1, 1]}
        onCrop={(croppedUri) => {
          if (cropCallback) {
            cropCallback(croppedUri);
          }
          setPendingCropImage(null);
          setCropCallback(null);
        }}
        onCancel={() => {
          setPendingCropImage(null);
          setCropCallback(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  section: {
    marginBottom: Spacing.lg,
  },
  photosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 100,
    height: 80,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.light.secondary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.secondary,
  },
  photoHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  placeholderText: {
    color: Colors.light.textSecondary,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    zIndex: 100,
    ...Shadows.lg,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  categoryDropdown: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.md,
    ...Shadows.lg,
    overflow: "hidden",
  },
  colorInputContainer: {
    position: "relative",
    zIndex: 101,
  },
  colorDropdown: {
    position: "absolute",
    top: 52,
    left: 44,
    right: 100,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...Shadows.lg,
    zIndex: 102,
  },
  colorDropdownScroll: {
    maxHeight: 250,
  },
  colorDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  colorDropdownItemCustom: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  colorDropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  colorDropdownSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  colorDropdownItemText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: "500",
  },
  colorDropdownItemHex: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontFamily: "monospace",
  },
  sizeInputContainer: {
    position: "relative",
    zIndex: 100,
  },
  sizeDropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 56,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...Shadows.lg,
    zIndex: 101,
  },
  sizeDropdownScroll: {
    maxHeight: 200,
  },
  sizeDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sizeDropdownItemCustom: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  sizeDropdownItemText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: "500",
  },
  sizeDropdownItemCategory: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  categoryScroll: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoryItemActive: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  categoryText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  categoryTextActive: {
    fontWeight: "600",
    color: Colors.light.primary,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF4444",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  inputRequired: {
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  priceInput: {
    flex: 1,
  },
  archivedVariantCard: {
    opacity: 0.6,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  archivedVariantTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  unarchiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: "#D1FAE5",
    borderRadius: BorderRadius.sm,
  },
  unarchiveBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  taxCategoryInfo: {
    flex: 1,
  },
  taxCategoryCode: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  unitPicker: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    padding: 2,
  },
  unitBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  unitBtnActive: {
    backgroundColor: Colors.light.secondary,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  unitTextActive: {
    color: Colors.light.buttonText,
  },
  quantityInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityField: {
    flex: 1,
    textAlign: "center",
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  scanBtn: {
    position: "absolute",
    right: Spacing.sm,
    padding: Spacing.xs,
  },
  hint: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: Spacing.xl,
  },
  saveBtn: {
    width: "100%",
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: Colors.light.buttonText,
    fontSize: 16,
    fontWeight: "700",
  },
  variantsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  variantChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    gap: Spacing.xs,
  },
  variantChipText: {
    fontSize: 13,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  addVariantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  colorHexButton: {
    width: 80,
    justifyContent: "center",
  },
  colorHexText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: Colors.light.text,
  },
  addVariantBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  variantCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  variantCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  variantCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  variantCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  variantCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  variantEditBtn: {
    padding: Spacing.xs,
  },
  variantRemoveBtn: {
    padding: Spacing.xs,
  },
  variantCardBody: {
    padding: Spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  variantImageRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  variantImagePicker: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.backgroundRoot,
  },
  variantImagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.sm,
  },
  variantImageText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  variantFieldsColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  variantFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  variantFieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.textSecondary,
    width: 45,
  },
  variantFieldInput: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  variantImagePickerLarge: {
    width: "100%",
    height: 120,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.backgroundRoot,
    marginBottom: Spacing.md,
  },
  stockControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stockBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  stockInput: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    textAlign: "center",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  generateBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.buttonText,
  },
  requiredHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  addVariantSection: {
    marginBottom: Spacing.md,
  },
});
