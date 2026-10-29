-- P3b, PHA 2: SAU khi áp migration 0003 (lần đầu). Dùng lại t.check / t.exec_as / t.count_as của pha 1 (phải chạy pha 1 trước, cùng cơ sở dữ liệu).
\set ON_ERROR_STOP on
\set S1 '00000000-0000-0000-0000-0000000000a1'
\set S2 '00000000-0000-0000-0000-0000000000a2'
\set T1 '00000000-0000-0000-0000-0000000000b1'
\set T2 '00000000-0000-0000-0000-0000000000b2'
\set AD '00000000-0000-0000-0000-0000000000c1'

-- ===== dữ liệu cũ nguyên vẹn =====
select t.check('sau', 'dữ liệu level_progress cũ giữ nguyên (mọi cột cũ), cột mới mặc định false',
  (select count(*) = (select count(*) from t.snapshot_before) from public.level_progress l join t.snapshot_before b using (user_id, level_id)
     where l.played = b.played and l.completed = b.completed and l.stars = b.stars and l.best_score = b.best_score and l.auto_completed = false));
select t.check('sau', 'game_state cũ giữ nguyên (golden_pages, coins, data)',
  (select count(*) = (select count(*) from t.snapshot_game_before) from public.game_state g join t.snapshot_game_before b using (user_id) where g.golden_pages = b.golden_pages and g.coins = b.coins and g.data = b.data));
select t.check('sau', 'cột auto_completed là boolean NOT NULL default false',
  (select data_type = 'boolean' and is_nullable = 'NO' and column_default = 'false' from information_schema.columns where table_schema = 'public' and table_name = 'level_progress' and column_name = 'auto_completed'));
select t.check('sau', 'RLS vẫn bật trên level_progress, game_state, profiles, classes, class_members',
  (select bool_and(relrowsecurity) from pg_class where oid in ('public.level_progress'::regclass, 'public.game_state'::regclass, 'public.profiles'::regclass, 'public.classes'::regclass, 'public.class_members'::regclass)));

-- ===== giáo viên / admin đặt được cờ =====
select t.check('sau', 'giáo viên 1 đặt cờ cho CHÍNH MÌNH bằng INSERT', t.exec_as(:'T1', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000b1', 12, true) $q$) = 'ok');
select t.check('sau', 'cờ của giáo viên không tạo điểm/sao/hoàn thành thật (played, completed, stars, best_score giữ mặc định)',
  exists (select 1 from public.level_progress where user_id = :'T1' and level_id = 12 and auto_completed and not played and not completed and stars = '{}'::jsonb and best_score = 0));
select t.check('sau', 'cờ của giáo viên không tạo xu hay trang (game_state của giáo viên không đổi)',
  exists (select 1 from public.game_state where user_id = :'T1' and coins = 0 and golden_pages = 0));
select t.check('sau', 'giáo viên 1 bật rồi tắt cờ bằng UPDATE/upsert được', t.exec_as(:'T1', $q$
    insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000b1', 12, true)
      on conflict (user_id, level_id) do update set auto_completed = false;
    insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000b1', 12, true)
      on conflict (user_id, level_id) do update set auto_completed = excluded.auto_completed; $q$) = 'ok');
select t.check('sau', 'admin đặt được cờ cho chính mình', t.exec_as(:'AD', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000c1', 3, true) $q$) = 'ok');
select t.check('sau', 'giáo viên 2 đặt cờ màn 5 (sẽ dùng cho class_progress)', t.exec_as(:'T2', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000b2', 5, true) $q$) = 'ok');

-- ===== học sinh KHÔNG tự đặt được cờ =====
do $$ declare r text; begin
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000a1', 9, true) $q$);
  perform t.check('sau', 'học sinh INSERT hàng có auto_completed = true bị từ chối (trigger)', r like 'ERR:P0001:Chỉ giáo viên%', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ update public.level_progress set auto_completed = true where user_id = '00000000-0000-0000-0000-0000000000a1' and level_id = 1 $q$);
  perform t.check('sau', 'học sinh UPDATE auto_completed = true trên hàng của mình bị từ chối', r like 'ERR:P0001:Chỉ giáo viên%', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000a1', 1, true) on conflict (user_id, level_id) do update set auto_completed = excluded.auto_completed $q$);
  perform t.check('sau', 'học sinh upsert (ON CONFLICT DO UPDATE) đặt cờ bị từ chối', r like 'ERR:P0001:Chỉ giáo viên%', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ delete from public.level_progress where user_id = '00000000-0000-0000-0000-0000000000a1' and level_id = 9; insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000a1', 9, true) $q$);
  perform t.check('sau', 'học sinh xóa hàng rồi INSERT lại với cờ true vẫn bị từ chối', r like 'ERR:P0001:%', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ insert into public.level_progress (user_id, level_id, auto_completed) select 0 + 1, 1, true $q$);
  perform t.check('sau', 'học sinh không lách bằng INSERT … SELECT (vẫn lỗi)', r like 'ERR:%', r);
end $$;
select t.check('sau', 'sau các lần thử, học sinh 1 vẫn không có cờ nào và dữ liệu thật không đổi',
  (select count(*) from public.level_progress where user_id = :'S1' and auto_completed) = 0
  and exists (select 1 from public.level_progress where user_id = :'S1' and level_id = 1 and completed and stars = '{"de":3,"tb":2,"kho":1}'));
select t.check('sau', 'học sinh vẫn ghi/sửa tiến độ thật bình thường (không có cột cờ): upsert hàng của mình',
  t.exec_as(:'S1', $q$
    insert into public.level_progress (user_id, level_id, played, completed, stars, best_score) values ('00000000-0000-0000-0000-0000000000a1', 3, true, false, '{"game":1}', 120)
      on conflict (user_id, level_id) do update set played = excluded.played, stars = excluded.stars, best_score = excluded.best_score;
    update public.level_progress set stars = '{"game":2}', best_score = 150 where user_id = '00000000-0000-0000-0000-0000000000a1' and level_id = 3; $q$) = 'ok');
select t.check('sau', 'học sinh gửi auto_completed = false (cờ tắt) thì không bị chặn (không đổi cờ)',
  t.exec_as(:'S1', $q$ update public.level_progress set auto_completed = false, best_score = 155 where user_id = '00000000-0000-0000-0000-0000000000a1' and level_id = 3 $q$) = 'ok');

-- ===== học sinh không sửa quyền của mình để vượt kiểm tra =====
do $$ declare r text; begin
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-0000000000a1' $q$);
  perform t.check('sau', 'học sinh đổi role của mình thành teacher bị từ chối (protect_profile)', r like 'ERR:%Không được đổi vai trò%', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1' $q$);
  perform t.check('sau', 'học sinh đổi role thành admin cũng bị từ chối', r like 'ERR:%Không được đổi vai trò%', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-0000000000a2' $q$);
  perform t.check('sau', 'học sinh không sửa được hồ sơ người khác (RLS: không có hàng nào bị đổi)', (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a2') = 'student', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ insert into public.profiles (id, display_name, role) values (gen_random_uuid(), 'gia', 'teacher') $q$);
  perform t.check('sau', 'học sinh không tự thêm hồ sơ giáo viên (không có chính sách INSERT)', r like 'ERR:%', r);
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true) $q$);
end $$;
select t.check('sau', 'vai trò của học sinh 1 vẫn là student và my_role() trả student',
  (select role from public.profiles where id = :'S1') = 'student');
do $$ declare r text; begin
  r := t.exec_as('00000000-0000-0000-0000-0000000000a1', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000a1', 10, true) $q$);
  perform t.check('sau', 'sau khi thử nâng quyền, học sinh vẫn không đặt được cờ', r like 'ERR:P0001:%', r);
end $$;

-- ===== quyền xem/sửa tiến độ người khác vẫn theo RLS =====
select t.check('sau', 'học sinh 2 KHÔNG đọc được level_progress của học sinh 1', t.count_as(:'S2', $q$ select * from public.level_progress where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) = 0);
select t.check('sau', 'học sinh 2 không sửa được hàng của học sinh 1 (0 hàng bị đổi)', (
  select t.exec_as(:'S2', $q$ update public.level_progress set best_score = 999999 where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) = 'ok'
  and (select max(best_score) from public.level_progress where user_id = :'S1') < 999999));
select t.check('sau', 'học sinh 2 không INSERT hàng mang user_id của học sinh 1 (RLS)', t.exec_as(:'S2', $q$ insert into public.level_progress (user_id, level_id) values ('00000000-0000-0000-0000-0000000000a1', 11) $q$) like 'ERR:%');
select t.check('sau', 'học sinh 2 không đặt cờ cho học sinh 1', t.exec_as(:'S2', $q$ update public.level_progress set auto_completed = true where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) in ('ok') and not exists (select 1 from public.level_progress where user_id = :'S1' and auto_completed));
select t.check('sau', 'giáo viên 1 (lớp có học sinh 1) ĐỌC được tiến độ học sinh 1', t.count_as(:'T1', $q$ select * from public.level_progress where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) >= 3);
select t.check('sau', 'giáo viên 2 (không dạy học sinh 1) KHÔNG đọc được tiến độ học sinh 1', t.count_as(:'T2', $q$ select * from public.level_progress where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) = 0);
select t.check('sau', 'giáo viên không sửa tiến độ/cờ của học sinh (không có chính sách UPDATE cho giáo viên): 0 hàng đổi', (
  select t.exec_as(:'T1', $q$ update public.level_progress set auto_completed = true, best_score = 1 where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) = 'ok'
  and not exists (select 1 from public.level_progress where user_id = :'S1' and (auto_completed or best_score = 1))));
select t.check('sau', 'giáo viên không INSERT hàng cho học sinh (RLS)', t.exec_as(:'T1', $q$ insert into public.level_progress (user_id, level_id, auto_completed) values ('00000000-0000-0000-0000-0000000000a1', 8, true) $q$) like 'ERR:%');
select t.check('sau', 'đọc game_state vẫn theo RLS: học sinh 2 không thấy của học sinh 1, giáo viên 1 thấy', t.count_as(:'S2', $q$ select * from public.game_state where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) = 0 and t.count_as(:'T1', $q$ select * from public.game_state where user_id = '00000000-0000-0000-0000-0000000000a1' $q$) = 1);

-- ===== class_progress =====
do $$ declare cid1 uuid; join1 text; begin
  select id, join_code into cid1, join1 from public.classes where teacher_id = '00000000-0000-0000-0000-0000000000b1';
  -- giáo viên 2 và admin vào lớp 1 như THÀNH VIÊN (để có người có cờ trong lớp); join_class cho mọi người đã đăng nhập
  perform t.check('sau', 'giáo viên 2 vào lớp 1 làm thành viên (join_class)', t.exec_as('00000000-0000-0000-0000-0000000000b2', format('select public.join_class(%L)', join1)) = 'ok');
  perform t.check('sau', 'class_progress(lớp 1) do giáo viên 1 gọi: có cột auto_completed, đủ hàng học sinh 1 và giáo viên 2',
    t.count_as('00000000-0000-0000-0000-0000000000b1', format('select * from public.class_progress(%L)', cid1)) >= 4
    and exists (select 1 from information_schema.routines r where r.routine_name = 'class_progress')
    and (select cardinality(proargnames) from pg_proc where proname = 'class_progress' and pronamespace = 'public'::regnamespace) = 11);
  perform t.check('sau', 'class_progress: học sinh KHÔNG gọi được (rỗng)', t.count_as('00000000-0000-0000-0000-0000000000a1', format('select * from public.class_progress(%L)', cid1)) = 0);
  perform t.check('sau', 'class_progress: giáo viên 2 (không phải chủ lớp 1) nhận rỗng dù là thành viên', t.count_as('00000000-0000-0000-0000-0000000000b2', format('select * from public.class_progress(%L)', cid1)) = 0);
  perform t.check('sau', 'class_progress: admin xem được', t.count_as('00000000-0000-0000-0000-0000000000c1', format('select * from public.class_progress(%L)', cid1)) >= 4);
end $$;

-- xuất class_progress của lớp 1 (như giáo viên 1 gọi) ra JSON để kiểm trang giáo viên và CSV bằng mã thật (teacher/dbRows.test.ts)
do $$ declare cid1 uuid; j json; begin
  select id into cid1 from public.classes where teacher_id = '00000000-0000-0000-0000-0000000000b1';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  select coalesce(json_agg(r), '[]'::json) into j from public.class_progress(cid1) r;
  reset role;
  create table if not exists t.export (k text primary key, v json);
  delete from t.export;
  insert into t.export values ('class_progress', j);
end $$;
select t.check('sau', 'class_progress xuất ra: giáo viên 2 có cờ ở màn 5 (auto_completed true), học sinh 1 không có cờ nào',
  exists (select 1 from t.export e, json_array_elements(e.v) r where e.k = 'class_progress' and (r->>'student_id') = :'T2' and (r->>'level_id') = '5' and (r->>'auto_completed')::boolean)
  and not exists (select 1 from t.export e, json_array_elements(e.v) r where e.k = 'class_progress' and (r->>'student_id') = :'S1' and (r->>'auto_completed')::boolean));
\copy (select v from t.export where k = 'class_progress') to '/tmp/p3b_class_progress.json'

-- ===== chạy lại migration 0003 lần nữa phải êm (idempotent): kiểm riêng ở runner =====
select t.check('sau', 'trigger protect_auto_completed tồn tại một lần', (select count(*) from pg_trigger where tgname = 'trg_protect_auto_completed' and not tgisinternal) = 1);
