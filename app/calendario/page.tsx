import { getAppData, type MatchView } from "@/lib/data";
import { MatchCard } from "@/components/MatchCard";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { SectionTitle } from "@/components/ui";

export const revalidate = 30;

export default async function CalendarioPage() {
  const data = await getAppData();

  const byMatchday = new Map<number, MatchView[]>();
  for (const m of data.matches) {
    if (!byMatchday.has(m.matchday)) byMatchday.set(m.matchday, []);
    byMatchday.get(m.matchday)!.push(m);
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  return (
    <main className="space-y-8">
      <RealtimeRefresher />
      <SectionTitle kicker="Fase de grupos" title="Calendario" />

      {matchdays.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-display text-3xl text-[var(--muted)]">PRÓXIMAMENTE</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Los partidos aparecerán aquí en cuanto la API del Mundial los
            publique y el sync los cargue.
          </p>
        </div>
      ) : (
        matchdays.map((md) => {
          const matches = byMatchday.get(md)!.sort(
            (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
          );
          return (
            <section key={md}>
              <h3 className="mb-3 flex items-center gap-3 font-display text-2xl tracking-wide">
                Jornada <span className="text-[var(--magenta)]">{md}</span>
                <span className="h-px flex-1 bg-[var(--line)]" />
                <span className="text-xs font-normal text-[var(--muted)]">{matches.length} partidos</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
