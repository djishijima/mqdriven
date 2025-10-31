alter table application_forms enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='application_forms' and policyname='read forms anon'
  ) then
    create policy "read forms anon" on application_forms
    for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='application_forms' and policyname='read forms auth'
  ) then
    create policy "read forms auth" on application_forms
    for select to authenticated using (true);
  end if;
end $$;
