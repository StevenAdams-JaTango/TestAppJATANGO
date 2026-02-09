// This file is only imported on web via Platform check.
// It uses @stripe/react-stripe-js which is a web-only package.
import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface WebCardFormInnerProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function WebCardFormInner({
  clientSecret,
  onSuccess,
  onCancel,
}: WebCardFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found.");
      setIsSubmitting(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmCardSetup(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      },
    );

    if (confirmError) {
      setError(confirmError.message || "Failed to save card.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onSuccess();
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Add Card</h3>
          <button style={styles.closeButton} onClick={onCancel}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.cardElementWrapper}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#4B5563",
                    "::placeholder": { color: "#9CA3AF" },
                  },
                  invalid: { color: "#EF4444" },
                },
              }}
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.buttons}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: isSubmitting || !stripe ? 0.6 : 1,
              }}
              disabled={isSubmitting || !stripe}
            >
              {isSubmitting ? "Saving..." : "Save Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface WebCardFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddCardModal({
  clientSecret,
  onSuccess,
  onCancel,
}: WebCardFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <WebCardFormInner
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#1F2937",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "#9CA3AF",
    padding: 4,
  },
  cardElementWrapper: {
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  error: {
    color: "#EF4444",
    fontSize: 14,
    margin: "0 0 12px 0",
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 8,
    border: "1px solid #E5E7EB",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    color: "#4B5563",
  },
  submitButton: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#FF6B35",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};
