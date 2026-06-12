/**
 * Chequeo de salud de la cadena de actualización automática:
 * GitHub Actions -> /api/cron/sync -> Supabase -> web en Vercel.
 *
 *   npm run check
 *
 * Sale con código 1 si algo está roto (sirve para scripts/alertas).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // .env como respaldo
import { kickoffLabel } from "../lib/format";

const SITE = "https://pollanow.vercel.app";
const REPO = "pxtroniwnl/pollanow";

const OK = "✅";
const WARN = "⚠️ ";
const FAIL = "❌";
let broken = false;
let warned = false;

function report(icon: string, msg: string) {
  if (icon === FAIL) broken = true;
  if (icon === WARN) warned = true;
  console.log(`${icon} ${msg}`);
}

async function supa(path: string): Promise<any> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("faltan variables de Supabase en .env.local");
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key } });
  if (!res.ok) throw new Error(`Supabase ${path} -> HTTP ${res.status}`);
  return res.json();
}

async function checkSyncVivo() {
  const [meta] = await supa("tournament_meta?select=last_sync,goleador_name");
  const ageMin = (Date.now() - new Date(meta.last_sync).getTime()) / 60000;
  const cuando = kickoffLabel(meta.last_sync);
  if (ageMin <= 10) {
    report(OK, `Sync vivo: último hace ${ageMin.toFixed(1)} min (${cuando})`);
  } else if (ageMin <= 60) {
    report(WARN, `Sync algo viejo: hace ${ageMin.toFixed(0)} min (${cuando})`);
  } else {
    report(FAIL, `Sync MUERTO: último hace ${(ageMin / 60).toFixed(1)} horas (${cuando})`);
  }
  if (meta.goleador_name) console.log(`   goleador actual: ${meta.goleador_name}`);
}

async function checkWorkflow() {
  const wf = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/sync.yml`,
  ).then((r) => r.json());
  if (wf.state !== "active") {
    report(FAIL, `Workflow de GitHub Actions no activo (estado: ${wf.state ?? "no existe"})`);
    return;
  }
  const runs = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/sync.yml/runs?per_page=1`,
  ).then((r) => r.json());
  const run = runs.workflow_runs?.[0];
  if (!run) {
    report(WARN, "Workflow activo pero sin runs todavía (el primer schedule puede tardar)");
  } else if (run.conclusion === "success" || run.status === "in_progress") {
    report(OK, `Workflow corriendo: último run ${run.status}/${run.conclusion ?? "-"} (${kickoffLabel(run.created_at)})`);
  } else {
    report(FAIL, `Último run del workflow falló: ${run.conclusion} — revisar el secreto CRON_SECRET en GitHub`);
  }
}

async function checkPartidos() {
  const jugados = await supa(
    "matches?select=home,away,home_score,away_score,status,kickoff&status=neq.SCHEDULED&order=kickoff.desc",
  );
  if (jugados.length === 0) {
    report(WARN, "Ningún partido jugado/en juego registrado aún");
    return;
  }
  report(OK, `${jugados.length} partido(s) con datos (jugados o en juego):`);
  for (const m of jugados.slice(0, 5)) {
    console.log(
      `   ${m.home} ${m.home_score ?? "-"}:${m.away_score ?? "-"} ${m.away}  [${m.status}]  ${kickoffLabel(m.kickoff)}`,
    );
  }
}

async function checkProbabilidades() {
  const probs = await supa("overall_probabilities?select=p_win,updated_at&order=p_win.desc");
  const suma = probs.reduce((s: number, p: any) => s + p.p_win, 0);
  const ageMin = (Date.now() - new Date(probs[0].updated_at).getTime()) / 60000;
  if (Math.abs(suma - 1) > 0.01) {
    report(FAIL, `Probabilidades inconsistentes: suman ${(suma * 100).toFixed(1)}% (deben dar 100%)`);
  } else if (ageMin > 60) {
    report(FAIL, `Probabilidades viejas: recalculadas hace ${(ageMin / 60).toFixed(1)} horas`);
  } else {
    report(OK, `Probabilidades frescas (hace ${ageMin.toFixed(1)} min) y consistentes (suman 100%)`);
  }
}

async function checkWeb() {
  const [primero] = await supa("matches?select=kickoff&order=kickoff.asc&limit=1");
  const html = await fetch(`${SITE}/calendario`).then((r) => {
    if (!r.ok) throw new Error(`${SITE}/calendario -> HTTP ${r.status}`);
    return r.text();
  });
  const esperado = kickoffLabel(primero.kickoff);
  if (html.includes(esperado)) {
    report(OK, `Web desplegada muestra hora de Colombia ("${esperado}")`);
  } else {
    report(FAIL, `La web no muestra "${esperado}" — ¿despliegue viejo o zona horaria rota?`);
  }
}

async function main() {
  console.log("— Chequeo PollaNow —\n");
  const checks: [string, () => Promise<void>][] = [
    ["sync", checkSyncVivo],
    ["workflow", checkWorkflow],
    ["partidos", checkPartidos],
    ["probabilidades", checkProbabilidades],
    ["web", checkWeb],
  ];
  for (const [nombre, fn] of checks) {
    try {
      await fn();
    } catch (e: any) {
      report(FAIL, `chequeo "${nombre}" reventó: ${e?.message ?? e}`);
    }
  }
  if (broken) console.log("\nHay problemas: revisar arriba.");
  else if (warned) console.log("\nFunciona, pero con avisos: revisar arriba.");
  else console.log("\nTodo en orden.");
  process.exit(broken ? 1 : 0);
}

main();
