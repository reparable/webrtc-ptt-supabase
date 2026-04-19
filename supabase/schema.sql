-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade,
  username text unique not null,
  full_name text,
  created_at timestamptz default now(),
  primary key (id)
);

-- Signaling table
create table if not exists signals (
  id bigserial primary key,
  room text not null,
  sender uuid references auth.users,
  payload jsonb not null,
  created_at timestamptz default now()
);

create index if not exists signals_room_idx on signals (room);
