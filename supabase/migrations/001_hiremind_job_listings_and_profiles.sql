-- HireMind job listings (separate from the existing scraper jobs table)
create table if not exists job_listings (
  id text primary key,
  company text not null,
  title text not null,
  location text,
  salary_range text,
  job_type text,
  description text,
  apply_url text not null,
  platform text,
  match_score int,
  tags text[] default '{}',
  posted_at text,
  created_at timestamptz default now()
);

-- User profiles from onboarding
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text,
  title text,
  location text,
  experience text,
  skills text[] default '{}',
  industries text[] default '{}',
  salary text,
  resume_base_id uuid references resume_bases(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
