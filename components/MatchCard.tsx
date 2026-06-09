import type { MatchView } from "@/lib/data";
import { StatusBadge } from "./ui";

function kickoffLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export function MatchCard({ match }: { match: MatchView }) {
  const finished = match.status === "FINISHED";
  const live = match.status === "IN_PLAY";
  const hs = match.homeScore;
  const as = match.awayScore;
  const homeWon = finished && hs !== null && as !== null && hs > as;
  const awayWon = finished && hs !== null && as !== null && as > hs;

  return (
    <div className={`panel p-3.5 ${live ? "glow-magenta" : ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="chip text-[var(--muted)]">Grupo {match.group} · J{match.matchday}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className={`flex items-center justify-end gap-2 text-right ${homeWon ? "" : "opacity-90"}`}>
          <span className={`text-sm font-semibold ${homeWon ? "text-[var(--ink)]" : ""}`}>{match.home?.name}</span>
          <span className="text-2xl">{match.home?.flag}</span>
        </div>
        <div className="px-2 text-center">
          {match.status === "SCHEDULED" ? (
            <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">VS</span>
          ) : (
            <span className="scoreboard-num text-2xl">
              <span className={homeWon ? "text-[var(--gold)]" : ""}>{hs ?? 0}</span>
              <span className="mx-1 text-[var(--muted)]">:</span>
              <span className={awayWon ? "text-[var(--gold)]" : ""}>{as ?? 0}</span>
            </span>
          )}
        </div>
        <div className={`flex items-center gap-2 ${awayWon ? "" : "opacity-90"}`}>
          <span className="text-2xl">{match.away?.flag}</span>
          <span className={`text-sm font-semibold ${awayWon ? "text-[var(--ink)]" : ""}`}>{match.away?.name}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[0.68rem] text-[var(--muted)]">{kickoffLabel(match.kickoff)}</p>
    </div>
  );
}
