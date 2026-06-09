"use client";
import { useState } from "react";
import type { AppData, PlayerView, TeamView } from "@/lib/data";

export function PredictionsView({ data }: { data: AppData }) {
  const [active, setActive] = useState(data.players[0]?.name ?? "");
  const player = data.players.find((p) => p.name === active) ?? data.players[0];
  const team = (c: string): TeamView | undefined => data.teams[c];

  return (
    <div>
      {/* Tabs por persona */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {data.players.map((p) => (
          <button
            key={p.name}
            onClick={() => setActive(p.name)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
              p.name === active
                ? "bg-[var(--magenta)] text-white glow-magenta"
                : "panel text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {p.name}
            <span className={`scoreboard-num text-base ${p.name === active ? "text-white" : "text-[var(--gold)]"}`}>
              {p.points}
            </span>
          </button>
        ))}
      </div>

      {player && <PlayerBracket player={player} groups={data.groups} team={team} />}
    </div>
  );
}

function PlayerBracket({
  player, groups, team,
}: {
  player: PlayerView;
  groups: AppData["groups"];
  team: (c: string) => TeamView | undefined;
}) {
  return (
    <div>
      <div className="panel mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[0.62rem] uppercase tracking-wide text-[var(--muted)]">Apuesta de</p>
          <p className="font-display text-3xl tracking-wide">{player.name}</p>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <p className="text-[0.62rem] uppercase tracking-wide text-[var(--muted)]">Goleador</p>
            <p className="font-display text-xl text-[var(--gold)]">
              {player.tiebreaks.map((g) => `G${g}`).join(" · ")}
            </p>
          </div>
          <div>
            <p className="text-[0.62rem] uppercase tracking-wide text-[var(--muted)]">Puntos</p>
            <p className="scoreboard-num text-4xl text-[var(--gold)]">{player.points}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const pred = player.predictions[g.id] ?? [];
          const hit = player.hits.includes(g.id);
          const isGoleador = player.tiebreaks.includes(g.id);
          return (
            <div key={g.id} className={`panel p-3 ${hit ? "glow-gold" : ""}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-lg tracking-wide">
                  Grupo <span className="text-[var(--magenta)]">{g.id}</span>
                </span>
                <span className="flex gap-1">
                  {isGoleador && <span className="chip border-[var(--gold)]/40 text-[var(--gold)]">⚽</span>}
                  {hit && <span className="chip border-[var(--grass)]/40 text-[var(--grass)]">+10</span>}
                </span>
              </div>
              <ol className="space-y-1">
                {pred.map((code, idx) => {
                  const t = team(code);
                  return (
                    <li key={code} className="flex items-center gap-2 text-sm">
                      <span className="font-display w-4 text-[var(--muted)]">{idx + 1}</span>
                      <span className="text-base">{t?.flag}</span>
                      <span className="font-medium">{t?.name}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
