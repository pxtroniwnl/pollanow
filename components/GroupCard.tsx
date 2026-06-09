import type { AppData, TeamView } from "@/lib/data";
import { ProbBar } from "./ui";

const POS_COLOR = ["text-[var(--grass)]", "text-[var(--grass)]", "text-[var(--gold)]", "text-[var(--muted)]"];

export function GroupCard({
  group, data, index = 0,
}: { group: AppData["groups"][number]; data: AppData; index?: number }) {
  const standings = data.standings[group.id] ?? [];
  const teams = (data.groupTeams[group.id] ?? []).slice().sort((a, b) => b.elo - a.elo);
  const hasStandings = standings.length > 0;
  const isGoleador = data.meta.goleadorGroup === group.id;
  const teamByCode = (c: string): TeamView | undefined => data.teams[c];

  // Filas a mostrar: standings reales o equipos por defecto.
  const rows = hasStandings
    ? standings.map((s) => ({ team: s.team, pts: s.points, gd: s.gd, played: s.played }))
    : teams.map((t) => ({ team: t, pts: null as number | null, gd: null as number | null, played: 0 }));

  return (
    <div className="panel rise overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <h3 className="font-display text-2xl tracking-wide">
          Grupo <span className="text-[var(--magenta)]">{group.id}</span>
        </h3>
        {isGoleador && (
          <span className="chip border-[var(--gold)]/40 text-[var(--gold)]">⚽ Goleador aquí</span>
        )}
        {!isGoleador && (
          <span className="chip text-[var(--muted)]">{hasStandings ? "En juego" : "Por definir"}</span>
        )}
      </div>

      {/* Tabla */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[0.6rem] uppercase tracking-wide text-[var(--muted)]">
            <th className="px-4 py-1.5 text-left font-semibold">#</th>
            <th className="py-1.5 text-left font-semibold">Equipo</th>
            <th className="py-1.5 text-center font-semibold">PJ</th>
            <th className="py-1.5 text-center font-semibold">DG</th>
            <th className="px-4 py-1.5 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team?.code ?? i} className="border-t border-white/5">
              <td className={`px-4 py-2 font-display text-base ${POS_COLOR[i] ?? ""}`}>{i + 1}</td>
              <td className="py-2">
                <span className="inline-flex items-center gap-2">
                  <span className="text-lg">{r.team?.flag}</span>
                  <span className="font-semibold">{r.team?.name}</span>
                </span>
              </td>
              <td className="py-2 text-center tabular-nums text-[var(--muted)]">{r.played}</td>
              <td className="py-2 text-center tabular-nums text-[var(--muted)]">
                {r.gd === null ? "–" : r.gd > 0 ? `+${r.gd}` : r.gd}
              </td>
              <td className="px-4 py-2 text-right font-display text-lg text-[var(--ink)]">
                {r.pts === null ? "–" : r.pts}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Predicciones de cada persona */}
      <details className="group/d border-t border-[var(--line)]">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs font-semibold text-[var(--electric)] marker:content-['']">
          Ver apuestas y probabilidades
          <span className="transition group-open/d:rotate-180">▾</span>
        </summary>
        <div className="space-y-2 px-4 pb-4">
          {data.players.map((p) => {
            const pred = p.predictions[group.id] ?? [];
            const hit = p.hits.includes(group.id);
            const pHit = p.pHit[group.id] ?? 0;
            return (
              <div key={p.name} className="rounded-xl bg-black/20 p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold">{p.name}</span>
                  {hit ? (
                    <span className="chip border-[var(--grass)]/40 text-[var(--grass)]">✓ +10</span>
                  ) : (
                    <span className="text-[0.62rem] text-[var(--muted)]">Prob. acierto</span>
                  )}
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {pred.map((code, idx) => {
                    const t = teamByCode(code);
                    const correct = hasStandings && standings[idx]?.team?.code === code;
                    return (
                      <span
                        key={code}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] ${
                          correct ? "bg-[var(--grass)]/20 text-[var(--grass)]" : "bg-white/5"
                        }`}
                      >
                        <span className="font-display text-[var(--muted)]">{idx + 1}</span>
                        <span>{t?.flag}</span>
                        <span className="font-medium">{t?.name}</span>
                      </span>
                    );
                  })}
                </div>
                {!hit && <ProbBar value={pHit} accent="var(--electric)" />}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
