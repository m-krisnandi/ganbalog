-- GanbaLog collaborative workspace schema
-- Run in Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('member')),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists user_preferences (
  user_id uuid not null references auth.users on delete cascade,
  workspace_id uuid not null references workspaces on delete cascade,
  key text not null,
  value text not null,
  primary key (user_id, workspace_id, key)
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  description text not null default '',
  start_date date not null,
  target_date date not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  name text not null,
  unit_label text not null,
  total_units integer not null,
  done_units integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists material_units (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials on delete cascade,
  index integer not null,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (material_id, index)
);

create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  title text not null,
  material_id uuid references materials on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  date date not null,
  title text not null,
  kind text not null check (kind in ('study', 'review')),
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  material_id uuid references materials on delete set null,
  schedule_item_id uuid references schedule_items on delete set null,
  review_of_task_id uuid references tasks on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tasks_plan_date_idx on tasks (plan_id, date);

create table if not exists checkpoints (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  title text not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'achieved')),
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan_id uuid not null references plans on delete cascade,
  date date not null,
  minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id, date)
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  at timestamptz not null default now(),
  action text not null,
  entity text not null,
  entity_id uuid not null,
  detail text not null,
  actor_user_id uuid references auth.users on delete set null,
  actor_display_name text
);

create index if not exists audit_events_workspace_at_idx on audit_events (workspace_id, at desc);

-- RLS helpers
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members wm
    where wm.workspace_id = ws_id and wm.user_id = auth.uid()
  );
$$;

alter table workspaces enable row level security;
alter table user_profiles enable row level security;
alter table workspace_members enable row level security;
alter table user_preferences enable row level security;
alter table plans enable row level security;
alter table materials enable row level security;
alter table material_units enable row level security;
alter table schedule_items enable row level security;
alter table tasks enable row level security;
alter table checkpoints enable row level security;
alter table study_logs enable row level security;
alter table audit_events enable row level security;

-- Workspaces: members can read; authenticated users can create
drop policy if exists workspaces_select on workspaces;
drop policy if exists workspaces_insert on workspaces;
create policy workspaces_select on workspaces for select
  using (public.is_workspace_member(id));
create policy workspaces_insert on workspaces for insert
  with check (auth.uid() is not null);

-- Profiles: workspace co-members can read; owner can upsert self
drop policy if exists profiles_select on user_profiles;
drop policy if exists profiles_upsert on user_profiles;
create policy profiles_select on user_profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from workspace_members wm1
      join workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid() and wm2.user_id = user_profiles.id
    )
  );
create policy profiles_upsert on user_profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Members
drop policy if exists members_select on workspace_members;
drop policy if exists members_insert on workspace_members;
create policy members_select on workspace_members for select
  using (public.is_workspace_member(workspace_id));
create policy members_insert on workspace_members for insert
  with check (auth.uid() is not null);

-- Preferences: own rows only
drop policy if exists preferences_all on user_preferences;
create policy preferences_all on user_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Plans & children: workspace members full access
drop policy if exists plans_all on plans;
drop policy if exists materials_all on materials;
drop policy if exists material_units_all on material_units;
drop policy if exists schedule_all on schedule_items;
drop policy if exists tasks_all on tasks;
drop policy if exists checkpoints_all on checkpoints;
drop policy if exists study_logs_all on study_logs;
drop policy if exists audit_all on audit_events;

create policy plans_all on plans for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy materials_all on materials for all
  using (exists (select 1 from plans p where p.id = materials.plan_id and public.is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from plans p where p.id = materials.plan_id and public.is_workspace_member(p.workspace_id)));

create policy material_units_all on material_units for all
  using (exists (
    select 1 from materials m join plans p on p.id = m.plan_id
    where m.id = material_units.material_id and public.is_workspace_member(p.workspace_id)
  ))
  with check (exists (
    select 1 from materials m join plans p on p.id = m.plan_id
    where m.id = material_units.material_id and public.is_workspace_member(p.workspace_id)
  ));

create policy schedule_all on schedule_items for all
  using (exists (select 1 from plans p where p.id = schedule_items.plan_id and public.is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from plans p where p.id = schedule_items.plan_id and public.is_workspace_member(p.workspace_id)));

create policy tasks_all on tasks for all
  using (exists (select 1 from plans p where p.id = tasks.plan_id and public.is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from plans p where p.id = tasks.plan_id and public.is_workspace_member(p.workspace_id)));

create policy checkpoints_all on checkpoints for all
  using (exists (select 1 from plans p where p.id = checkpoints.plan_id and public.is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from plans p where p.id = checkpoints.plan_id and public.is_workspace_member(p.workspace_id)));

create policy study_logs_all on study_logs for all
  using (
    user_id = auth.uid()
    and exists (select 1 from plans p where p.id = study_logs.plan_id and public.is_workspace_member(p.workspace_id))
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from plans p where p.id = study_logs.plan_id and public.is_workspace_member(p.workspace_id))
  );

create policy audit_all on audit_events for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Realtime publication (idempotent)
do $$
declare
  t text;
begin
  foreach t in array array[
    'plans', 'materials', 'material_units', 'schedule_items',
    'tasks', 'checkpoints', 'study_logs', 'audit_events'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
