-- Fix: user baru harus bisa melihat workspace yang sudah ada untuk auto-join
drop policy if exists workspaces_select on workspaces;
create policy workspaces_select on workspaces for select
  using (auth.uid() is not null);
