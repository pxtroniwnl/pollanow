/**
 * Carga data/seed.json en Supabase (players, groups, teams, predictions,
 * tiebreak_picks). Idempotente. Requiere SUPABASE_SERVICE_ROLE_KEY.
 *
 *   npm run seed:load
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // .env como respaldo
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/server";

interface Seed {
  groups: { id: string; name: string }[];
  teams: { code: string; name: string; group: string; flag: string; elo: number }[];
  players: string[];
  predictions: Record<string, Record<string, string[]>>;
  tiebreaks: Record<string, string[]>;
}

async function main() {
  const seed: Seed = JSON.parse(
    readFileSync(resolve(process.cwd(), "data/seed.json"), "utf-8"),
  );
  const db = createAdminClient();

  console.log("→ groups");
  await db.from("groups").upsert(seed.groups).throwOnError();

  console.log("→ teams");
  await db
    .from("teams")
    .upsert(
      seed.teams.map((t) => ({
        code: t.code, name: t.name, group_id: t.group, flag: t.flag, elo: t.elo,
      })),
    )
    .throwOnError();

  console.log("→ players");
  await db
    .from("players")
    .upsert(seed.players.map((name) => ({ name })), { onConflict: "name" })
    .throwOnError();
  const { data: players } = await db.from("players").select("id,name").throwOnError();
  const idByName = new Map(players!.map((p: any) => [p.name, p.id as number]));

  console.log("→ predictions");
  const predRows: any[] = [];
  for (const [name, byGroup] of Object.entries(seed.predictions)) {
    const pid = idByName.get(name)!;
    for (const [gid, order] of Object.entries(byGroup)) {
      order.forEach((code, idx) =>
        predRows.push({ player_id: pid, group_id: gid, position: idx + 1, team_code: code }),
      );
    }
  }
  await db.from("predictions").upsert(predRows).throwOnError();

  console.log("→ tiebreak_picks");
  const tbRows: any[] = [];
  for (const [name, groups] of Object.entries(seed.tiebreaks)) {
    const pid = idByName.get(name)!;
    for (const gid of groups) tbRows.push({ player_id: pid, group_id: gid });
  }
  await db.from("tiebreak_picks").upsert(tbRows).throwOnError();

  console.log(
    `✓ Seed cargado: ${seed.players.length} jugadores, ${seed.teams.length} equipos, ` +
      `${predRows.length} predicciones, ${tbRows.length} tiebreaks`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
