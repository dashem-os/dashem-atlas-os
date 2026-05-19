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
