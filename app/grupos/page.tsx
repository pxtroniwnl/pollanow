import { getAppData } from "@/lib/data";
import { GroupCard } from "@/components/GroupCard";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { SectionTitle } from "@/components/ui";

export const revalidate = 30;

export default async function GruposPage() {
  const data = await getAppData();
  return (
    <main className="space-y-6">
      <RealtimeRefresher />
      <SectionTitle kicker="12 grupos · 48 selecciones" title="Grupos & apuestas" />
      <p className="-mt-2 max-w-xl text-sm text-[var(--muted)]">
        Tabla real vs. predicción de cada quien. En verde, los puestos ya
        acertados. La barra muestra la probabilidad (Monte Carlo + Elo) de
        clavar el orden exacto del grupo.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.groups.map((g, i) => (
          <GroupCard key={g.id} group={g} data={data} index={i} />
        ))}
      </div>
    </main>
  );
}
