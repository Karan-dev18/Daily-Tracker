-- Reset and recreate the Daily Tracker tasks table.
-- Warning: this deletes all existing rows in public.tasks.

create extension if not exists pgcrypto;

drop table if exists public.tasks cascade;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  task_name text not null,
  category text not null default 'general',
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, task_name)
);

create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_user_date on public.tasks(user_id, date);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks
  for delete
  to authenticated
  using (auth.uid() = user_id);
