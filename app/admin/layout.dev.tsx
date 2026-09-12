import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/**
 * Frame for the development-only admin. Files here are named *.dev.tsx so
 * they only exist under `next dev` (see next.config.ts): the static export
 * never contains /admin.
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/order", label: "Order categories" },
  { href: "/admin/distance", label: "Distance cities" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
        <TriangleAlert className="size-4" aria-hidden="true" />
        Development only. This admin runs on your machine under <code className="font-mono">npm run dev</code> and is
        never part of the production build.
      </div>
      <header className="border-b border-border">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3">
          <span className="text-lg font-bold tracking-tight">Daily Puzzles admin</span>
          <ul className="flex items-center gap-4 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                ← Back to the site
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
