-- Already applied to the Supabase project (migration "create_user_lists"). Kept here as a record.
-- One row per account: saved products, price alerts and collections, synced from the app.
create table public.user_lists (
  user_id uuid primary key references auth.users (id) on delete cascade,
  saved jsonb not null default '[]'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  collections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_lists_saved_ok check (jsonb_typeof(saved) = 'array' and jsonb_array_length(saved) <= 100 and octet_length(saved::text) <= 300000),
  constraint user_lists_alerts_ok check (jsonb_typeof(alerts) = 'array' and jsonb_array_length(alerts) <= 50 and octet_length(alerts::text) <= 150000),
  constraint user_lists_collections_ok check (jsonb_typeof(collections) = 'array' and jsonb_array_length(collections) <= 50 and octet_length(collections::text) <= 100000)
);
comment on table public.user_lists is 'One row per account: saved products, price alerts and collections (synced from the app). Each person can only see and change their own row.';
alter table public.user_lists enable row level security;
revoke all on public.user_lists from anon;
grant select, insert, update, delete on public.user_lists to authenticated;
create policy user_lists_select_own on public.user_lists for select to authenticated using (user_id = (select auth.uid()));
create policy user_lists_insert_own on public.user_lists for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_lists_update_own on public.user_lists for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_lists_delete_own on public.user_lists for delete to authenticated using (user_id = (select auth.uid()));
create trigger user_lists_set_updated_at before update on public.user_lists for each row execute function public.set_updated_at();
