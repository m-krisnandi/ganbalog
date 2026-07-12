-- SUPERSEDED by 004_shared_workspace.sql — do NOT run on new projects.
-- Migration 004 drops this policy and replaces it with is_workspace_member(id).
-- Kept only for historical reference if an old database was created before 004.

-- Fix: user baru harus bisa melihat workspace yang sudah ada untuk auto-join
drop policy if exists workspaces_select on workspaces;
create policy workspaces_select on workspaces for select
  using (auth.uid() is not null);
