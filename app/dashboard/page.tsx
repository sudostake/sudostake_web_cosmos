"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "../components/LogoMark";
import {
  clearDashboardSession,
  getDashboardSession,
  type DashboardSession,
} from "../lib/dashboardSession";

const formatAddress = (address: string) =>
  address ? `${address.slice(0, 8)}...${address.slice(-8)}` : "N/A";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<DashboardSession | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    const savedSession = getDashboardSession();
    if (!savedSession) {
      setCheckedSession(true);
      router.replace("/");
      return;
    }
    setSession(savedSession);
    setCheckedSession(true);
  }, [router]);

  const signedInLabel = useMemo(() => {
    if (!session?.signedInAt) return "Unknown";
    const signedInAt = new Date(session.signedInAt);
    if (Number.isNaN(signedInAt.getTime())) return "Unknown";
    return signedInAt.toLocaleString();
  }, [session?.signedInAt]);

  const handleSignOut = () => {
    clearDashboardSession();
    router.replace("/");
  };

  if (!checkedSession || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 text-center text-[0.8rem] text-[color:var(--text-secondary)]">
        Loading dashboard...
      </div>
    );
  }

  const networkLabel = session.network === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[color:var(--text-primary)]">
      <header className="nav-panel sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="pixel-heading mr-auto inline-flex items-center gap-3 text-[0.7rem] text-[color:var(--foreground)] sm:text-[0.76rem]"
            aria-label="Back to SudoStake home"
          >
            <LogoMark size={34} className="h-9 w-9 flex-none" />
            <span>SudoStake</span>
            <span className="pixel-chip text-[color:var(--text-secondary)]">Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="surface-card pixel-card px-4 py-2 text-[0.64rem] text-[color:var(--text-primary)]"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="surface-card pixel-card px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="pixel-chip w-fit text-[color:var(--text-secondary)]">Logged in</p>
              <h1 className="pixel-hero text-[1rem] sm:text-[1.32rem] lg:text-[1.5rem]">
                Wallet dashboard
              </h1>
              <p className="text-[0.78rem] text-[color:var(--text-secondary)]">
                Connected via {session.walletType === "keplr" ? "Keplr" : "Ledger"} on{" "}
                {session.chainDisplay} {networkLabel}.
              </p>
            </div>
            <Link
              href="/#connect"
              className="pixel-link focus-soft text-[0.64rem] text-[color:var(--text-secondary)] hover:text-[color:var(--accent-primary)]"
            >
              Switch wallet
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface-card pixel-card p-4">
            <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">Address</p>
            <p className="mt-1 text-[0.78rem] text-[color:var(--text-primary)]">
              {formatAddress(session.address)}
            </p>
          </div>
          <div className="surface-card pixel-card p-4">
            <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">Wallet</p>
            <p className="mt-1 text-[0.78rem] text-[color:var(--text-primary)]">
              {session.walletName ?? (session.walletType === "keplr" ? "Keplr" : "Ledger")}
            </p>
          </div>
          <div className="surface-card pixel-card p-4">
            <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">Chain</p>
            <p className="mt-1 text-[0.78rem] text-[color:var(--text-primary)]">
              {session.chainDisplay} ({session.chainId})
            </p>
          </div>
          <div className="surface-card pixel-card p-4">
            <p className="pixel-heading text-[0.56rem] text-[color:var(--text-secondary)]">Signed in</p>
            <p className="mt-1 text-[0.78rem] text-[color:var(--text-primary)]">{signedInLabel}</p>
          </div>
        </section>

        <section className="surface-card pixel-card px-5 py-6 sm:px-6">
          <h2 className="section-heading text-[color:var(--text-primary)]">Next actions</h2>
          <p className="mt-3 text-[0.78rem] text-[color:var(--text-secondary)]">
            Dashboard login is active. Hook your vault, lending, and borrowing widgets here and keep
            session checks on this route.
          </p>
        </section>
      </main>
    </div>
  );
}
