"use client";

import { useEffect, useMemo, useState } from "react";
import CosmosApp from "@ledgerhq/hw-app-cosmos";
import type Transport from "@ledgerhq/hw-transport";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

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

type ChainKey = "cosmoshub" | "chihuahua" | "archway";

interface ChainConfig {
  key: ChainKey;
  chainId: string;
  display: string;
  hrp: string;
  ledgerDerivationPath: string;
  accent: string;
  description: string;
}

const CHAIN_OPTIONS: ChainConfig[] = [
  {
    key: "cosmoshub",
    chainId: "cosmoshub-4",
    display: "Cosmos Hub (ATOM)",
    hrp: "cosmos",
    ledgerDerivationPath: "44'/118'/0'/0/0",
    accent: "from-cyan-400 via-blue-500 to-purple-500",
    description: "The original Cosmos chain securing ATOM.",
  },
  {
    key: "chihuahua",
    chainId: "chihuahua-1",
    display: "Chihuahua (HUAHUA)",
    hrp: "chihuahua",
    ledgerDerivationPath: "44'/118'/0'/0/0",
    accent: "from-amber-300 via-orange-400 to-pink-500",
    description: "Fast, community-driven meme chain.",
  },
  {
    key: "archway",
    chainId: "archway-1",
    display: "Archway",
    hrp: "archway",
    ledgerDerivationPath: "44'/118'/0'/0/0",
    accent: "from-emerald-300 via-teal-400 to-blue-500",
    description: "Smart contract hub for CosmWasm builders.",
  },
];

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
  const [selectedWallet, setSelectedWallet] = useState<"keplr" | "ledger">("keplr");
  const [selectedChainKey, setSelectedChainKey] = useState<ChainKey>("cosmoshub");

  const selectedChain = useMemo(
    () => CHAIN_OPTIONS.find((chain) => chain.key === selectedChainKey) ?? CHAIN_OPTIONS[0],
    [selectedChainKey]
  );

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

  useEffect(() => {
    setStatus("idle");
    setStatusMessage("");
    setWalletAccount({});
    setLedgerStatus("idle");
    setLedgerStatusMessage("");
    setLedgerAccount({});
    setLedgerAppInfo(null);
  }, [selectedChainKey]);

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
      await window.keplr.enable(selectedChain.chainId);
      const key = await window.keplr.getKey(selectedChain.chainId);
      setWalletAccount({
        address: key.bech32Address,
        name: key.name,
      });
      setStatus("connected");
      setStatusMessage(`Connected to ${selectedChain.display} via ${key.name}.`);
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
      `Open the Cosmos app on your Ledger device to fetch your ${selectedChain.display} address.`
    );
    setLedgerAccount({});
    setLedgerAppInfo(null);

    let transport: Transport | null = null;
    try {
      transport = await TransportWebUSB.create();
      const cosmos = new CosmosApp(transport);
      const appConfig = await cosmos.getAppConfiguration();
      const response = await cosmos.getAddress(
        selectedChain.ledgerDerivationPath,
        selectedChain.hrp,
        false
      );

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
      setLedgerStatusMessage(
        `Ledger Cosmos ${appConfig.version} is ready for ${selectedChain.display}.`
      );
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
      return `Connected as ${formatAddress(walletAccount.address)} on ${selectedChain.display}`;
    if (status === "error" && statusMessage) return statusMessage;
    return `Ready to connect to ${selectedChain.display} via Keplr.`;
  }, [hasKeplr, selectedChain.display, status, statusMessage, walletAccount.address]);

  const ledgerConnectionState = useMemo(() => {
    if (supportsLedger === null) return "Checking Ledger support...";
    if (ledgerStatus === "connecting") return "Connecting to Ledger...";
    if (supportsLedger === false)
      return "Ledger WebUSB support is unavailable. Use Chrome or Edge with USB permissions.";
    if (ledgerStatus === "connected" && ledgerAccount.address) {
      const versionLabel = ledgerAppInfo?.version ? ` · Cosmos v${ledgerAppInfo.version}` : "";
      return `Connected as ${formatAddress(ledgerAccount.address)} on ${selectedChain.display}${versionLabel}`;
    }
    if (ledgerStatus === "error" && ledgerStatusMessage) return ledgerStatusMessage;
    return `Ready to connect your Ledger device for ${selectedChain.display}.`;
  }, [
    supportsLedger,
    ledgerStatus,
    ledgerAccount.address,
    ledgerAppInfo?.version,
    selectedChain.display,
    ledgerStatusMessage,
  ]);

  const selectedStatusMessage = selectedWallet === "keplr" ? statusMessage : ledgerStatusMessage;

  const connectButtonLabel = useMemo(() => {
    if (selectedWallet === "keplr") {
      if (status === "connecting") return "Connecting Keplr...";
      if (walletAccount.address) return "Re-connect Keplr";
      return "Connect Keplr";
    }
    if (ledgerStatus === "connecting") return "Connecting Ledger...";
    if (ledgerAccount.address) return "Re-connect Ledger";
    return "Connect Ledger";
  }, [ledgerAccount.address, ledgerStatus, selectedWallet, status, walletAccount.address]);

  const connectButtonDisabled =
    selectedWallet === "keplr"
      ? status === "connecting"
      : ledgerStatus === "connecting" || supportsLedger !== true;

  const showKeplrStats = status === "connected" && Boolean(walletAccount.address);
  const showLedgerStats = ledgerStatus === "connected" && Boolean(ledgerAccount.address);

  const handleConnectSelected = () => {
    if (selectedWallet === "keplr") {
      return connectWallet();
    }
    return connectLedger();
  };

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
              <p className="text-lg font-semibold text-white">{selectedChain.display}</p>
              <p className="text-xs text-white/60">Bech32 prefix {selectedChain.hrp}</p>
            </div>
            <span className="rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
              {selectedChain.chainId}
            </span>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                Choose your Cosmos SDK chain
              </p>
              <p className="text-sm text-white/70">
                Pick the network you want to derive addresses for. We will use the correct bech32
                prefix for each chain.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {CHAIN_OPTIONS.map((chain) => (
                <button
                  key={chain.key}
                  type="button"
                  onClick={() => setSelectedChainKey(chain.key)}
                  aria-pressed={selectedChainKey === chain.key}
                  className={`rounded-2xl border p-4 text-left text-sm transition hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    selectedChainKey === chain.key
                      ? "border-white/60 bg-white/10 shadow-[0_20px_60px_-35px_rgba(0,0,0,1)]"
                      : "border-white/5 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.85rem] uppercase tracking-[0.3em] text-white/60">
                        {chain.display}
                      </p>
                      <p className="mt-1 font-semibold text-white">Chain ID: {chain.chainId}</p>
                      <p className="text-xs text-white/60">Prefix: {chain.hrp}</p>
                    </div>
                    <span
                      className={`rounded-full bg-gradient-to-r ${chain.accent} px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-slate-950`}
                    >
                      {chain.key === selectedChainKey ? "Selected" : chain.hrp}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/60">{chain.description}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Choose your wallet</p>
              <p className="text-sm text-white/70">
                Pick one connection method at a time. You can switch wallets whenever you need.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedWallet("keplr")}
                aria-pressed={selectedWallet === "keplr"}
                className={`rounded-2xl border p-4 text-left text-sm transition hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  selectedWallet === "keplr"
                    ? "border-white/60 bg-white/10 shadow-[0_20px_60px_-35px_rgba(0,0,0,1)]"
                    : "border-white/5 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.85rem] uppercase tracking-[0.3em] text-white/60">
                      Keplr wallet
                    </p>
                    <p className="mt-1 font-semibold text-white">{connectionState}</p>
                  </div>
                  <span className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/70">
                    {selectedWallet === "keplr" ? "Selected" : "Choose"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  {hasKeplr
                    ? "Keplr extension detected in this browser."
                    : "Install the Keplr extension to connect here."}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWallet("ledger")}
                aria-pressed={selectedWallet === "ledger"}
                className={`rounded-2xl border p-4 text-left text-sm transition hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  selectedWallet === "ledger"
                    ? "border-white/60 bg-white/10 shadow-[0_20px_60px_-35px_rgba(0,0,0,1)]"
                    : "border-white/5 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.85rem] uppercase tracking-[0.3em] text-white/60">
                      Ledger hardware
                    </p>
                    <p className="mt-1 font-semibold text-white">{ledgerConnectionState}</p>
                  </div>
                  <span className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/70">
                    {selectedWallet === "ledger" ? "Selected" : "Choose"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  {supportsLedger === false
                    ? "WebUSB not available — use Chrome or Edge with USB enabled."
                    : "Connect over WebUSB from a supported browser."}
                </p>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleConnectSelected}
                disabled={connectButtonDisabled}
                className={`rounded-full bg-gradient-to-r ${selectedChain.accent} px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 shadow-lg shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100`}
              >
                {connectButtonLabel}
              </button>

              {selectedWallet === "keplr" && !hasKeplr && (
                <a
                  href="https://keplr.app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-cyan-300 underline-offset-4 hover:text-white"
                >
                  Install Keplr
                </a>
              )}
            </div>

            {supportsLedger === false && selectedWallet === "ledger" && (
              <p className="text-xs text-white/60">
                Ledger WebUSB is only available in Chromium browsers with USB permissions.
              </p>
            )}

            {showKeplrStats && (
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
            )}

            {showLedgerStats && (
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
            )}

            {!showKeplrStats && !showLedgerStats && (
              <p className="text-sm text-white/70">Connect a wallet to view its details.</p>
            )}

            {selectedStatusMessage && (
              <p className="text-sm text-white/70">{selectedStatusMessage}</p>
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
