create table if not exists public.jobs (
    id uuid primary key default gen_random_uuid(),
    title text not null check (length(trim(title)) > 0),
    company text not null check (length(trim(company)) > 0),
    location text not null check (length(trim(location)) > 0),
    work_type text not null check (work_type in ('Remote', 'Hybrid', 'Onsite', 'Internship', 'Contract')),
    description text not null check (length(trim(description)) > 0),
    apply_url text,
    published boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.job_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.jobs enable row level security;
alter table public.job_admins enable row level security;

create or replace function public.is_job_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.job_admins
        where user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_job_admin() from public;
grant execute on function public.is_job_admin() to authenticated;

grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;

drop policy if exists "Anyone can view published jobs" on public.jobs;
create policy "Anyone can view published jobs"
on public.jobs for select
to anon, authenticated
using (published or (select public.is_job_admin()));

drop policy if exists "Admins can add jobs" on public.jobs;
create policy "Admins can add jobs"
on public.jobs for insert
to authenticated
with check ((select public.is_job_admin()));

drop policy if exists "Admins can update jobs" on public.jobs;
create policy "Admins can update jobs"
on public.jobs for update
to authenticated
using ((select public.is_job_admin()))
with check ((select public.is_job_admin()));

drop policy if exists "Admins can delete jobs" on public.jobs;
create policy "Admins can delete jobs"
on public.jobs for delete
to authenticated
using ((select public.is_job_admin()));
