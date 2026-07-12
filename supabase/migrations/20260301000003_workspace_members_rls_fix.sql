-- Fix workspace_members RLS: user boleh insert membership untuk diri sendiri
drop policy if exists members_select on workspace_members;
drop policy if exists members_insert on workspace_members;
drop policy if exists members_update on workspace_members;

create policy members_select on workspace_members for select
  using (
    user_id = auth.uid()
    or public.is_workspace_member(workspace_id)
  );

create policy members_insert on workspace_members for insert
  with check (user_id = auth.uid());

create policy members_update on workspace_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
