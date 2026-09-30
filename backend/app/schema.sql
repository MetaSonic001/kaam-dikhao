-- Kaam Dikhao schema. Idempotent: safe to run on every startup.
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  email text,
  display_name text,
  role text not null default 'citizen',          -- citizen | moderator | admin | journalist
  lang text not null default 'en',
  created_at timestamptz not null default now()
);

-- A "site" is one place where public work is claimed or observed.
-- origin: osm (community-mapped construction), official (document-backed), citizen (reported place)
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null default 'other',
  description text,
  lat double precision not null,
  lng double precision not null,
  geometry jsonb,                                 -- GeoJSON LineString/Polygon when known
  address text, locality text, ward text, city text, state text, pincode text,
  origin text not null,
  origin_ref text,
  status text not null default 'INSUFFICIENT_EVIDENCE',
  agency text,                                    -- department / operator as stated by the source
  contractor text,
  sanctioned_amount numeric,
  awarded_amount numeric,
  work_order_date date,
  expected_completion date,
  actual_completion date,
  source_url text,                                -- official / origin record
  source_label text,
  claim_text text,                                -- what the official record says
  tags jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (origin, origin_ref)
);
create index if not exists sites_geo on sites (lat, lng);
create index if not exists sites_city on sites (city);
create index if not exists sites_status on sites (status);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  user_id uuid,
  kind text not null default 'photo',             -- photo | voice | text
  category text,
  note_public text,                               -- neutral, PII-redacted text shown publicly
  note_original text,                             -- what the citizen wrote (moderators only)
  lang text,
  media_url text,
  thumb_url text,
  media_sha256 text,
  captured_at timestamptz,
  lat double precision, lng double precision,
  location_source text,                           -- exif | device | manual
  distance_to_site_m double precision,
  exif jsonb not null default '{}'::jsonb,        -- public-safe subset only
  ai jsonb not null default '{}'::jsonb,          -- candidate observations, never authoritative
  flags jsonb not null default '[]'::jsonb,       -- guard flags for moderators
  status text not null default 'SUBMITTED',       -- SUBMITTED | UNDER_REVIEW | VERIFIED | DISPUTED | REJECTED
  moderator_id uuid, moderation_reason text, moderated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_site on reports (site_id);
create index if not exists reports_status on reports (status);
create unique index if not exists reports_sha on reports (media_sha256) where media_sha256 is not null;

create table if not exists report_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists site_documents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references sites(id) on delete cascade,
  user_id uuid,
  kind text not null default 'other',             -- tender | work_order | completion | budget | other
  title text,
  file_url text,
  source_url text,
  extracted jsonb not null default '{}'::jsonb,   -- candidate fields; human reviewed before applying
  text_excerpt text,
  status text not null default 'UNDER_REVIEW',
  created_at timestamptz not null default now()
);

create table if not exists satellite_observations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  kind text not null,                             -- frame | change
  scene_id text, acquired_at timestamptz, cloud_cover real,
  image_url text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sat_site on satellite_observations (site_id, acquired_at);

create table if not exists rtis (
  id uuid primary key default gen_random_uuid(),
  reference text,
  site_id uuid references sites(id) on delete set null,
  user_id uuid,
  authority text not null,
  subject text not null,
  question_text text not null,
  filed_on date, response_on date,
  outcome text not null default 'PENDING',        -- PENDING | FULL | PARTIAL | REJECTED | TRANSFERRED | NO_RESPONSE
  response_text text,
  summary_ai text,
  document_url text,
  city text, state text,
  status text not null default 'UNDER_REVIEW',    -- published only after moderation
  created_at timestamptz not null default now()
);

create table if not exists replies (               -- right of reply
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  report_id uuid references reports(id) on delete set null,
  user_id uuid,
  org text not null, author_name text, designation text,
  body text not null, doc_url text,
  stance text not null default 'response',        -- response | dispute | correction | clarification
  status text not null default 'UNDER_REVIEW',
  created_at timestamptz not null default now()
);

create table if not exists takedowns (
  id uuid primary key default gen_random_uuid(),
  target_type text, target_id text, target_url text,
  reason text not null, details text,
  contact_name text, contact_email text not null,
  status text not null default 'RECEIVED',        -- RECEIVED | ACKNOWLEDGED | ACTIONED | REJECTED
  ack_at timestamptz, resolved_at timestamptz, resolution text,
  created_at timestamptz not null default now()
);

create table if not exists follows (
  user_id uuid not null, site_id uuid not null references sites(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);

create table if not exists audit_log (
  id bigserial primary key,
  actor uuid, actor_role text,
  action text not null, target_type text, target_id text,
  before jsonb, after jsonb, reason text,
  at timestamptz not null default now()
);

create table if not exists sync_runs (
  id bigserial primary key,
  source text not null, scope text,
  started_at timestamptz not null default now(), finished_at timestamptz,
  ok boolean, items int default 0, detail text
);

create table if not exists geocode_cache (
  key text primary key, data jsonb not null, created_at timestamptz not null default now()
);

create table if not exists doc_chunks (             -- RAG corpus
  id uuid primary key default gen_random_uuid(),
  source_type text not null, source_id text not null,
  title text, url text, body text not null,
  embedding real[],
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

alter table reports add column if not exists observation text;   -- progress | completed | issue | not_started | other
alter table sites add column if not exists published boolean not null default true;   -- citizen-created sites stay hidden until a report on them is verified
alter table replies add column if not exists contact_email text;   -- private; used by moderators to verify the representative

-- Row Level Security: the API connects as the table owner (bypasses RLS). With RLS on and no policies,
-- the public REST API (anon / publishable key) can read and write nothing. All access goes through FastAPI.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
