-- Resume base documents (uploaded by user)
create table if not exists resume_bases (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null default '',
  created_at timestamptz default now()
);

-- Tailored resume variants (generated per job)
create table if not exists resume_variants (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references resume_bases(id) on delete cascade,
  job_id text not null,
  content text not null default '',
  pdf_path text,
  created_at timestamptz default now()
);

-- Cover letters (generated per job)
create table if not exists cover_letters (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  company text not null,
  content text not null default '',
  created_at timestamptz default now()
);

-- Job applications (tracks status and linked documents)
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  status text not null default 'pending',
  resume_variant_id uuid references resume_variants(id),
  cover_letter_id uuid references cover_letters(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
