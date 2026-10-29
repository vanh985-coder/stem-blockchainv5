-- P3b, PHA 1: trạng thái TRƯỚC migration 0003 (chỉ có 0001 và 0002). Chạy sau khi đã áp 0001, 0002.
-- Dựng người dùng, lớp, tiến độ cũ; kiểm máy chủ cũ hoạt động và báo đúng kiểu lỗi cho cột chưa có.
\set ON_ERROR_STOP on
create schema if not exists t;
create table if not exists t.results (n serial primary key, phase text, name text, ok boolean, detail text);
create or replace function t.check(phase text, name text, ok boolean, detail text default null) returns void language plpgsql as $$
begin insert into t.results(phase, name, ok, detail) values (phase, name, coalesce(ok, false), detail); end $$;

-- chạy một câu lệnh như người dùng đã đăng nhập (vai trò authenticated, auth.uid() = uid); trả 'ok' hoặc 'ERR:<sqlstate>:<thông báo>'
create or replace function t.exec_as(uid uuid, stmt text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  set local role authenticated;
  begin
    execute stmt;
    reset role;
    return 'ok';
  exception when others then
    reset role;
    return 'ERR:' || sqlstate || ':' || sqlerrm;
  end;
end $$;
-- đếm số hàng một truy vấn trả về khi chạy như uid
create or replace function t.count_as(uid uuid, q text) returns int language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  set local role authenticated;
  execute 'select count(*) from (' || q || ') s' into n;
  reset role;
  return n;
exception when others then
  reset role;
  return -1;
end $$;

-- người dùng thử
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 's1@t', '{"display_name":"Hoc sinh 1"}'),
  ('00000000-0000-0000-0000-0000000000a2', 's2@t', '{"display_name":"Hoc sinh 2"}'),
  ('00000000-0000-0000-0000-0000000000b1', 't1@t', '{"display_name":"Giao vien 1"}'),
  ('00000000-0000-0000-0000-0000000000b2', 't2@t', '{"display_name":"Giao vien 2"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'ad@t', '{"display_name":"Admin"}');
-- vai trò do chủ dự án đặt bằng SQL Editor (auth.uid() rỗng nên trigger cho phép)
update public.profiles set role = 'teacher' where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1';

-- lớp của giáo viên 1 và giáo viên 2 (tạo bằng create_class như thật)
create temp table ctx (k text primary key, v text);
select t.check('truoc', 'giáo viên tạo lớp bằng create_class', t.exec_as('00000000-0000-0000-0000-0000000000b1', $q$ select public.create_class('Lop 1') $q$) = 'ok');
select t.check('truoc', 'học sinh KHÔNG tạo được lớp (create_class)', t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ select public.create_class('Lop gia') $q$) like 'ERR:%');
do $$ declare c1 text; begin
  select join_code into c1 from public.classes where teacher_id = '00000000-0000-0000-0000-0000000000b1';
  insert into ctx values ('code1', c1);
  perform t.check('truoc', 'học sinh 1 vào lớp bằng mã (join_class)', t.exec_as('00000000-0000-0000-0000-0000000000a1', format('select public.join_class(%L)', c1)) = 'ok');
end $$;
select t.check('truoc', 'giáo viên 2 cũng tạo lớp riêng', t.exec_as('00000000-0000-0000-0000-0000000000b2', $q$ select public.create_class('Lop 2') $q$) = 'ok');
do $$ declare c2 text; begin
  select join_code into c2 from public.classes where teacher_id = '00000000-0000-0000-0000-0000000000b2';
  perform t.check('truoc', 'học sinh 2 vào lớp của giáo viên 2', t.exec_as('00000000-0000-0000-0000-0000000000a2', format('select public.join_class(%L)', c2)) = 'ok');
end $$;

-- tiến độ cũ của học sinh 1 và 2, ghi như ứng dụng (upsert)
select t.check('truoc', 'học sinh 1 ghi tiến độ như ứng dụng (upsert level_progress + game_state)',
  t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$
    insert into public.level_progress (user_id, level_id, played, completed, stars, best_score) values ('00000000-0000-0000-0000-0000000000a1', 1, true, true, '{"de":3,"tb":2,"kho":1}', 0)
      on conflict (user_id, level_id) do update set played = excluded.played, completed = excluded.completed, stars = excluded.stars, best_score = excluded.best_score;
    insert into public.level_progress (user_id, level_id, played, completed, stars, best_score) values ('00000000-0000-0000-0000-0000000000a1', 2, true, false, '{"game":2}', 400)
      on conflict (user_id, level_id) do update set played = excluded.played, stars = excluded.stars, best_score = excluded.best_score;
    update public.game_state set golden_pages = 1, coins = 40 where user_id = '00000000-0000-0000-0000-0000000000a1';
  $q$) = 'ok');
select t.check('truoc', 'học sinh 2 ghi tiến độ', t.exec_as('00000000-0000-0000-0000-0000000000a2', $q$
    insert into public.level_progress (user_id, level_id, played, completed, stars, best_score) values ('00000000-0000-0000-0000-0000000000a2', 5, true, true, '{"game":3}', 520) $q$) = 'ok');

select t.check('truoc', 'CHƯA có cột level_progress.auto_completed (đúng trạng thái trước migration 0003)',
  not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'level_progress' and column_name = 'auto_completed'));
select t.check('truoc', 'class_progress cũ có 9 cột trả về + 1 tham số (chưa có auto_completed)', (select cardinality(proargnames) from pg_proc where proname = 'class_progress' and pronamespace = 'public'::regnamespace) = 10);

-- ghi lại lỗi THẬT của máy chủ cũ khi gửi cột chưa có (để kiểm hàm phân loại lỗi của frontend)
do $$ declare r text; begin
  r := t.exec_as('00000000-0000-0000-0000-0000000000b1', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000b1', 12, true) $q$);
  perform t.check('truoc', 'máy chủ cũ báo lỗi thiếu cột khi gửi auto_completed (42703)', r like 'ERR:42703:%', r);
  insert into ctx values ('err_missing_column', r);
end $$;
select t.check('truoc', 'máy chủ cũ vẫn nhận ghi tiến độ KHÔNG có cột mới (tương thích ngược)',
  t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ update public.level_progress set best_score = 410 where user_id = '00000000-0000-0000-0000-0000000000a1' and level_id = 2 $q$) = 'ok');

\copy (select v from ctx where k = 'err_missing_column') to '/tmp/p3b_err_missing_column.txt'
-- lưu trạng thái để so sánh sau migration
create table t.snapshot_before as select * from public.level_progress;
create table t.snapshot_game_before as select * from public.game_state;
