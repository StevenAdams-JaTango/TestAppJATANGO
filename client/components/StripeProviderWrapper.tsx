// Platform-specific entry point.
// Metro resolves .native.tsx on iOS/Android and .web.tsx on web.
// This file serves as the default fallback (same as web — no Stripe).
import React from "react";

export function StripeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
