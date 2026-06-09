// Endpoint de sincronizacion. Lo invoca el Cron de Vercel (o manualmente con
// la cabecera Authorization: Bearer <CRON_SECRET>).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { FootballDataProvider } from "@/lib/api/football-data";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing FOOTBALL_DATA_API_KEY" }, { status: 500 });
  }
  const iterations = Number(process.env.MONTECARLO_ITERATIONS ?? 20000);
  try {
    const provider = new FootballDataProvider({ apiKey });
    const db = createAdminClient();
    const result = await runSync(provider, db, iterations);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("sync error", e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

// Vercel Cron usa GET; permitimos POST para disparo manual.
export const GET = handle;
export const POST = handle;
