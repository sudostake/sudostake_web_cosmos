export type DashboardWalletType = "keplr" | "ledger";
export type DashboardNetworkEnv = "mainnet" | "testnet";

export interface DashboardSession {
  walletType: DashboardWalletType;
  address: string;
  walletName?: string;
  chainKey: string;
  chainDisplay: string;
  network: DashboardNetworkEnv;
  chainId: string;
  signedInAt: string;
}

const DASHBOARD_SESSION_KEY = "sudostake:dashboard-session";

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getDashboardSession = (): DashboardSession | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObjectRecord(parsed)) return null;

    const walletType = parsed.walletType;
    const address = parsed.address;
    const walletName = parsed.walletName;
    const chainKey = parsed.chainKey;
    const chainDisplay = parsed.chainDisplay;
    const network = parsed.network;
    const chainId = parsed.chainId;
    const signedInAt = parsed.signedInAt;

    if (walletType !== "keplr" && walletType !== "ledger") return null;
    if (typeof address !== "string" || address.length === 0) return null;
    if (walletName !== undefined && typeof walletName !== "string") return null;
    if (typeof chainKey !== "string" || chainKey.length === 0) return null;
    if (typeof chainDisplay !== "string" || chainDisplay.length === 0) return null;
    if (network !== "mainnet" && network !== "testnet") return null;
    if (typeof chainId !== "string" || chainId.length === 0) return null;
    if (typeof signedInAt !== "string" || signedInAt.length === 0) return null;

    return {
      walletType,
      address,
      walletName,
      chainKey,
      chainDisplay,
      network,
      chainId,
      signedInAt,
    };
  } catch {
    return null;
  }
};

export const setDashboardSession = (session: DashboardSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(session));
};

export const clearDashboardSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DASHBOARD_SESSION_KEY);
};
