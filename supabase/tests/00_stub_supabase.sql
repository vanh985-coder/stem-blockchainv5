-- Dựng "vỏ Supabase" tối thiểu trên một PostgreSQL thường (15+) để kiểm migration và RLS trong môi trường BIỆT LẬP (không phải Supabase thật):
-- vai trò anon/authenticated, schema auth với bảng users và hàm auth.uid() đọc request.jwt.claim.sub như PostgREST. Không dùng cho production.
-- Không chạy file này trên Supabase thật (đã có sẵn các thứ này).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to authenticated;
-- Supabase cấp mặc định mọi quyền trên bảng/hàm public cho anon/authenticated; RLS và trigger mới là thứ chặn.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
