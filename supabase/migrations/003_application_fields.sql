-- Extend profiles with canonical ATS fields used for autofill.
-- Existing columns (name, email, phone, linkedin_url, location, salary) are kept.
alter table profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists github_url text,
  add column if not exists portfolio_url text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text,
  add column if not exists zip text,
  add column if not exists work_authorized boolean,
  add column if not exists requires_sponsorship boolean,
  add column if not exists years_experience text,
  add column if not exists earliest_start_date text,
  add column if not exists open_to_relocation boolean,
  add column if not exists work_mode text,
  add column if not exists gender text,
  add column if not exists ethnicity text,
  add column if not exists veteran_status text,
  add column if not exists disability_status text;

-- Per-application field snapshot + custom screening question answers.
-- fields: jsonb map of canonical field key -> user value (e.g. email, phone, salaryExpectation).
-- custom_answers: jsonb array of { id, question, answer, selector?, detected_at }.
create table if not exists application_fields (
  application_id uuid primary key references applications(id) on delete cascade,
  fields jsonb not null default '{}'::jsonb,
  custom_answers jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);
