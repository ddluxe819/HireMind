-- Add work_mode to job_listings for structured remote/hybrid/on-site data
alter table job_listings add column if not exists work_mode text;

-- Add work_mode and email/phone/url fields that are in the Pydantic model but missing from profiles
alter table profiles add column if not exists work_mode text;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists linkedin_url text;
alter table profiles add column if not exists github_url text;
alter table profiles add column if not exists portfolio_url text;
alter table profiles add column if not exists work_authorized boolean;
alter table profiles add column if not exists requires_sponsorship boolean;
