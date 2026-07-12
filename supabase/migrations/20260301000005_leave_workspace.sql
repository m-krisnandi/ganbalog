-- Leave workspace + member delete policy

drop policy if exists members_delete on workspace_members;
create policy members_delete on workspace_members for delete
  using (user_id = auth.uid());

-- Leave a workspace; returns next active workspace id (or newly created one)
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

grant execute on function public.leave_workspace(uuid) to authenticated;

-- Realtime for group membership / workspace name updates
do $$
begin
  alter publication supabase_realtime add table workspaces;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table workspace_members;
exception when duplicate_object then null;
end $$;
