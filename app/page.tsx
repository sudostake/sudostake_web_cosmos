"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CosmosApp from "@ledgerhq/hw-app-cosmos";
import type Transport from "@ledgerhq/hw-transport";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import { LogoMark } from "./components/LogoMark";
import {
  getDashboardSession,
  setDashboardSession,
} from "./lib/dashboardSession";

type ConnectStatus = "idle" | "connecting" | "connected" | "error";

const formatAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "N/A";
const formatPublicKey = (key?: string) =>
  key ? `${key.slice(0, 6)}...${key.slice(-6)}` : "N/A";

type NetworkEnv = "mainnet" | "testnet";

interface LedgerAccount {
  address?: string;
  publicKey?: string;
}

interface LedgerAppInfo {
  version: string;
  testMode: boolean;
  deviceLocked: boolean;
}

type ChainKey = "chihuahua" | "archway";

interface ChainNetworkConfig {
  chainId: string;
  hrp: string;
  ledgerDerivationPath: string;
}

interface ChainConfig {
  key: ChainKey;
  display: string;
  description: string;
  logoSrc: string;
  logoAlt: string;
  networks: Record<NetworkEnv, ChainNetworkConfig>;
}

type ResourceLink = {
  name: string;
  href: string;
  tag: string;
  description: string;
};

const CHAIN_OPTIONS: ChainConfig[] = [
  {
    key: "chihuahua",
    display: "Chihuahua (HUAHUA)",
    description: "Use staked HUAHUA in vault flows for stake-backed liquidity.",
    logoSrc: "/chihuahua-logo.svg",
    logoAlt: "ChihuahuaChain logo",
    networks: {
      mainnet: {
        chainId: "chihuahua-1",
        hrp: "chihuahua",
        ledgerDerivationPath: "44'/118'/0'/0/0",
      },
      testnet: {
        chainId: "chihuahua-2",
        hrp: "chihuahua",
        ledgerDerivationPath: "44'/118'/0'/0/0",
      },
    },
  },
  {
    key: "archway",
    display: "Archway",
    description: "Use staked Archway assets in vault flows for stake-backed liquidity.",
    logoSrc: "/archway-logo.svg",
    logoAlt: "Archway logo",
    networks: {
      mainnet: {
        chainId: "archway-1",
        hrp: "archway",
        ledgerDerivationPath: "44'/118'/0'/0/0",
      },
      testnet: {
        chainId: "constantine-3",
        hrp: "archway",
        ledgerDerivationPath: "44'/118'/0'/0/0",
      },
    },
  },
];

const resources: ResourceLink[] = [
  {
    name: "GitHub",
    href: "https://github.com/sudostake",
    tag: "GH",
    description: "Open-source repos and release notes.",
  },
  {
    name: "Telegram",
    href: "https://t.me/sudostake",
    tag: "TG",
    description: "Community chat and support updates.",
  },
  {
    name: "X",
    href: "https://x.com/sudostake",
    tag: "X",
    description: "Product updates and launch announcements.",
  },
];

export default function Home() {
  const router = useRouter();
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
  const [selectedChainKey, setSelectedChainKey] = useState<ChainKey>("chihuahua");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkEnv>("mainnet");
  const [hasDashboardSession, setHasDashboardSession] = useState(false);

  const selectedChain = useMemo(
    () => CHAIN_OPTIONS.find((chain) => chain.key === selectedChainKey) ?? CHAIN_OPTIONS[0],
    [selectedChainKey]
  );

  const selectedChainNetwork = useMemo(
    () =>
      (selectedChain.networks[selectedNetwork] ??
        selectedChain.networks.mainnet ??
        Object.values(selectedChain.networks)[0])!,
    [selectedChain, selectedNetwork]
  );

  const networkLabel = selectedNetwork === "mainnet" ? "Mainnet" : "Testnet";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      setHasKeplr(Boolean(window.keplr));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasDashboardSession(Boolean(getDashboardSession()));
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
  }, [selectedChainKey, selectedNetwork]);

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
      await window.keplr.enable(selectedChainNetwork.chainId);
      const key = await window.keplr.getKey(selectedChainNetwork.chainId);
      const nextWalletAccount = {
        address: key.bech32Address,
        name: key.name,
      };
      setWalletAccount(nextWalletAccount);
      setStatus("connected");
      setStatusMessage(
        `Connected to ${selectedChain.display} ${networkLabel} via ${key.name}.`
      );
      setDashboardSession({
        walletType: "keplr",
        address: nextWalletAccount.address,
        walletName: nextWalletAccount.name,
        chainKey: selectedChain.key,
        chainDisplay: selectedChain.display,
        network: selectedNetwork,
        chainId: selectedChainNetwork.chainId,
        signedInAt: new Date().toISOString(),
      });
      setHasDashboardSession(true);
      router.push("/dashboard");
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
      `Open the Cosmos app on your Ledger device to fetch your ${selectedChain.display} ${networkLabel} address.`
    );
    setLedgerAccount({});
    setLedgerAppInfo(null);

    let transport: Transport | null = null;
    try {
      transport = await TransportWebUSB.create();
      const cosmos = new CosmosApp(transport);
      const appConfig = await cosmos.getAppConfiguration();
      const response = await cosmos.getAddress(
        selectedChainNetwork.ledgerDerivationPath,
        selectedChainNetwork.hrp,
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
        `Ledger Cosmos ${appConfig.version} is ready for ${selectedChain.display} ${networkLabel}.`
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
      return `Connected as ${formatAddress(walletAccount.address)} on ${selectedChain.display} ${networkLabel}`;
    if (status === "error" && statusMessage) return statusMessage;
    return `Ready to connect to ${selectedChain.display} ${networkLabel} via Keplr.`;
  }, [
    hasKeplr,
    networkLabel,
    selectedChain.display,
    status,
    statusMessage,
    walletAccount.address,
  ]);

  const ledgerConnectionState = useMemo(() => {
    if (supportsLedger === null) return "Checking Ledger support...";
    if (ledgerStatus === "connecting") return "Connecting to Ledger...";
    if (supportsLedger === false)
      return "Ledger WebUSB support is unavailable. Use Chrome or Edge with USB permissions.";
    if (ledgerStatus === "connected" && ledgerAccount.address) {
      const versionLabel = ledgerAppInfo?.version ? ` · Cosmos v${ledgerAppInfo.version}` : "";
      return `Connected as ${formatAddress(ledgerAccount.address)} on ${selectedChain.display} ${networkLabel}${versionLabel}`;
    }
    if (ledgerStatus === "error" && ledgerStatusMessage) return ledgerStatusMessage;
    return `Ready to connect your Ledger device for ${selectedChain.display} ${networkLabel}.`;
  }, [
    supportsLedger,
    ledgerStatus,
    ledgerAccount.address,
    ledgerAppInfo?.version,
    networkLabel,
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
  const canLoginWithKeplr = showKeplrStats;
  const canLoginWithLedger = showLedgerStats;
  const canLoginWithSelectedWallet =
    selectedWallet === "keplr" ? canLoginWithKeplr : canLoginWithLedger;

  const handleConnectSelected = () => {
    if (selectedWallet === "keplr") {
      return connectWallet();
    }
    return connectLedger();
  };

  const handleLoginToDashboard = () => {
    const existingSession = getDashboardSession();
    if (!canLoginWithSelectedWallet && existingSession) {
      router.push("/dashboard");
      return;
    }

    if (selectedWallet === "keplr") {
      if (!walletAccount.address) {
        setStatus("error");
        setStatusMessage("Connect your Keplr wallet first, then log in to the dashboard.");
        return;
      }

      setDashboardSession({
        walletType: "keplr",
        address: walletAccount.address,
        walletName: walletAccount.name,
        chainKey: selectedChain.key,
        chainDisplay: selectedChain.display,
        network: selectedNetwork,
        chainId: selectedChainNetwork.chainId,
        signedInAt: new Date().toISOString(),
      });
      setHasDashboardSession(true);
      router.push("/dashboard");
      return;
    }

    if (!ledgerAccount.address) {
      setLedgerStatus("error");
      setLedgerStatusMessage("Connect your Ledger first, then log in to the dashboard.");
      return;
    }

    setDashboardSession({
      walletType: "ledger",
      address: ledgerAccount.address,
      walletName: ledgerAppInfo?.version
        ? `Ledger Cosmos v${ledgerAppInfo.version}`
        : "Ledger Cosmos",
      chainKey: selectedChain.key,
      chainDisplay: selectedChain.display,
      network: selectedNetwork,
      chainId: selectedChainNetwork.chainId,
      signedInAt: new Date().toISOString(),
    });
    setHasDashboardSession(true);
    router.push("/dashboard");
  };

  const dashboardButtonLabel =
    !canLoginWithSelectedWallet && hasDashboardSession
      ? "Open Dashboard"
      : "Log In to Dashboard";
  const dashboardButtonDisabled = !canLoginWithSelectedWallet && !hasDashboardSession;

  return (
    <div id="top" className="min-h-dvh bg-[var(--background)] text-[color:var(--text-primary)]">
      <header className="nav-panel sticky top-0 z-50">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="pixel-heading mr-auto inline-flex items-center gap-3 text-[0.7rem] text-[color:var(--foreground)] sm:text-[0.76rem]"
            aria-label="SudoStake Cosmos home"
          >
            <LogoMark size={34} className="h-9 w-9 flex-none" />
            <span>SudoStake</span>
            <span className="pixel-chip text-[color:var(--text-secondary)]">Cosmos</span>
          </a>

          <nav className="flex items-center gap-1 text-[0.64rem] text-[color:var(--text-secondary)] sm:gap-2 sm:text-[0.7rem]">
            <a
              href="#connect"
              className="pixel-link focus-soft text-[color:var(--text-secondary)] hover:text-[color:var(--accent-primary)]"
            >
              Connect
            </a>
            <Link
              href="/dashboard"
              className="pixel-link focus-soft text-[color:var(--text-secondary)] hover:text-[color:var(--accent-primary)]"
            >
              Dashboard
            </Link>
            <a
              href="#resources"
              className="pixel-link focus-soft text-[color:var(--text-secondary)] hover:text-[color:var(--accent-primary)]"
            >
              Resources
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-10 lg:px-8">
        <section id="connect" className="surface-card pixel-card px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-4">
            <span className="pixel-chip w-fit text-[color:var(--text-secondary)]">
              Stake-backed liquidity
            </span>
            <h1 className="pixel-hero text-[1rem] text-[color:var(--text-primary)] sm:text-[1.32rem] lg:text-[1.62rem]">
              Borrow or lend without unstaking.
            </h1>
            <p className="max-w-3xl text-[0.86rem] text-[color:var(--text-secondary)] sm:text-[0.94rem]">
              Unlock USDC liquidity while validator rewards keep compounding.
            </p>
          </div>

          <div className="surface-panel mt-6 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                  Connected network
                </p>
                <p className="mt-1 text-[0.88rem] text-[color:var(--text-primary)]">
                  {selectedChain.display} · {networkLabel}
                </p>
                <p className="mt-1 text-[0.68rem] text-[color:var(--text-secondary)]">
                  Bech32 prefix {selectedChainNetwork.hrp}
                </p>
              </div>
              <span className="pixel-chip text-[color:var(--text-secondary)]">
                {selectedChainNetwork.chainId}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="flex flex-col gap-2">
              <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                Choose a network
              </p>
              <p className="text-[0.76rem] text-[color:var(--text-secondary)] sm:text-[0.82rem]">
                Pick the chain and environment for your wallet connection. We apply the right
                bech32 prefix for each network.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                Environment
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["mainnet", "testnet"] as NetworkEnv[]).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setSelectedNetwork(env)}
                    aria-pressed={selectedNetwork === env}
                    className={`pixel-card surface-card focus-soft p-4 text-left text-[0.72rem] ${
                      selectedNetwork === env
                        ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-muted)]"
                        : "hover:border-[color:var(--accent-primary)]"
                    }`}
                  >
                    <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                      {env === "mainnet" ? "Mainnet" : "Testnet"}
                    </p>
                    <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                      {env === "mainnet"
                        ? "Production RPCs and balances"
                        : "Sandbox RPCs for testing"}
                    </p>
                    <p className="mt-1 text-[0.68rem] text-[color:var(--text-secondary)]">
                      Applies to all chains in this selector.
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {CHAIN_OPTIONS.map((chain) => (
                <button
                  key={chain.key}
                  type="button"
                  onClick={() => setSelectedChainKey(chain.key)}
                  aria-pressed={selectedChainKey === chain.key}
                  className={`pixel-card surface-card focus-soft p-4 text-left text-[0.72rem] ${
                    selectedChainKey === chain.key
                      ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-muted)]"
                      : "hover:border-[color:var(--accent-primary)]"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="network-mark">
                        <Image
                          src={chain.logoSrc}
                          alt={chain.logoAlt}
                          width={28}
                          height={28}
                          className="h-7 w-7 flex-none"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                          {chain.display}
                        </p>
                        <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                          Current ({selectedNetwork}):{" "}
                          {chain.networks[selectedNetwork]?.chainId ?? "Unavailable"}
                        </p>
                        <p className="mt-1 text-[0.68rem] text-[color:var(--text-secondary)]">
                          Mainnet: {chain.networks.mainnet.chainId}
                        </p>
                        <p className="text-[0.68rem] text-[color:var(--text-secondary)]">
                          Testnet: {chain.networks.testnet.chainId}
                        </p>
                      </div>
                    </div>
                    <span className="pixel-chip text-[color:var(--text-secondary)]">
                      {chain.key === selectedChainKey ? "Selected" : "Choose"}
                    </span>
                  </div>
                  <p className="mt-2 text-[0.68rem] text-[color:var(--text-secondary)]">
                    {chain.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                Connect your wallet
              </p>
              <p className="text-[0.76rem] text-[color:var(--text-secondary)] sm:text-[0.82rem]">
                Choose one wallet method to continue. You can switch methods anytime.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedWallet("keplr")}
                aria-pressed={selectedWallet === "keplr"}
                className={`pixel-card surface-card focus-soft p-4 text-left text-[0.72rem] ${
                  selectedWallet === "keplr"
                    ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-muted)]"
                    : "hover:border-[color:var(--accent-primary)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="network-mark">
                      <Image
                        src="/keplr-logo.svg"
                        alt="Keplr logo"
                        width={28}
                        height={28}
                        className="h-7 w-7 flex-none"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                        Keplr wallet
                      </p>
                      <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                        {connectionState}
                      </p>
                    </div>
                  </div>
                  <span className="pixel-chip text-[color:var(--text-secondary)]">
                    {selectedWallet === "keplr" ? "Selected" : "Choose"}
                  </span>
                </div>
                <p className="mt-2 text-[0.68rem] text-[color:var(--text-secondary)]">
                  {hasKeplr
                    ? "Keplr extension detected in this browser."
                    : "Install the Keplr extension to connect here."}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWallet("ledger")}
                aria-pressed={selectedWallet === "ledger"}
                className={`pixel-card surface-card focus-soft p-4 text-left text-[0.72rem] ${
                  selectedWallet === "ledger"
                    ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-muted)]"
                    : "hover:border-[color:var(--accent-primary)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="network-mark">
                      <Image
                        src="/ledger-logo.svg"
                        alt="Ledger logo"
                        width={28}
                        height={28}
                        className="h-7 w-7 flex-none"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="pixel-heading text-[0.58rem] text-[color:var(--text-secondary)]">
                        Ledger hardware
                      </p>
                      <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                        {ledgerConnectionState}
                      </p>
                    </div>
                  </div>
                  <span className="pixel-chip text-[color:var(--text-secondary)]">
                    {selectedWallet === "ledger" ? "Selected" : "Choose"}
                  </span>
                </div>
                <p className="mt-2 text-[0.68rem] text-[color:var(--text-secondary)]">
                  {supportsLedger === false
                    ? "WebUSB not available. Use Chrome or Edge with USB enabled."
                    : "Connect over WebUSB from a supported browser."}
                </p>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleConnectSelected}
                disabled={connectButtonDisabled}
                className="btn-primary px-6 py-3 text-[0.66rem] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectButtonLabel}
              </button>

              <button
                type="button"
                onClick={handleLoginToDashboard}
                disabled={dashboardButtonDisabled}
                className="surface-card pixel-card px-6 py-3 text-[0.66rem] text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dashboardButtonLabel}
              </button>

              {selectedWallet === "keplr" && !hasKeplr && (
                <a
                  href="https://keplr.app"
                  target="_blank"
                  rel="noreferrer"
                  className="pixel-link text-[color:var(--text-secondary)] hover:text-[color:var(--accent-primary)]"
                >
                  Install Keplr
                </a>
              )}
            </div>

            {supportsLedger === false && selectedWallet === "ledger" && (
              <p className="text-[0.68rem] text-[color:var(--text-secondary)]">
                Ledger WebUSB is available in Chromium browsers with USB permissions.
              </p>
            )}

            {showKeplrStats && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="surface-card pixel-card p-4">
                  <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">
                    Wallet
                  </p>
                  <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                    {walletAccount.address ? formatAddress(walletAccount.address) : "Not connected"}
                  </p>
                </div>
                <div className="surface-card pixel-card p-4">
                  <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">
                    Wallet name
                  </p>
                  <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                    {walletAccount.name ?? "N/A"}
                  </p>
                </div>
                <div className="surface-card pixel-card p-4">
                  <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">
                    Next step
                  </p>
                  <p className="mt-1 text-[0.76rem] text-[color:var(--text-secondary)]">
                    Log in to dashboard to manage vault actions from this wallet.
                  </p>
                </div>
              </div>
            )}

            {showLedgerStats && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="surface-card pixel-card p-4">
                  <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">
                    Ledger address
                  </p>
                  <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                    {ledgerAccount.address ? formatAddress(ledgerAccount.address) : "Not connected"}
                  </p>
                  {ledgerAccount.publicKey && (
                    <p className="mt-2 break-all text-[0.64rem] text-[color:var(--text-secondary)]">
                      {formatPublicKey(ledgerAccount.publicKey)}
                    </p>
                  )}
                </div>
                <div className="surface-card pixel-card p-4">
                  <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">
                    Ledger app
                  </p>
                  <p className="mt-1 text-[0.76rem] text-[color:var(--text-primary)]">
                    {ledgerAppInfo ? `Cosmos v${ledgerAppInfo.version}` : "Open Cosmos app on Ledger"}
                  </p>
                  {ledgerAppInfo && (
                    <p className="text-[0.64rem] text-[color:var(--text-secondary)]">
                      {ledgerAppInfo.testMode ? "Test app" : "Production app"} ·{" "}
                      {ledgerAppInfo.deviceLocked ? "Locked" : "Unlocked"}
                    </p>
                  )}
                </div>
                <div className="surface-card pixel-card p-4">
                  <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">
                    Next step
                  </p>
                  <p className="mt-1 text-[0.76rem] text-[color:var(--text-secondary)]">
                    {ledgerStatus === "connected"
                      ? "Log in to dashboard and approve Cosmos transactions on Ledger."
                      : "Open the Cosmos app and confirm the connection on your Ledger device."}
                  </p>
                </div>
              </div>
            )}

            {!showKeplrStats && !showLedgerStats && (
              <p className="text-[0.72rem] text-[color:var(--text-secondary)]">
                Connect a wallet to view your address, app status, and next steps.
              </p>
            )}

            {selectedStatusMessage && (
              <p className="text-[0.72rem] text-[color:var(--text-secondary)]">
                {selectedStatusMessage}
              </p>
            )}
          </div>
        </section>

        <section id="resources" className="w-full">
          <div className="surface-card pixel-card px-5 py-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-heading text-[color:var(--text-primary)]">Resources</h2>
              <span className="pixel-chip text-[color:var(--text-secondary)]">
                {resources.length} links
              </span>
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {resources.map(({ name, href, tag, description }) => (
                <li key={href} className="h-full">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Go to ${name} in a new tab`}
                    className="group pixel-card surface-card flex h-full min-w-0 flex-col gap-3 px-4 py-5 text-left text-[color:var(--text-primary)]"
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span className="resource-mark text-[color:var(--text-secondary)]">{tag}</span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="pixel-heading text-[0.72rem] text-[color:var(--text-primary)]">
                          {name}
                        </span>
                        <span className="break-words text-[0.66rem] leading-[1.3] text-[color:var(--text-secondary)]">
                          {description}
                        </span>
                      </span>
                    </span>
                    <span className="pixel-heading self-end text-[0.62rem] text-[color:var(--accent-primary)] transition-transform group-hover:translate-x-0.5">
                      -&gt;
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="footer-panel py-7 text-center text-[0.64rem] text-[color:var(--text-secondary)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-5 sm:px-6 lg:px-8">
          <LogoMark size={36} className="h-10 w-10" ariaLabel="SudoStake mark" />
        </div>
      </footer>
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
