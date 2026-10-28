/**
 * Migraciones de la base de datos. Se aplican en orden y una sola vez.
 * Las tablas viven en el esquema `kamura` (no expuesto por la API REST de
 * Supabase) y además tienen RLS activado sin políticas: solo el servidor,
 * conectado con la cadena privada, puede leerlas.
 */
export const MIGRATIONS: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "inicial",
    sql: `
create table kamura.quote_requests (
  id uuid primary key,
  public_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'nueva',
  customer_name text not null,
  phone text not null,
  email text not null,
  city text,
  province text,
  comments text,
  category text not null,
  wood text not null,
  design jsonb not null,
  design_version integer not null,
  summary text not null,
  review_warnings jsonb not null default '[]'::jsonb,
  change_log jsonb not null default '[]'::jsonb,
  source jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  design_token_hash text,
  ip_hash text,
  notifications jsonb not null default '{}'::jsonb
);
create index quote_requests_created_idx on kamura.quote_requests (created_at desc);
create index quote_requests_status_idx on kamura.quote_requests (status);
create index quote_requests_category_idx on kamura.quote_requests (category);

create table kamura.quote_files (
  id uuid primary key,
  quote_id uuid not null references kamura.quote_requests(id) on delete cascade,
  kind text not null,
  mime text not null,
  size integer not null,
  filename text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create index quote_files_quote_idx on kamura.quote_files (quote_id);

create table kamura.quote_notes (
  id uuid primary key,
  quote_id uuid not null references kamura.quote_requests(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index quote_notes_quote_idx on kamura.quote_notes (quote_id);

create table kamura.quote_events (
  id uuid primary key,
  quote_id uuid not null references kamura.quote_requests(id) on delete cascade,
  type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index quote_events_quote_idx on kamura.quote_events (quote_id);

create table kamura.shared_designs (
  token_hash text primary key,
  design jsonb not null,
  quote_id uuid references kamura.quote_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_accessed_at timestamptz
);

create table kamura.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, window_start)
);

create table kamura.admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip_hash text
);

alter table kamura.quote_requests enable row level security;
alter table kamura.quote_files enable row level security;
alter table kamura.quote_notes enable row level security;
alter table kamura.quote_events enable row level security;
alter table kamura.shared_designs enable row level security;
alter table kamura.rate_limits enable row level security;
alter table kamura.admin_sessions enable row level security;
`,
  },
];
