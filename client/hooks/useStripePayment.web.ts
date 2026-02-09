// Stripe is not available on web — provide no-op stubs
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
