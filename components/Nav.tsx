"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio", icon: "🏆" },
  { href: "/calendario", label: "Calendario", icon: "📅" },
  { href: "/grupos", label: "Grupos", icon: "🎯" },
  { href: "/predicciones", label: "Apuestas", icon: "🧠" },
];

export function Nav() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <>
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--magenta)] text-xl glow-magenta">
            ⚽
          </span>
          <span className="leading-none">
            <span className="font-display block text-2xl tracking-wide text-[var(--ink)]">
              POLLA<span className="text-[var(--magenta)]">NOW</span>
            </span>
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
              Mundial 2026 · Fase de grupos
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive(l.href)
                  ? "bg-white/10 text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--pitch-900)]/95 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[0.62rem] font-bold uppercase tracking-wide transition ${
                isActive(l.href) ? "text-[var(--magenta)]" : "text-[var(--muted)]"
              }`}
            >
              <span className="text-base">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
