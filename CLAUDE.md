# CLAUDE.md — Guía del repo para Claude Code

Memoria del proyecto para no tener que reconstruir contexto en cada sesión.

## Qué es

**PollaNow**: web de la polla de la **fase de grupos** del Mundial 2026 entre 7
amigos (David, Matias, Polo, Patron, Otto, Yezid, Mayra). Cada uno predijo el
orden 1º–4º de los 12 grupos (A–L, 48 selecciones) y eligió **2 grupos** como
apuesta de **de qué grupo saldrá el goleador** de la fase de grupos (desempate).

Reglas:
- **+10 puntos** por cada grupo con los 4 puestos exactos (todo o nada).
- **Desempate**: entre empatados, gana quien tenga el grupo del goleador real
  entre sus 2 grupos elegidos. Si sigue empate, se comparte la posición.

Producción: **https://pollanow.vercel.app**

## Stack

Next.js 16 (App Router, TS) · Tailwind 3 · Supabase (Postgres + Realtime) ·
football-data.org (resultados) · Vercel (hosting + cron) · Vitest (tests).

## Comandos

```bash
npm run dev          # desarrollo
npm run build        # build de producción (verifica TS)
npm test             # 27 tests de lógica (vitest)
python3 scripts/build_seed.py   # Excel -> data/seed.json
npm run seed:load    # data/seed.json -> Supabase (necesita .env.local)
```

Disparar el sync manualmente (local o prod):
```bash
curl -X POST <URL>/api/cron/sync -H "Authorization: Bearer $CRON_SECRET"
```

## Arquitectura y archivos clave

**Lógica pura (testeada, sin I/O)** — el corazón del proyecto:
- `lib/scoring.ts` — `computeStandings` (reglas FIFA intra-grupo con head-to-head),
  `scoreGroup` (+10/grupo), `computeLeaderboard` (puntos + desempate).
- `lib/elo.ts` — `outcomeProbabilities`/`goalLambdas` desde Elo (modelo Poisson).
- `lib/montecarlo.ts` — `runMonteCarlo`: simula partidos restantes → `perGroupHit`
  (prob. de acertar cada grupo) y `overallWin` (prob. de ganar la polla).
  PRNG `mulberry32` para tests deterministas.
- `lib/build-state.ts` — arma objetos de dominio desde filas de la BD (+ grupo
  del goleador).

**Integración**:
- `lib/api/provider.ts` + `lib/api/football-data.ts` — adaptador intercambiable.
  `lib/api/team-map.ts` mapea nombres en inglés del API → códigos internos
  (normaliza acentos/guiones; ojo con variantes como "Bosnia-Herzegovina",
  "Cape Verde Islands").
- `lib/sync.ts` — `runSync`: API → upsert matches → standings → scoring →
  Monte Carlo → escribe en Supabase. Es la orquestación.
- `lib/supabase/{server,client}.ts` — clientes (admin service_role / read anon /
  browser realtime).
- `lib/data.ts` — `getAppData()` para los Server Components: estructura desde
  `data/seed.json`, datos en vivo desde Supabase si está configurado.

**App / UI** (`app/`, `components/`):
- Rutas: `/` (leaderboard+hero), `/calendario`, `/grupos`, `/predicciones`,
  `/api/cron/sync` (route handler, protegido con `CRON_SECRET`).
- `components/RealtimeRefresher.tsx` — se suscribe a Supabase Realtime y llama
  `router.refresh()` (debounce) → la UI se actualiza sola.
- Estética "scoreboard del Mundial": Anton (display) + Hanken Grotesk, paleta
  pitch/magenta/electric/gold en `app/globals.css`.

**Datos / esquema**:
- `data/data-polla.xlsx` — Excel original. `data/seed.json` — transcripción.
- `supabase/migrations/0001_init.sql` — esquema + RLS de lectura pública +
  publicación Realtime. Tablas: players, groups, teams, predictions,
  tiebreak_picks, matches, standings, scoring, group_probabilities,
  overall_probabilities, tournament_meta.

## Cómo fluye / cómo se calculan las probabilidades

1. El cron llama a `/api/cron/sync` → `runSync`.
2. Trae los 72 partidos de grupos; upsert en `matches`.
3. `computeStandings` arma las tablas reales; `computeLeaderboard` los puntos.
4. `runMonteCarlo` (Elo) simula N veces los partidos NO jugados (los jugados se
   fijan). Por grupo: `p_hit` = fracción de sims donde el orden 1-4 real coincide
   con la predicción. Global: cada sim suma +10 por grupo acertado, gana el de
   más puntos (empates por goleador-grupo si se conoce, si no se reparten) →
   `p_win` (suma 100% entre las 7 personas).
5. Escribe todo en Supabase → Realtime empuja a los navegadores abiertos.

## Variables de entorno (`.env.local`, ver `.env.example`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_DATA_API_KEY`, `CRON_SECRET`,
`MONTECARLO_ITERATIONS` (default 20000).

> Los scripts (`scripts/seed.ts`) cargan `.env.local` explícitamente con dotenv.
> Next.js lo carga solo.

## Despliegue / cron

- Vercel desde GitHub (`main`). Variables en Project Settings → Environment
  Variables. **Pushear directo a `main` está bloqueado**: trabajar en rama y
  mergear PR.
- Cron de Vercel = **diario** (`vercel.json`, límite del plan Hobby). Las
  actualizaciones frecuentes durante los partidos las hace un cron externo
  (**cron-job.org**, cada ~3 min) que llama a `/api/cron/sync` con la cabecera
  `Authorization: Bearer <CRON_SECRET>`.
- "Tiempo real" = captura por polling (~3 min) + push instantáneo (Realtime).

## Gotchas

- **Next 16** usa Turbopack para el build; si aparece `PageNotFoundError` en
  "Collecting page data", borrar `.next` y reconstruir.
- Vercel **bloquea versiones vulnerables de Next.js**; mantener Next actualizado
  (la línea 15.5 quedó marcada → se subió a 16.x).
- El HTML de Next App Router incluye el contenido **dos veces** (DOM + payload
  RSC de hidratación); al hacer `grep` sobre el HTML los conteos salen duplicados.
- `data/seed.json` es la fuente de la **estructura** (grupos/equipos/apuestas);
  no cambia. Solo lo dinámico (matches/standings/scoring/probabilidades) vive en
  Supabase.
- Las probabilidades fluctúan ligeramente entre syncs (ruido Monte Carlo) por el
  seed aleatorio; los tests usan `mulberry32` con semilla fija.

## Estilo

Comentarios y UI en español. Lógica con tests primero (TDD) en `lib/*.test.ts`.
Componentes pequeños y enfocados. Reusar `lib/scoring.ts` en la simulación.
