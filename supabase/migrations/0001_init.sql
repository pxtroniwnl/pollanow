-- Esquema de PollaNow (Mundial 2026). Lectura publica (anon), escritura via
-- service_role (cron/seed, que ignora RLS).

create table if not exists players (
  id    serial primary key,
  name  text not null unique
);

create table if not exists groups (
  id    text primary key,            -- 'A'..'L'
  name  text not null
);

create table if not exists teams (
  code     text primary key,         -- codigo interno (ej. 'MEXICO')
  name     text not null,
  group_id text not null references groups(id),
  flag     text not null default '',
  elo      integer not null default 1700
);

create table if not exists predictions (
  player_id  integer not null references players(id) on delete cascade,
  group_id   text not null references groups(id),
  position   integer not null check (position between 1 and 4),
  team_code  text not null references teams(code),
  primary key (player_id, group_id, position)
);

create table if not exists tiebreak_picks (
  player_id  integer not null references players(id) on delete cascade,
  group_id   text not null references groups(id),
  primary key (player_id, group_id)
);

create table if not exists matches (
  id         text primary key,       -- id del proveedor
  group_id   text not null references groups(id),
  matchday   integer not null default 1,
  home       text not null references teams(code),
  away       text not null references teams(code),
  kickoff    timestamptz,
  status     text not null default 'SCHEDULED',
  home_score integer,
  away_score integer
);

create table if not exists standings (
  group_id   text not null references groups(id),
  team_code  text not null references teams(code),
  position   integer not null,
  played integer not null default 0,
  won integer not null default 0,
  drawn integer not null default 0,
  lost integer not null default 0,
  gf integer not null default 0,
  ga integer not null default 0,
  gd integer not null default 0,
  points integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (group_id, team_code)
);

create table if not exists scoring (
  player_id    integer primary key references players(id) on delete cascade,
  points       integer not null default 0,
  hits         text[] not null default '{}',
  rank         integer not null default 0,
  tiebreak_won boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists group_probabilities (
  player_id  integer not null references players(id) on delete cascade,
  group_id   text not null references groups(id),
  p_hit      numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, group_id)
);

create table if not exists overall_probabilities (
  player_id  integer primary key references players(id) on delete cascade,
  p_win      numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists tournament_meta (
  id             integer primary key default 1,
  goleador_group text,                    -- grupo del goleador real (desempate)
  goleador_name  text,
  last_sync      timestamptz,
  check (id = 1)
);
insert into tournament_meta (id) values (1) on conflict (id) do nothing;

-- Lectura publica para el cliente anon.
alter table players              enable row level security;
alter table groups               enable row level security;
alter table teams                enable row level security;
alter table predictions          enable row level security;
alter table tiebreak_picks       enable row level security;
alter table matches              enable row level security;
alter table standings            enable row level security;
alter table scoring              enable row level security;
alter table group_probabilities  enable row level security;
alter table overall_probabilities enable row level security;
alter table tournament_meta      enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'players','groups','teams','predictions','tiebreak_picks','matches',
    'standings','scoring','group_probabilities','overall_probabilities',
    'tournament_meta'
  ] loop
    execute format(
      'drop policy if exists "public_read" on %I; create policy "public_read" on %I for select using (true);',
      t, t
    );
  end loop;
end $$;

-- Realtime: empujar cambios de las tablas en vivo a los clientes.
do $$
declare t text;
begin
  foreach t in array array[
    'matches','standings','scoring','group_probabilities',
    'overall_probabilities','tournament_meta'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
