import { getAppData } from "@/lib/data";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { SectionTitle } from "@/components/ui";
import Link from "next/link";

export const revalidate = 30;

export default async function HomePage() {
  const data = await getAppData();

  const liveMatches = data.matches.filter((m) => m.status === "IN_PLAY");
  const upcoming = data.matches
    .filter((m) => m.status === "SCHEDULED")
    .slice(0, 6);
  const featured = [...liveMatches, ...upcoming].slice(0, 6);
  const leader = data.players[0];

  return (
    <main className="space-y-10">
      <RealtimeRefresher />

      {/* HERO */}
      <section className="panel relative overflow-hidden rounded-3xl p-6 sm:p-9">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="chip border-[var(--grass)]/40 text-[var(--grass)]">🇨🇦 🇺🇸 🇲🇽 2026</span>
            <span className="chip text-[var(--muted)]">7 jugadores · 12 grupos</span>
            {data.live ? (
              <span className="chip border-[var(--magenta)]/40 text-[var(--magenta)]">
                <span className="live-dot" /> Datos en vivo
              </span>
            ) : (
              <span className="chip text-[var(--muted)]">Esperando el pitazo inicial</span>
            )}
          </div>
          <h1 className="font-display text-5xl leading-[0.95] tracking-wide sm:text-7xl">
            LA POLLA
            <br />
            DEL <span className="text-[var(--magenta)]">MUNDIAL</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-[var(--muted)]">
            +10 puntos por cada grupo donde aciertes los 4 puestos exactos.
            Empate se define por el grupo del goleador. Probabilidades en vivo
            partido a partido.
          </p>

          {leader && (leader.points > 0 || data.live) && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-black/30 p-3 pr-5">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--gold)] font-display text-2xl text-black glow-gold">
                1
              </span>
              <div>
                <p className="text-[0.62rem] uppercase tracking-wide text-[var(--muted)]">Lidera la polla</p>
                <p className="font-display text-2xl tracking-wide">{leader.name}</p>
              </div>
              <div className="ml-3 border-l border-[var(--line)] pl-4 text-right">
                <span className="scoreboard-num text-3xl text-[var(--gold)]">{leader.points}</span>
                <span className="ml-1 text-xs text-[var(--muted)]">pts</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LEADERBOARD */}
      <section>
        <div className="flex items-end justify-between">
          <SectionTitle kicker="Tabla general" title="Leaderboard" />
          <Link href="/grupos" className="mb-4 text-xs font-semibold text-[var(--electric)] hover:underline">
            Ver grupos →
          </Link>
        </div>
        <Leaderboard data={data} />
      </section>

      {/* PROXIMOS PARTIDOS */}
      <section>
        <div className="flex items-end justify-between">
          <SectionTitle kicker={liveMatches.length ? "Ahora mismo" : "Agenda"} title={liveMatches.length ? "En vivo" : "Próximos partidos"} />
          <Link href="/calendario" className="mb-4 text-xs font-semibold text-[var(--electric)] hover:underline">
            Calendario completo →
          </Link>
        </div>
        {featured.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {featured.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center text-sm text-[var(--muted)]">
            Aún no hay partidos cargados. En cuanto arranque el Mundial y se
            sincronice la API, aquí verás los marcadores en vivo. ⚽
          </div>
        )}
      </section>
    </main>
  );
}
