// Platform-specific entry point.
// Metro resolves .native.ts on iOS/Android and .web.ts on web.
// This file serves as the default fallback (same as web — no-op stubs).

const unavailable = {
  error: { code: "Unavailable", message: "Stripe is not available on web" },
};

export function useStripe() {
  return {
    initPaymentSheet: async (_params?: unknown) => unavailable,
    presentPaymentSheet: async (_params?: unknown) => unavailable,
    confirmPaymentSheetPayment: async (_params?: unknown) => unavailable,
  };
}

export function usePaymentSheet() {
  return {
    initPaymentSheet: async (_params?: unknown) => unavailable,
    presentPaymentSheet: async (_params?: unknown) => unavailable,
  };
}
