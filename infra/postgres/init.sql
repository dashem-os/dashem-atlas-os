create extension if not exists "uuid-ossp";

create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  organization_id text not null references organizations(id),
  email text not null,
  display_name text not null,
  roles text[] not null default array['viewer'],
  password_hash text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists event_store (
  id text primary key,
  organization_id text,
  name text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  context jsonb not null
);

create table if not exists timeline_entries (
  id text primary key,
  organization_id text not null,
  subject_id text not null,
  occurred_at timestamptz not null,
  actor_id text,
  source_module text not null,
  event_name text not null,
  kind text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists timeline_entries_subject_idx
  on timeline_entries (organization_id, subject_id, occurred_at desc);

create index if not exists event_store_org_idx
  on event_store (organization_id, occurred_at desc);

create table if not exists assets (
  id text primary key,
  organization_id text not null references organizations(id),
  name text not null,
  kind text not null,
  criticality text not null,
  location text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_orders (
  id text primary key,
  organization_id text not null references organizations(id),
  asset_id text not null,
  title text not null,
  description text,
  priority text not null,
  state text not null,
  due_at timestamptz,
  budget jsonb,
  status text not null default 'active',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_order_evidence (
  id text primary key,
  organization_id text not null references organizations(id),
  work_order_id text not null references work_orders(id),
  kind text not null,
  title text not null,
  url text,
  notes text,
  attached_by text,
  attached_at timestamptz not null default now()
);

create table if not exists work_order_checklist (
  id text primary key,
  organization_id text not null references organizations(id),
  work_order_id text not null references work_orders(id),
  label text not null,
  state text not null,
  completed_by text,
  completed_at timestamptz
);

create index if not exists assets_org_idx
  on assets (organization_id, status, criticality);

create index if not exists work_orders_org_state_idx
  on work_orders (organization_id, state, updated_at desc);

create table if not exists ai_artifacts (
  id text primary key,
  organization_id text not null references organizations(id),
  work_order_id text not null references work_orders(id),
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_artifacts_work_order_idx
  on ai_artifacts (organization_id, work_order_id, created_at desc);
