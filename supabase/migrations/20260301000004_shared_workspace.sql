-- Shared workspace: invite codes, per-user tasks, group-readable study logs

-- Revert overly permissive workspace SELECT (002)
drop policy if exists workspaces_select on workspaces;
create policy workspaces_select on workspaces for select
  using (public.is_workspace_member(id));

-- Invite code on workspace
alter table workspaces add column if not exists invite_code text unique;
create index if not exists workspaces_invite_code_idx on workspaces (invite_code);

-- Per-user daily tasks (each member tracks their own checklist)
alter table tasks add column if not exists user_id uuid references auth.users on delete cascade;
create index if not exists tasks_user_plan_date_idx on tasks (user_id, plan_id, date);

update tasks t
set user_id = (
  select wm.user_id
  from plans p
  join workspace_members wm on wm.workspace_id = p.workspace_id
  where p.id = t.plan_id
  order by wm.joined_at
  limit 1
)
where user_id is null;

-- Tasks: each user sees/edits only their rows
drop policy if exists tasks_all on tasks;
drop policy if exists tasks_select on tasks;
drop policy if exists tasks_insert on tasks;
drop policy if exists tasks_update on tasks;
drop policy if exists tasks_delete on tasks;
create policy tasks_select on tasks for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from plans p
      where p.id = tasks.plan_id and public.is_workspace_member(p.workspace_id)
    )
  );
create policy tasks_insert on tasks for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from plans p
      where p.id = tasks.plan_id and public.is_workspace_member(p.workspace_id)
    )
  );
create policy tasks_update on tasks for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from plans p
      where p.id = tasks.plan_id and public.is_workspace_member(p.workspace_id)
    )
  )
  with check (user_id = auth.uid());
create policy tasks_delete on tasks for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1 from plans p
      where p.id = tasks.plan_id and public.is_workspace_member(p.workspace_id)
    )
  );

-- Study logs: members read all in workspace; write own only
drop policy if exists study_logs_all on study_logs;
drop policy if exists study_logs_select on study_logs;
drop policy if exists study_logs_insert on study_logs;
drop policy if exists study_logs_update on study_logs;
drop policy if exists study_logs_delete on study_logs;
create policy study_logs_select on study_logs for select
  using (
    exists (
      select 1 from plans p
      where p.id = study_logs.plan_id and public.is_workspace_member(p.workspace_id)
    )
  );
create policy study_logs_insert on study_logs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from plans p
      where p.id = study_logs.plan_id and public.is_workspace_member(p.workspace_id)
    )
  );
create policy study_logs_update on study_logs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy study_logs_delete on study_logs for delete
  using (user_id = auth.uid());

-- Workspace update for invite code regeneration (members only)
drop policy if exists workspaces_update on workspaces;
create policy workspaces_update on workspaces for update
  using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

-- Join workspace by invite code (security definer)
create or replace function public.join_workspace_by_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select id into ws_id
  from workspaces
  where invite_code = upper(trim(p_code));

  if ws_id is null then
    raise exception 'Invalid invite code';
  end if;

  if not exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = uid
  ) then
    insert into workspace_members (workspace_id, user_id, role)
    values (ws_id, uid, 'member');
  end if;

  return ws_id;
end;
$$;

grant execute on function public.join_workspace_by_invite(text) to authenticated;
