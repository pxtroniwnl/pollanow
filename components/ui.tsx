import type { TeamView, MatchView } from "@/lib/data";

export function TeamBadge({
  team, size = "md", reverse = false,
}: { team?: TeamView; size?: "sm" | "md"; reverse?: boolean }) {
  if (!team) return <span className="text-[var(--muted)]">—</span>;
  const flag = <span className={size === "sm" ? "text-base" : "text-xl"}>{team.flag}</span>;
  const name = (
    <span className={`font-semibold ${size === "sm" ? "text-xs" : "text-sm"}`}>{team.name}</span>
  );
  return (
    <span className={`inline-flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}>
      {flag}
      {name}
    </span>
  );
}

export function ProbBar({ value, accent = "var(--electric)" }: { value: number; accent?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(2, pct)}%`, background: accent }}
        />
      </div>
      <span className="w-9 text-right text-xs font-bold tabular-nums text-[var(--ink)]">{pct}%</span>
    </div>
  );
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-[var(--gold)] text-black glow-gold",
  2: "bg-[#d7e3df] text-black",
  3: "bg-[#cd7f4b] text-black",
};
export function RankMedal({ rank }: { rank: number }) {
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-xl font-display text-lg ${
        RANK_STYLES[rank] ?? "bg-white/8 text-[var(--muted)]"
      }`}
    >
      {rank || "–"}
    </span>
  );
}

export function StatusBadge({ status }: { status: MatchView["status"] }) {
  if (status === "IN_PLAY") {
    return (
      <span className="chip border-[var(--magenta)]/40 text-[var(--magenta)]">
        <span className="live-dot" /> En vivo
      </span>
    );
  }
  if (status === "FINISHED") {
    return <span className="chip text-[var(--muted)]">Final</span>;
  }
  return <span className="chip text-[var(--electric)]">Programado</span>;
}

export function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[var(--magenta)]">{kicker}</p>
      <h2 className="font-display text-3xl tracking-wide sm:text-4xl">{title}</h2>
    </div>
  );
}
