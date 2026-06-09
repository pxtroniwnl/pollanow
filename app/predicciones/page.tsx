import { getAppData } from "@/lib/data";
import { PredictionsView } from "@/components/PredictionsView";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { SectionTitle } from "@/components/ui";

export const revalidate = 30;

export default async function PrediccionesPage() {
  const data = await getAppData();
  return (
    <main className="space-y-6">
      <RealtimeRefresher />
      <SectionTitle kicker="Lo que apostó cada uno" title="Apuestas" />
      <PredictionsView data={data} />
    </main>
  );
}
