// Auto-reparación del sync: si alguien visita la página y los datos llevan
// demasiado sin sincronizar, la propia página dispara el sync tras responder
// (next `after`). Así, mientras haya gente mirando —que es justo cuando hay
// partidos—, la web se mantiene al día aunque fallen los crons externos.
import { after } from "next/server";

const MAX_EDAD_MS = 3 * 60 * 1000;

export function isSyncStale(
  lastSync: string | null,
  nowMs: number,
  maxAgeMs = MAX_EDAD_MS,
): boolean {
  if (!lastSync) return true;
  const t = new Date(lastSync).getTime();
  if (Number.isNaN(t)) return true;
  return nowMs - t > maxAgeMs;
}

export function scheduleAutoSync(lastSync: string | null): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // sin secreto no hay cómo autenticar (p. ej. preview)
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!isSyncStale(lastSync, Date.now())) return;
  after(async () => {
    try {
      await fetch("https://pollanow.vercel.app/api/cron/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
    } catch {
      // Mejor página con datos viejos que render roto; el siguiente visitante
      // (o el cron) lo reintenta.
    }
  });
}
