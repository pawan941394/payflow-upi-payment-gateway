import Link from "next/link";

const FEATURES = [
  {
    title: "Instant payment links",
    body: "Create a UPI payment link in one call and share it anywhere. QR code, intent links and live status included.",
    icon: (
      <path d="M13 6h3a5 5 0 0 1 0 10h-3M11 18H8A5 5 0 0 1 8 8h3M8 13h8" />
    ),
  },
  {
    title: "Signed webhooks",
    body: "Every event is HMAC-SHA256 signed and retried with backoff, so your systems always stay in sync.",
    icon: (
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4zM9 12l2 2 4-4" />
    ),
  },
  {
    title: "Sandbox mode",
    body: "Test the whole flow with sandbox keys and simulated payments before going live. No real money moves.",
    icon: (
      <path d="M10 3h4v4.6l4.5 7.8A3 3 0 0 1 15.9 20H8.1a3 3 0 0 1-2.6-4.6L10 7.6V3zM7 15h10" />
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Emerald radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% -5%, rgba(16,185,129,0.18), transparent 70%), radial-gradient(ellipse 40% 35% at 85% 110%, rgba(16,185,129,0.08), transparent 70%)",
        }}
      />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(16,185,129,0.6)]" />
          <span className="text-lg font-bold tracking-tight text-slate-100">
            PayFlow
          </span>
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-300 transition hover:text-emerald-300"
        >
          Sign in
        </Link>
      </nav>

      <main className="relative mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center pb-20 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            UPI Payments, rebuilt
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-100 sm:text-6xl">
            Collect UPI payments{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-lime-300 bg-clip-text text-transparent">
              like a pro
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-slate-400 sm:text-lg">
            Payment links, hosted checkout, signed webhooks and a full sandbox —
            everything you need to get paid directly into your bank account via
            UPI.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Get started
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-100">
                {f.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-white/[0.06] py-8 text-center text-xs text-slate-600">
        PayFlow — payments go directly to the merchant&apos;s bank account via
        UPI.
      </footer>
    </div>
  );
}
