export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 text-white">
      <main className="flex max-w-xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
          Cosmos SDK
        </span>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          SudoStake is under construction.
        </h1>
        <p className="text-lg text-white/80">
          We&apos;re crafting the best staking experience for Cosmos-based
          chains. Check back soon for updates and launch details.
        </p>
        <div className="h-px w-16 bg-white/40" />
        <p className="text-sm uppercase tracking-[0.4em] text-white/60">
          Coming Soon
        </p>
      </main>
    </div>
  );
}
