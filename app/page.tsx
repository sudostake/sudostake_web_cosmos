"use client";

import { useEffect, useMemo, useState } from "react";
import CosmosApp from "@ledgerhq/hw-app-cosmos";
import type Transport from "@ledgerhq/hw-transport";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

const CHAIN_ID = "cosmoshub-4";
const CHAIN_DISPLAY = "Cosmos Hub";
const LEDGER_DERIVATION_PATH = "44'/118'/0'/0/0";
const LEDGER_HRP = "cosmos";

type ConnectStatus = "idle" | "connecting" | "connected" | "error";

const formatAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "N/A";
const formatPublicKey = (key?: string) =>
  key ? `${key.slice(0, 6)}...${key.slice(-6)}` : "N/A";

interface LedgerAccount {
  address?: string;
  publicKey?: string;
}

interface LedgerAppInfo {
  version: string;
  testMode: boolean;
  deviceLocked: boolean;
}

export default function Home() {
  const [hasKeplr, setHasKeplr] = useState(false);
  const [status, setStatus] = useState<ConnectStatus>("idle");
  const [walletAccount, setWalletAccount] = useState<{
    address?: string;
    name?: string;
  }>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [supportsLedger, setSupportsLedger] = useState<boolean | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<ConnectStatus>("idle");
  const [ledgerAccount, setLedgerAccount] = useState<LedgerAccount>({});
  const [ledgerStatusMessage, setLedgerStatusMessage] = useState("");
  const [ledgerAppInfo, setLedgerAppInfo] = useState<LedgerAppInfo | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      setHasKeplr(Boolean(window.keplr));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;
    TransportWebUSB.isSupported()
      .then((supported) => {
        if (isMounted) {
          setSupportsLedger(supported);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSupportsLedger(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const connectWallet = async () => {
    if (status === "connecting") return;
    if (typeof window === "undefined" || !window.keplr) {
      setStatus("error");
      setStatusMessage(
        "Keplr is not available in your browser. Install it at https://keplr.app."
      );
      return;
    }

    setStatus("connecting");
    setStatusMessage("Requesting wallet permissions...");

    try {
      await window.keplr.enable(CHAIN_ID);
      const key = await window.keplr.getKey(CHAIN_ID);
      setWalletAccount({
        address: key.bech32Address,
        name: key.name,
      });
      setStatus("connected");
      setStatusMessage(`Connected to ${CHAIN_DISPLAY} via ${key.name}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Wallet connection was canceled.";
      setStatus("error");
      setStatusMessage(message);
    }
  };

  const connectLedger = async () => {
    if (ledgerStatus === "connecting") return;
    if (supportsLedger !== true) {
      setLedgerStatus("error");
      setLedgerStatusMessage(
        "Ledger WebUSB is not available in this browser. Use Chrome or Edge with USB enabled."
      );
      return;
    }

    setLedgerStatus("connecting");
    setLedgerStatusMessage(
      "Open the Cosmos app on your Ledger device and approve the connection."
    );
    setLedgerAccount({});
    setLedgerAppInfo(null);

    let transport: Transport | null = null;
    try {
      transport = await TransportWebUSB.create();
      const cosmos = new CosmosApp(transport);
      const appConfig = await cosmos.getAppConfiguration();
      const response = await cosmos.getAddress(LEDGER_DERIVATION_PATH, LEDGER_HRP, false);

      setLedgerAccount({
        address: response.address,
        publicKey: response.publicKey,
      });
      setLedgerAppInfo({
        version: appConfig.version ?? "unknown",
        testMode: Boolean(appConfig.test_mode),
        deviceLocked: Boolean(appConfig.device_locked),
      });
      setLedgerStatus("connected");
      setLedgerStatusMessage(`Ledger Cosmos ${appConfig.version} is ready.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ledger connection was canceled.";
      setLedgerStatus("error");
      setLedgerStatusMessage(message);
    } finally {
      if (transport) {
        await transport.close().catch(() => {});
      }
    }
  };

  const connectionState = useMemo(() => {
    if (status === "connecting") return "Connecting...";
    if (!hasKeplr) return "Keplr extension not detected.";
    if (status === "connected" && walletAccount.address)
      return `Connected as ${formatAddress(walletAccount.address)}`;
    if (status === "error" && statusMessage) return statusMessage;
    return "Ready to connect your Cosmos wallet.";
  }, [hasKeplr, status, statusMessage, walletAccount.address]);

  const ledgerConnectionState = useMemo(() => {
    if (supportsLedger === null) return "Checking Ledger support...";
    if (ledgerStatus === "connecting") return "Connecting to Ledger...";
    if (supportsLedger === false)
      return "Ledger WebUSB support is unavailable. Use Chrome or Edge with USB permissions.";
    if (ledgerStatus === "connected" && ledgerAccount.address) {
      const versionLabel = ledgerAppInfo?.version ? ` · Cosmos v${ledgerAppInfo.version}` : "";
      return `Connected as ${formatAddress(ledgerAccount.address)}${versionLabel}`;
    }
    if (ledgerStatus === "error" && ledgerStatusMessage) return ledgerStatusMessage;
    return "Ready to connect your Ledger device.";
  }, [
    supportsLedger,
    ledgerStatus,
    ledgerAccount.address,
    ledgerAppInfo?.version,
    ledgerStatusMessage,
  ]);

  const ledgerButtonLabel =
    ledgerStatus === "connecting"
      ? "Connecting..."
      : ledgerAccount.address
      ? "Re-connect Ledger"
      : "Connect Ledger";

  const ledgerButtonDisabled = ledgerStatus === "connecting" || supportsLedger !== true;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-12 text-white">
      <main className="flex w-full max-w-5xl flex-col gap-8">
        <section className="flex flex-col gap-4 text-center">
          <span className="rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            Cosmos SDK
          </span>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            SudoStake makes staking seamless.
          </h1>
          <p className="text-lg text-white/80">
            Connect your wallet to preview rewards, simulate restaking strategies, and
            secure the best validator experience.
          </p>
          <div className="mx-auto h-px w-16 bg-white/40" />
          <p className="text-sm uppercase tracking-[0.4em] text-white/60">
            Wallet connection beta
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_100px_-30px_rgba(15,15,15,0.8)] backdrop-blur">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                Connected network
              </p>
              <p className="text-lg font-semibold text-white">{CHAIN_DISPLAY}</p>
            </div>
            <span className="rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
              {CHAIN_ID}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/80">
                <p className="text-[0.85rem] uppercase tracking-[0.3em] text-white/60">
                  Keplr status
                </p>
                <p className="mt-1 font-medium text-white">{connectionState}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/80">
                <p className="text-[0.85rem] uppercase tracking-[0.3em] text-white/60">
                  Ledger status
                </p>
                <p className="mt-1 font-medium text-white">{ledgerConnectionState}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={connectWallet}
                disabled={status === "connecting"}
                className="rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 shadow-lg shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
              >
                {status === "connecting"
                  ? "Connecting..."
                  : walletAccount.address
                  ? "Re-connect wallet"
                  : "Connect wallet"}
              </button>

              {!hasKeplr && (
                <a
                  href="https://keplr.app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-cyan-300 underline-offset-4 hover:text-white"
                >
                  Install Keplr
                </a>
              )}

              <button
                type="button"
                onClick={connectLedger}
                disabled={ledgerButtonDisabled}
                className="rounded-full bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
              >
                {ledgerButtonLabel}
              </button>
            </div>

            {supportsLedger === false && (
              <p className="text-xs text-white/60">
                Ledger WebUSB is only available in Chromium browsers with USB permissions.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Wallet</p>
                <p className="mt-1 font-semibold text-white">
                  {walletAccount.address ? formatAddress(walletAccount.address) : "Not connected"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Wallet name</p>
                <p className="mt-1 font-semibold text-white">{walletAccount.name ?? "N/A"}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Next step</p>
                <p className="mt-1 font-semibold text-white/80">
                  Review any transactions in Keplr before approving them.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Ledger address</p>
                <p className="mt-1 font-semibold text-white">
                  {ledgerAccount.address ? formatAddress(ledgerAccount.address) : "Not connected"}
                </p>
                {ledgerAccount.publicKey && (
                  <p className="text-[0.65rem] text-white/60 mt-2 break-all">
                    {formatPublicKey(ledgerAccount.publicKey)}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Ledger app</p>
                <p className="mt-1 font-semibold text-white">
                  {ledgerAppInfo ? `Cosmos v${ledgerAppInfo.version}` : "Open Cosmos app on Ledger"}
                </p>
                {ledgerAppInfo && (
                  <p className="text-xs text-white/60">
                    {ledgerAppInfo.testMode ? "Test app" : "Production app"} ·{" "}
                    {ledgerAppInfo.deviceLocked ? "Locked" : "Unlocked"}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Next step</p>
                <p className="mt-1 font-semibold text-white/80">
                  {ledgerStatus === "connected"
                    ? "Approve Cosmos transactions directly on your Ledger."
                    : "Open the Cosmos app and confirm the connection on your Ledger device."}
                </p>
              </div>
            </div>

            {statusMessage && (
              <p className="text-sm text-white/70">{statusMessage}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

declare global {
  interface Window {
    keplr?: KeplrProvider;
  }
}

interface KeplrProvider {
  enable(chainId: string): Promise<void>;
  getKey(chainId: string): Promise<KeplrKey>;
}

interface KeplrKey {
  readonly name: string;
  readonly bech32Address: string;
}
