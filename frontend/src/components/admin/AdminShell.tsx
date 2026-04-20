"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { logoutCurrentSession } from "@/lib/authClient";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/domains", label: "Domains" },
  { href: "/traffic-sources", label: "Traffic sources" },
  { href: "/ab-tests", label: "A/B Tests" },
  { href: "/conversions/manual", label: "Manual conversion" },
];

type AdminShellProps = {
  children: ReactNode;
  title: string;
  topbarRight?: ReactNode;
};

export function AdminShell({ children, title, topbarRight }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarId = useId();
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutCurrentSession();
    } finally {
      setLoggingOut(false);
      router.replace("/auth");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 text-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-base focus:font-semibold focus:text-slate-950 focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-700 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <div
        className={
          mobileOpen
            ? "fixed inset-0 z-40 bg-slate-900/50 md:hidden"
            : "hidden"
        }
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        id={sidebarId}
        className={
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-slate-300 bg-white shadow-md transition-transform md:static md:translate-x-0 " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
        aria-label="Application"
      >
        <div className="flex h-16 items-center border-b border-slate-300 px-4">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-slate-950 outline-none ring-blue-700 ring-offset-2 focus-visible:ring-4"
          >
            TDS Admin
          </Link>
        </div>
        <nav className="p-3" aria-label="Main">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={
                      "block rounded-md px-3 py-2.5 text-base font-semibold outline-none transition-colors transition-shadow ring-brand-700 ring-offset-2 focus-visible:ring-4 " +
                      (active
                        ? "bg-brand-800 text-white shadow-sm hover:bg-brand-900 hover:shadow focus-visible:bg-brand-900"
                        : "text-slate-800 hover:bg-brand-50 hover:text-brand-900")
                    }
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-300 bg-white/95 px-4 md:px-6 shadow-sm backdrop-blur">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-900 outline-none ring-blue-700 ring-offset-2 hover:bg-slate-100 focus-visible:ring-4 md:hidden"
            aria-controls={sidebarId}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            <span aria-hidden className="text-lg leading-none">
              {mobileOpen ? "×" : "≡"}
            </span>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-slate-950">
            {title}
          </h1>
          {topbarRight ? (
            <div className="flex shrink-0 items-center gap-2 pr-1 md:pr-2">{topbarRight}</div>
          ) : null}
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={loggingOut}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
          >
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

        <main id="main-content" className="flex-1 p-4 md:p-6" tabIndex={-1}>
          <div className="page-content-wrap">{children}</div>
        </main>
      </div>
    </div>
  );
}
