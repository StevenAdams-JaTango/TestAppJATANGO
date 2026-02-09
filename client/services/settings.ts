import { getApiUrl } from "@/lib/query-client";
import { ShippingAddress } from "@/types";

// ─── Payment Methods ───

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface SetupIntentResponse {
  clientSecret: string;
  ephemeralKey: string;
  customerId: string;
}

async function createSetupIntent(
  userId: string,
  email?: string,
): Promise<SetupIntentResponse> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/stripe/setup-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, email }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create setup intent");
  }

  return response.json();
}

async function fetchPaymentMethods(
  userId: string,
): Promise<SavedPaymentMethod[]> {
  const apiUrl = getApiUrl();
  const response = await fetch(
    `${apiUrl}/api/stripe/payment-methods/${userId}`,
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch payment methods");
  }

  const data = await response.json();
  return data.paymentMethods;
}

async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const apiUrl = getApiUrl();
  const response = await fetch(
    `${apiUrl}/api/stripe/payment-methods/${paymentMethodId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to remove payment method");
  }
}

// ─── Shipping Addresses ───

async function fetchAddresses(userId: string): Promise<ShippingAddress[]> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/addresses/${userId}`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch addresses");
  }

  const data = await response.json();
  return (data.addresses || []).map(mapAddress);
}

async function createAddress(
  address: Omit<ShippingAddress, "id" | "createdAt" | "updatedAt"> & {
    userId: string;
  },
): Promise<ShippingAddress> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: address.userId,
      name: address.name,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create address");
  }

  const data = await response.json();
  return mapAddress(data.address);
}

async function updateAddress(
  addressId: string,
  updates: Partial<ShippingAddress>,
): Promise<ShippingAddress> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/addresses/${addressId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: updates.name,
      addressLine1: updates.addressLine1,
      addressLine2: updates.addressLine2,
      city: updates.city,
      state: updates.state,
      zip: updates.zip,
      country: updates.country,
      phone: updates.phone,
      isDefault: updates.isDefault,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to update address");
  }

  const data = await response.json();
  return mapAddress(data.address);
}

async function deleteAddress(addressId: string): Promise<void> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/addresses/${addressId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to delete address");
  }
}

async function setDefaultAddress(addressId: string): Promise<ShippingAddress> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/addresses/${addressId}/default`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to set default address");
  }

  const data = await response.json();
  return mapAddress(data.address);
}

// Map snake_case DB response to camelCase client type
function mapAddress(raw: Record<string, unknown>): ShippingAddress {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    name: raw.name as string,
    addressLine1: raw.address_line1 as string,
    addressLine2: (raw.address_line2 as string) || undefined,
    city: raw.city as string,
    state: raw.state as string,
    zip: raw.zip as string,
    country: (raw.country as string) || "US",
    phone: (raw.phone as string) || undefined,
    isDefault: (raw.is_default as boolean) || false,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}

export const settingsService = {
  createSetupIntent,
  fetchPaymentMethods,
  deletePaymentMethod,
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
