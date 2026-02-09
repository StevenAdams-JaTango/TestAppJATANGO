// Platform-specific entry point.
// Metro resolves .native.tsx on iOS/Android and .web.tsx on web.
// This file serves as the default fallback (same as native — no-op).

export function AddCardModal(_props: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return null;
}
