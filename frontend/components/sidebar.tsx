"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(16,185,129,0.6)]" />
      <span className="text-lg font-bold tracking-tight text-slate-100">
        PayFlow
      </span>
    </span>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10" />,
  orders: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
  accounts: (
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h3v3h-6z" />
  ),
  settings: (
    <path d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.7 5.7L9 19H7v2H3v-4l5.3-5.3A6 6 0 1 1 21 9z" />
  ),
  docs: <path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13" />,
  merchants: (
    <path d="M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1a3 3 0 0 0-2-2.8M16 5.2a3 3 0 0 1 0 5.6" />
  ),
  allOrders: <path d="M4 6h16M4 12h16M4 18h10" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  external: <path d="M14 4h6v6M20 4 10 14M18 13v7H4V6h7" />,
};

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const docsUrl = `${API_BASE.replace("/api", "")}/docs`;

  const sections: { heading: string; items: NavItem[] }[] = [
    {
      heading: "Payments",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/orders", label: "Orders", icon: "orders" },
        { href: "/accounts", label: "UPI Accounts", icon: "accounts" },
      ],
    },
    {
      heading: "Developers",
      items: [
        { href: "/settings", label: "API & Webhooks", icon: "settings" },
        { href: docsUrl, label: "API Docs", icon: "docs", external: true },
      ],
    },
  ];

  if (user?.is_staff) {
    sections.push({
      heading: "Admin",
      items: [
        { href: "/admin/merchants", label: "Merchants", icon: "merchants" },
        { href: "/admin/orders", label: "All Orders", icon: "allOrders" },
      ],
    });
  }

  const nav = (
    <>
      <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
        <Link href="/dashboard" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
      </div>

      <div className="px-3 pt-4">
        <Link
          href="/orders/new"
          onClick={() => setOpen(false)}
          className="btn-primary w-full"
        >
          <Icon name="plus" className="h-4 w-4" /> New payment link
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map(({ heading, items }) => (
          <div key={heading}>
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {heading}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active =
                  !item.external &&
                  (pathname === item.href ||
                    pathname.startsWith(item.href + "/"));
                const classes = `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`;
                if (item.external) {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className={classes}
                    >
                      <Icon
                        name={item.icon}
                        className="h-5 w-5 text-slate-500 group-hover:text-slate-300"
                      />
                      <span className="flex-1">{item.label}</span>
                      <Icon name="external" className="h-3.5 w-3.5 text-slate-600" />
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={classes}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-5 w-5 ${
                        active
                          ? "text-emerald-400"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-300">
            {(user?.display_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-200">
              {user?.display_name}
            </div>
            <div className="truncate text-xs text-slate-500">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
            title="Log out"
            aria-label="Log out"
          >
            <Icon name="logout" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#070b14]/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.06]"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.06] bg-[#0a0f1c] transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
