import type { AppData, PlayerView } from "@/lib/data";
import { RankMedal, ProbBar } from "./ui";

function GroupChips({ player, groups }: { player: PlayerView; groups: AppData["groups"] }) {
  const hitSet = new Set(player.hits);
  return (
    <div className="flex flex-wrap gap-1">
      {groups.map((g) => {
        const hit = hitSet.has(g.id);
        return (
          <span
            key={g.id}
            title={`Grupo ${g.id}${hit ? " · acertado (+10)" : ""}`}
            className={`grid h-6 w-6 place-items-center rounded-md text-[0.66rem] font-bold ${
              hit ? "bg-[var(--grass)] text-black" : "bg-white/6 text-[var(--muted)]"
            }`}
          >
            {g.id}
          </span>
        );
      })}
    </div>
  );
}

export function Leaderboard({ data, detailed = false }: { data: AppData; detailed?: boolean }) {
  return (
    <div className="space-y-2.5">
      {data.players.map((p, i) => {
        const leader = i === 0 && (p.points > 0 || data.live);
        return (
          <div
            key={p.name}
            className={`panel rise flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center ${
              leader ? "glow-gold" : ""
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              <RankMedal rank={p.rank || i + 1} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl tracking-wide">{p.name}</span>
                  {p.tiebreakWon && (
                    <span className="chip border-[var(--gold)]/40 text-[var(--gold)]">⚽ Goleador</span>
                  )}
                </div>
                <p className="text-[0.68rem] text-[var(--muted)]">
                  Goleador en grupos {p.tiebreaks.join(" · ")}
                </p>
              </div>
              <div className="ml-auto text-right sm:hidden">
                <span className="scoreboard-num text-3xl text-[var(--gold)]">{p.points}</span>
                <span className="ml-1 text-[0.6rem] uppercase text-[var(--muted)]">pts</span>
              </div>
            </div>

            <div className="flex-1 sm:px-4">
              {detailed ? (
                <GroupChips player={p} groups={data.groups} />
              ) : (
                <div className="max-w-xs">
                  <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Prob. de ganar la polla
                  </p>
                  <ProbBar value={p.pWin} accent="var(--magenta)" />
                </div>
              )}
            </div>

            <div className="hidden text-right sm:block">
              <span className="scoreboard-num text-4xl text-[var(--gold)]">{p.points}</span>
              <span className="ml-1 text-xs uppercase text-[var(--muted)]">pts</span>
              {detailed && (
                <div className="mt-1 w-32">
                  <ProbBar value={p.pWin} accent="var(--magenta)" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
