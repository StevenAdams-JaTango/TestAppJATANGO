// Native platforms use Stripe PaymentSheet directly — this is a no-op stub.
// Metro will resolve AddCardModal.native.tsx on iOS/Android.

export function AddCardModal(_props: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return null;
}
