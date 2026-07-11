-- Orphan workspace cleanup + group task stats for progress view

create or replace function public.leave_workspace(p_workspace_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_id uuid;
  label text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from workspace_members
    where workspace_id = p_workspace_id and user_id = uid
  ) then
    raise exception 'Not a member of this workspace';
  end if;

  delete from workspace_members
  where workspace_id = p_workspace_id and user_id = uid;

  delete from user_preferences
  where user_id = uid and workspace_id = p_workspace_id;

  -- Remove empty workspace (cascades plans, materials, etc.)
  if not exists (
    select 1 from workspace_members where workspace_id = p_workspace_id
  ) then
    delete from workspaces where id = p_workspace_id;
  end if;

  select wm.workspace_id into next_id
  from workspace_members wm
  where wm.user_id = uid
  order by wm.joined_at
  limit 1;

  if next_id is not null then
    return next_id;
  end if;

  select coalesce(display_name, 'Study') into label
  from user_profiles
  where id = uid;

  insert into workspaces (name)
  values (label || '''s study group')
  returning id into next_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (next_id, uid, 'member');

  return next_id;
end;
$$;

-- Aggregate per-member task completion (bypasses per-user task RLS)
create or replace function public.get_plan_member_task_stats(
  p_plan_id uuid,
  p_today date default (now() at time zone 'utc')::date
)
returns table(user_id uuid, done_today integer, done_total integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.user_id,
    count(*) filter (where t.status = 'done' and t.date = p_today)::integer as done_today,
    count(*) filter (where t.status = 'done')::integer as done_total
  from tasks t
  join plans p on p.id = t.plan_id
  where t.plan_id = p_plan_id
    and public.is_workspace_member(p.workspace_id)
  group by t.user_id;
$$;

grant execute on function public.get_plan_member_task_stats(uuid, date) to authenticated;
