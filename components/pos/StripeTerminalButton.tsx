"use client";

import { useEffect } from "react";
import { useStripeTerminal } from "@/lib/pos/useStripeTerminal";
import styles from "./stripeTerminalButton.module.css";

interface Props {
  total: number;
  onBeforeCapture: (stripePaymentIntentId: string) => Promise<void>;
  onPaymentSuccess: (stripePaymentIntentId: string) => void;
  onPaymentError?: (error: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}

export function StripeTerminalButton({
  total,
  onBeforeCapture,
  onPaymentSuccess,
  onPaymentError,
  onBusyChange,
  disabled,
}: Props) {
  const {
    status,
    statusMessage,
    isConnected,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelPayment,
    readerLabel,
  } = useStripeTerminal();

  const isCollecting = status === "collecting";
  const isProcessing = status === "processing";
  const isDiscovering = status === "discovering";
  const isConnecting = status === "connecting";
  const isSuccess = status === "success";
  const isBusy = isCollecting || isProcessing || isDiscovering || isConnecting;

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  async function handleCharge() {
    await collectPayment({
      amount: total,
      description: `Recharge POS monican.shop - $${total.toFixed(2)}`,
      onBeforeCapture,
      onSuccess: onPaymentSuccess,
      onError: (error) => {
        onPaymentError?.(error);
      },
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Stripe Terminal S700</div>
          <div className={styles.subtitle}>Paiement carte en direct sur le lecteur WiFi</div>
        </div>
        {readerLabel ? <div className={styles.readerLabel}>{readerLabel}</div> : null}
      </div>

      <div className={`${styles.status} ${styles[status]}`}>
        <span className={styles.dot} />
        <span>{statusMessage}</span>
      </div>

      <div className={styles.actions}>
        {!isConnected ? (
          <button
            type="button"
            className={styles.btnConnect}
            onClick={() => void connectReader()}
            disabled={disabled || isBusy}
          >
            {isConnecting || isDiscovering ? "Connexion..." : "🟢 Connecter le terminal S700"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.btnCharge}
              onClick={() => void handleCharge()}
              disabled={disabled || isBusy || isSuccess || total <= 0}
            >
              {isBusy ? "En cours..." : isSuccess ? "Paiement approuve" : `Charger ${total.toFixed(2)} USD`}
            </button>

            {isCollecting ? (
              <button type="button" className={styles.btnCancel} onClick={() => void cancelPayment()}>
                Annuler
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnDisconnect}
                onClick={() => void disconnectReader()}
                disabled={isProcessing}
              >
                Deconnecter le S700
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
