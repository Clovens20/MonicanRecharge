"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripeTerminal } from "@stripe/terminal-js";

type TerminalStatus =
  | "idle"
  | "discovering"
  | "connecting"
  | "connected"
  | "collecting"
  | "processing"
  | "success"
  | "error"
  | "cancelled";

type StripeTerminalConfig = {
  locationId?: string | null;
  simulated?: boolean;
  error?: string;
};

type TerminalReader = {
  label?: string | null;
  serial_number?: string | null;
  device_type?: string | null;
};

type TerminalApi = {
  discoverReaders: (config?: Record<string, unknown>) => Promise<{ discoveredReaders?: TerminalReader[]; error?: { message?: string } }>;
  connectReader?: (
    reader: TerminalReader,
    options?: Record<string, unknown>,
  ) => Promise<{ reader?: TerminalReader; error?: { message?: string } }>;
  connectBluetoothReader?: (
    reader: TerminalReader,
    options?: Record<string, unknown>,
  ) => Promise<{ reader?: TerminalReader; error?: { message?: string } }>;
  disconnectReader: () => Promise<unknown> | unknown;
  collectPaymentMethod: (
    clientSecret: string,
  ) => Promise<{ paymentIntent?: { id: string }; error?: { message?: string } }>;
  processPayment: (
    paymentIntent: { id: string },
  ) => Promise<{ paymentIntent?: { id: string; status?: string }; error?: { message?: string } }>;
  cancelCollectPaymentMethod?: () => Promise<unknown>;
  cancelProcessPayment?: () => Promise<unknown>;
  clearCachedCredentials?: () => Promise<unknown>;
};

type CollectPaymentParams = {
  amount: number;
  description?: string;
  currency?: string;
  onBeforeCapture?: (paymentIntentId: string) => Promise<void>;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
};

interface UseStripeTerminalReturn {
  status: TerminalStatus;
  statusMessage: string;
  isConnected: boolean;
  connectReader: () => Promise<void>;
  disconnectReader: () => Promise<void>;
  collectPayment: (params: CollectPaymentParams) => Promise<void>;
  cancelPayment: () => Promise<void>;
  readerLabel: string;
}

async function parseJsonSafe<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function useStripeTerminal(): UseStripeTerminalReturn {
  const terminalRef = useRef<TerminalApi | null>(null);
  const readerRef = useRef<TerminalReader | null>(null);
  const paymentIntentIdRef = useRef<string | null>(null);
  const configRef = useRef<StripeTerminalConfig>({});
  const readerLabelRef = useRef("");

  const [status, setStatus] = useState<TerminalStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Terminal non connecte");
  const [readerLabel, setReaderLabel] = useState("");

  const loadConfig = useCallback(async (): Promise<StripeTerminalConfig> => {
    const response = await fetch("/api/admin/pos/stripe-terminal/connection-token", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = await parseJsonSafe<StripeTerminalConfig>(response);
    if (!response.ok) {
      throw new Error(data.error || "Configuration Stripe Terminal indisponible");
    }

    configRef.current = {
      locationId: data.locationId || null,
      simulated: Boolean(data.simulated),
    };
    return configRef.current;
  }, []);

  const cancelServerPaymentIntent = useCallback(async () => {
    if (!paymentIntentIdRef.current) return;
    try {
      await fetch("/api/admin/pos/stripe-terminal/cancel-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentIntentId: paymentIntentIdRef.current }),
      });
    } catch {
      // L’UI garde l’erreur initiale; l’annulation sert surtout a liberer l’autorisation Stripe.
    } finally {
      paymentIntentIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const StripeTerminal = await loadStripeTerminal();
        if (!mounted || !StripeTerminal) {
          if (mounted) {
            setStatus("error");
            setStatusMessage("Stripe Terminal JS n’a pas pu etre charge");
          }
          return;
        }

        const terminal = StripeTerminal.create({
          onFetchConnectionToken: async () => {
            const response = await fetch("/api/admin/pos/stripe-terminal/connection-token", {
              method: "POST",
              credentials: "include",
            });
            const data = await parseJsonSafe<{ secret?: string; error?: string }>(response);
            if (!response.ok || !data.secret) {
              throw new Error(data.error || "Connection token Stripe Terminal indisponible");
            }
            return data.secret;
          },
          onUnexpectedReaderDisconnect: () => {
            readerRef.current = null;
            paymentIntentIdRef.current = null;
            readerLabelRef.current = "";
            setReaderLabel("");
            setStatus("idle");
            setStatusMessage("Terminal deconnecte, reconnectez le lecteur");
          },
          onConnectionStatusChange: (event) => {
            if (!mounted) return;
            if (event.status === "connecting") {
              setStatus("connecting");
              setStatusMessage("Connexion au lecteur M2...");
              return;
            }
            if (event.status === "connected") {
              setStatus("connected");
              setStatusMessage(readerRef.current ? `Lecteur pret: ${readerLabelRef.current || "Stripe Reader M2"}` : "Lecteur connecte");
              return;
            }
            if (event.status === "not_connected" && !readerRef.current) {
              setStatus("idle");
              setStatusMessage("Terminal non connecte");
            }
          },
          onPaymentStatusChange: (event) => {
            if (!mounted) return;
            if (event.status === "waiting_for_input") {
              setStatus("collecting");
              setStatusMessage("Carte attendue sur le terminal...");
              return;
            }
            if (event.status === "processing") {
              setStatus("processing");
              setStatusMessage("Traitement du paiement...");
              return;
            }
            if (event.status === "ready" && readerRef.current) {
              setStatus("connected");
              setStatusMessage(`Lecteur pret: ${readerLabelRef.current || "Stripe Reader M2"}`);
            }
          },
        }) as unknown as TerminalApi;

        terminalRef.current = terminal;
      } catch (error) {
        if (!mounted) return;
        setStatus("error");
        setStatusMessage(error instanceof Error ? error.message : "Initialisation Stripe Terminal impossible");
      }
    }

    void init();

    return () => {
      mounted = false;
      const terminal = terminalRef.current;
      terminalRef.current = null;
      readerRef.current = null;
      paymentIntentIdRef.current = null;
      if (terminal) {
        void terminal.disconnectReader();
      }
    };
  }, []);

  const connectReader = useCallback(async () => {
    const terminal = terminalRef.current;
    if (!terminal) {
      setStatus("error");
      setStatusMessage("Stripe Terminal n’est pas encore pret");
      return;
    }

    try {
      const config = await loadConfig();
      if (!config.locationId) {
        setStatus("error");
        setStatusMessage("Ajoutez STRIPE_TERMINAL_LOCATION_ID dans l’environnement");
        return;
      }

      setStatus("discovering");
      setStatusMessage(config.simulated ? "Recherche du lecteur simule..." : "Recherche du lecteur Bluetooth M2...");

      let discoverResult: { discoveredReaders?: TerminalReader[]; error?: { message?: string } };
      try {
        discoverResult = await terminal.discoverReaders({
          simulated: Boolean(config.simulated),
          location: config.locationId,
          discoveryMethod: "bluetoothScan",
        });
      } catch {
        discoverResult = await terminal.discoverReaders({
          simulated: Boolean(config.simulated),
          location: config.locationId,
        });
      }

      if (discoverResult.error) {
        throw new Error(discoverResult.error.message || "Aucun lecteur trouve");
      }

      const reader = discoverResult.discoveredReaders?.[0];
      if (!reader) {
        throw new Error(
          config.simulated
            ? "Aucun lecteur simule disponible"
            : "Aucun lecteur M2 detecte. Verifiez Bluetooth et la proximite du lecteur.",
        );
      }

      setStatus("connecting");
      setStatusMessage("Connexion au lecteur M2...");

      const connectOptions = {
        fail_if_in_use: true,
        failIfInUse: true,
        locationId: config.locationId,
      };

      const connectResult = terminal.connectReader
        ? await terminal.connectReader(reader, connectOptions)
        : terminal.connectBluetoothReader
          ? await terminal.connectBluetoothReader(reader, connectOptions)
          : { error: { message: "SDK Stripe Terminal incompatible avec ce lecteur" } };

      if (connectResult.error || !connectResult.reader) {
        throw new Error(connectResult.error?.message || "Connexion au lecteur echouee");
      }

      readerRef.current = connectResult.reader;
      const label =
        connectResult.reader.label ||
        connectResult.reader.serial_number ||
        connectResult.reader.device_type ||
        "Stripe Reader M2";
      readerLabelRef.current = label;
      setReaderLabel(label);
      setStatus("connected");
      setStatusMessage(`Lecteur pret: ${label}`);
    } catch (error) {
      readerRef.current = null;
      readerLabelRef.current = "";
      setReaderLabel("");
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Connexion au terminal impossible");
    }
  }, [loadConfig]);

  const disconnectReader = useCallback(async () => {
    const terminal = terminalRef.current;
    if (terminal) {
      try {
        await terminal.disconnectReader();
      } catch {
        // Ignore les erreurs de déconnexion locale.
      }
      if (terminal.clearCachedCredentials) {
        try {
          await terminal.clearCachedCredentials();
        } catch {
          // Ignore, car ce nettoyage n’est pas critique.
        }
      }
    }
    readerRef.current = null;
    paymentIntentIdRef.current = null;
    readerLabelRef.current = "";
    setReaderLabel("");
    setStatus("idle");
    setStatusMessage("Terminal deconnecte");
  }, []);

  const collectPayment = useCallback(
    async ({ amount, description, currency = "usd", onBeforeCapture, onSuccess, onError }: CollectPaymentParams) => {
      const terminal = terminalRef.current;
      if (!terminal || !readerRef.current) {
        onError("Lecteur non connecte");
        return;
      }

      try {
        setStatus("processing");
        setStatusMessage("Creation du paiement Stripe Terminal...");

        const response = await fetch("/api/admin/pos/stripe-terminal/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, currency, description }),
        });
        const data = await parseJsonSafe<{ clientSecret?: string; id?: string; error?: string }>(response);
        if (!response.ok || !data.clientSecret || !data.id) {
          throw new Error(data.error || "Creation du paiement impossible");
        }

        paymentIntentIdRef.current = data.id;

        setStatus("collecting");
        setStatusMessage("Carte attendue sur le terminal...");

        const collectResult = await terminal.collectPaymentMethod(data.clientSecret);
        if (collectResult.error || !collectResult.paymentIntent) {
          await cancelServerPaymentIntent();
          throw new Error(collectResult.error?.message || "Lecture de carte annulee");
        }

        setStatus("processing");
        setStatusMessage("Confirmation du paiement sur le terminal...");

        const processResult = await terminal.processPayment(collectResult.paymentIntent);
        if (processResult.error || !processResult.paymentIntent?.id) {
          await cancelServerPaymentIntent();
          throw new Error(processResult.error?.message || "Paiement refuse");
        }

        paymentIntentIdRef.current = processResult.paymentIntent.id;

        if (onBeforeCapture) {
          try {
            setStatus("processing");
            setStatusMessage("Validation de la recharge...");
            await onBeforeCapture(processResult.paymentIntent.id);
          } catch (error) {
            await cancelServerPaymentIntent();
            const message = error instanceof Error ? error.message : "La recharge a echoue avant la capture";
            setStatus("cancelled");
            setStatusMessage(message);
            onError(message);
            return;
          }
        }

        setStatus("processing");
        setStatusMessage("Capture du paiement...");

        const captureResponse = await fetch("/api/admin/pos/stripe-terminal/capture-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ paymentIntentId: processResult.paymentIntent.id }),
        });
        const captureData = await parseJsonSafe<{
          paymentIntent?: { id?: string; status?: string };
          error?: string;
        }>(captureResponse);

        if (!captureResponse.ok || captureData.paymentIntent?.status !== "succeeded") {
          throw new Error(
            captureData.error || "Recharge executee mais la capture Stripe a echoue. Verifiez le paiement dans Stripe.",
          );
        }

        paymentIntentIdRef.current = null;
        setStatus("success");
        setStatusMessage("Paiement approuve et capture");
        onSuccess(captureData.paymentIntent.id || processResult.paymentIntent.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur Stripe Terminal";
        setStatus("error");
        setStatusMessage(message);
        onError(message);
      }
    },
    [cancelServerPaymentIntent],
  );

  const cancelPayment = useCallback(async () => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    try {
      if (terminal.cancelCollectPaymentMethod) {
        await terminal.cancelCollectPaymentMethod();
      }
      if (terminal.cancelProcessPayment) {
        await terminal.cancelProcessPayment();
      }
    } catch {
      // Ignore les erreurs locales; l’objectif principal est l’annulation côté Stripe.
    }

    await cancelServerPaymentIntent();
    setStatus(readerRef.current ? "connected" : "idle");
    setStatusMessage(readerRef.current ? `Lecteur pret: ${readerLabelRef.current || "Stripe Reader M2"}` : "Terminal non connecte");
  }, [cancelServerPaymentIntent]);

  return {
    status,
    statusMessage,
    isConnected: Boolean(readerRef.current),
    connectReader,
    disconnectReader,
    collectPayment,
    cancelPayment,
    readerLabel,
  };
}
